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
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::notes)]
pub struct NewNote {
    pub short_url: String,
    pub content: String,
}
