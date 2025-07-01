use actix_cors::Cors;
use actix_web::{App, HttpResponse, HttpServer, middleware::Logger, web};
use backend::models::{NewNote, Note};
use chrono::{Duration, Utc};
use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::result::Error as DieselError;
use dotenvy::dotenv;
use env_logger::Env;
use serde::Deserialize;
use std::env;

type DbPool = Pool<ConnectionManager<PgConnection>>;

pub fn get_connection_pool() -> DbPool {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let manager = ConnectionManager::<PgConnection>::new(database_url);

    let pool = Pool::builder()
        .test_on_check_out(true)
        .build(manager)
        .expect("Could not build connection pool.");

    pool
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = get_connection_pool();

    let delete_pool = pool.clone();

    tokio::spawn(async move {
        use backend::schema::notes::dsl::*;
        loop {
            let mut conn = match delete_pool.get() {
                Ok(c) => c,
                Err(e) => {
                    log::error!("Delete: failed to get DB connection: {}", e);
                    tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                    continue;
                }
            };
            let now = chrono::Utc::now();
            match diesel::delete(notes.filter(expires_at.is_not_null().and(expires_at.lt(now))))
                .execute(&mut conn)
            {
                Ok(count) if count > 0 => log::info!("Delete: deleted {} expired notes", count),
                Ok(_) => {}
                Err(e) => {
                    log::error!("Delete: failed to delete expired notes: {}", e);
                }
            }
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
        }
    });

    env_logger::init_from_env(Env::new().default_filter_or("info"));

    println!("Starting server on port 0.0.0.0:8080");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:5173")
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE"])
            .allowed_headers(vec!["content-type"])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::default())
            .app_data(web::Data::new(pool.clone()))
            .service(
                web::scope("/api")
                    .route("/", web::get().to(index))
                    .route("/create", web::post().to(create_note))
                    .route("/check/{short_url}", web::get().to(check_url_availability))
                    .route("/{short_url}", web::get().to(get_note))
                    .route("/{short_url}", web::put().to(update_note))
                    .route("/versions/{short_url}", web::get().to(get_versions))
                    .route("/threads/{parent_id}", web::get().to(get_threads)),
            )
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}

async fn index(pool: web::Data<DbPool>) -> HttpResponse {
    use backend::schema::notes::dsl::*;
    let mut connection = match pool.get() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Failed to get database connection: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database connection error"
            }));
        }
    };

    let result = notes
        .limit(10)
        .select(Note::as_select())
        .load::<Note>(&mut connection)
        .map_err(|e| {
            log::error!("Failed to get notes: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get notes"
            }))
        });

    match result {
        Ok(notes_list) => HttpResponse::Ok().json(notes_list),
        Err(response) => response,
    }
}

#[derive(Deserialize)]
pub struct RequestCreateNote {
    pub short_url: String,
    pub content: String,
    pub expires_at: Option<String>,
    pub parent_id: Option<i32>,
}

async fn get_note(pool: web::Data<DbPool>, short_url_path: web::Path<String>) -> HttpResponse {
    use backend::schema::notes::dsl::*;

    let mut connection = match pool.get() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Failed to get database connection: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database connection error"
            }));
        }
    };

    match notes
        .filter(short_url.eq(short_url_path.into_inner()))
        .select(Note::as_select())
        .first(&mut connection)
    {
        Ok(note) => HttpResponse::Ok().json(note),
        Err(DieselError::NotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Note not found"
        })),
        Err(e) => {
            log::error!("Failed to get note: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get note"
            }))
        }
    }
}

async fn create_note(
    pool: web::Data<DbPool>,
    request: web::Json<RequestCreateNote>,
) -> HttpResponse {
    use backend::schema::notes::dsl::*;
    let mut connection = pool.get().unwrap();

    let existing_note = notes
        .filter(short_url.eq(&request.short_url))
        .select(Note::as_select())
        .first(&mut connection);

    if existing_note.is_ok() {
        return HttpResponse::Conflict().json(serde_json::json!({
            "error": "URL already taken"
        }));
    }

    let one_hour_ago = Utc::now() - Duration::hours(1);
    if let Err(e) =
        diesel::delete(notes.filter(created_at.lt(one_hour_ago))).execute(&mut connection)
    {
        log::error!("Failed to clean up old notes: {}", e);
    }

    let expires_at_time = match &request.expires_at {
        Some(s) => chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|dt| dt.with_timezone(&Utc)),
        None => None,
    };

    let new_note = NewNote {
        short_url: request.short_url.clone(),
        content: request.content.clone(),
        expires_at: expires_at_time,
        parent_id: request.parent_id,
    };

    match diesel::insert_into(notes)
        .values(&new_note)
        .returning(Note::as_returning())
        .execute(&mut connection)
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Note created successfully"
        })),
        Err(DieselError::DatabaseError(diesel::result::DatabaseErrorKind::UniqueViolation, _)) => {
            HttpResponse::Conflict().json(serde_json::json!({
                "error": "URL already taken"
            }))
        }
        Err(e) => {
            log::error!("Failed to create note: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create note"
            }))
        }
    }
}

