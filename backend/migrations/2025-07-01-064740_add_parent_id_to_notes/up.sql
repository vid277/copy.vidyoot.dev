-- Your SQL goes here

ALTER TABLE notes ADD COLUMN parent_id INTEGER REFERENCES notes(id);
