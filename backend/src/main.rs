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
                    .route("/{short_url}", web::put().to(update_note)),
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

    let new_note = NewNote {
        short_url: request.short_url.clone(),
        content: request.content.clone(),
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

    let existing_note = notes
        .filter(short_url.eq(&request.short_url))
        .select(Note::as_select())
        .first(&mut connection);

    if existing_note.is_err() {
        return HttpResponse::NotFound().json(serde_json::json!({
            "error": "Note not found"
        }));
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
