// @generated automatically by Diesel CLI.

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