#[derive(Deserialize)]
pub struct RequestUpdateNote {
    pub short_url: String,
    pub content: String,
}

async fn update_note(
    pool: web::Data<DbPool>,
    request: web::Json<RequestUpdateNote>,
) -> HttpResponse {
    use backend::schema::notes::dsl::*;
    let mut connection = pool.get().unwrap();

    let existing_note = match notes
        .filter(short_url.eq(&request.short_url))
        .select(Note::as_select())
        .first::<Note>(&mut connection)
    {
        Ok(n) => n,
        Err(DieselError::NotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Note not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to fetch note: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch note"
            }));
        }
    };

    // ---------- versioning ----------
    use backend::models::NewNoteVersion;
    use backend::schema::note_versions::dsl as nv;

    // Determine next version number
    let last_version: i32 = nv::note_versions
        .filter(nv::note_id.eq(existing_note.id))
        .select(diesel::dsl::max(nv::version))
        .first::<Option<i32>>(&mut connection)
        .unwrap_or(Some(0))
        .unwrap_or(0);

    let new_version = NewNoteVersion {
        note_id: existing_note.id,
        version: last_version + 1,
        content: existing_note.content.clone(), // store previous content
    };

    if let Err(e) = diesel::insert_into(nv::note_versions)
        .values(&new_version)
        .execute(&mut connection)
    {
        log::error!("Failed to insert note version: {}", e);
    }

    match diesel::update(notes)
        .set(content.eq(&request.content))
        .filter(short_url.eq(&request.short_url))
        .execute(&mut connection)
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Note updated successfully"
        })),
        Err(e) => {
            log::error!("Failed to update note: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update note"
            }))
        }
    }
}

async fn check_url_availability(
    pool: web::Data<DbPool>,
    short_url_path: web::Path<String>,
) -> HttpResponse {
    use backend::schema::notes::dsl::*;

    let mut connection = match pool.get() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Failed to get database connection: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database connection error"
            }));
        }
    };

    let existing_note = notes
        .filter(short_url.eq(short_url_path.into_inner()))
        .select(Note::as_select())
        .first(&mut connection);

    match existing_note {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "available": false
        })),
        Err(DieselError::NotFound) => HttpResponse::Ok().json(serde_json::json!({
            "available": true
        })),
        Err(e) => {
            log::error!("Failed to check URL availability: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to check URL availability"
            }))
        }
    }
}

async fn get_threads(pool: web::Data<DbPool>, parent_id_path: web::Path<i32>) -> HttpResponse {
    use backend::schema::notes::dsl::*;
    let mut connection = match pool.get() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Failed to get database connection: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database connection error"
            }));
        }
    };

    match notes
        .filter(parent_id.eq(Some(parent_id_path.into_inner())))
        .order(created_at.asc())
        .select(Note::as_select())
        .load::<Note>(&mut connection)
    {
        Ok(thread_notes) => HttpResponse::Ok().json(thread_notes),
        Err(e) => {
            log::error!("Failed to get threads: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get threads"
            }))
        }
    }
}

async fn get_versions(pool: web::Data<DbPool>, short_url_path: web::Path<String>) -> HttpResponse {
    use backend::schema::note_versions::dsl as nv;
    use backend::schema::notes::dsl as n;
    let mut connection = match pool.get() {
        Ok(conn) => conn,
        Err(e) => {
            log::error!("Failed to get database connection: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Database connection error"
            }));
        }
    };

    // Find the note id
    let note = match n::notes
        .filter(n::short_url.eq(short_url_path.into_inner()))
        .select(n::id)
        .first::<i32>(&mut connection)
    {
        Ok(id) => id,
        Err(DieselError::NotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Note not found"
            }));
        }
        Err(e) => {
            log::error!("Failed to fetch note id: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch note id"
            }));
        }
    };

    // Fetch versions ordered asc
    match nv::note_versions
        .filter(nv::note_id.eq(note))
        .order(nv::version.asc())
        .select((nv::version, nv::content, nv::created_at))
        .load::<(i32, String, chrono::DateTime<Utc>)>(&mut connection)
    {
        Ok(list) => HttpResponse::Ok().json(list),
        Err(e) => {
            log::error!("Failed to fetch versions: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch versions"
            }))
        }
    }
}
