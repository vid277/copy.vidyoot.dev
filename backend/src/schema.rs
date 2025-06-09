// @generated automatically by Diesel CLI.

diesel::table! {
    notes (id) {
        id -> Int4,
        short_url -> Text,
        content -> Text,
        created_at -> Timestamptz,
    }
}
