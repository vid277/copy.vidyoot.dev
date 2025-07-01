use chrono::{DateTime, Utc};
use diesel::prelude::*;
use serde::Serialize;

#[derive(Queryable, Selectable, Debug, Serialize)]
#[diesel(table_name = crate::schema::notes)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Note {
    pub id: i32,
    pub short_url: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub parent_id: Option<i32>,
}

#[derive(Insertable, AsChangeset)]
#[diesel(table_name = crate::schema::notes)]
pub struct NewNote {
    pub short_url: String,
    pub content: String,
    pub expires_at: Option<DateTime<Utc>>,
    pub parent_id: Option<i32>,
}

#[derive(Queryable, Selectable, Debug, Serialize)]
#[diesel(table_name = crate::schema::note_versions)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct NoteVersion {
    pub id: i32,
    pub note_id: i32,
    pub version: i32,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::note_versions)]
pub struct NewNoteVersion {
    pub note_id: i32,
    pub version: i32,
    pub content: String,
}
