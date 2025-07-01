ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_parent_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES notes(id); 