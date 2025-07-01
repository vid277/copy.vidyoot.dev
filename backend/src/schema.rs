// @generated automatically by Diesel CLI.

diesel::table! {
    note_versions (id) {
        id -> Int4,
        note_id -> Int4,
        version -> Int4,
        content -> Text,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    notes (id) {
        id -> Int4,
        short_url -> Text,
        content -> Text,
        created_at -> Timestamptz,
        expires_at -> Nullable<Timestamptz>,
        parent_id -> Nullable<Int4>,
    }
}

diesel::joinable!(note_versions -> notes (note_id));

diesel::allow_tables_to_appear_in_same_query!(
    note_versions,
    notes,
);
