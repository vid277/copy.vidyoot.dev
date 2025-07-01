-- This file should undo anything in `up.sql`

ALTER TABLE notes DROP COLUMN IF EXISTS parent_id;
