ALTER TABLE opinions ADD COLUMN password_hash TEXT;
ALTER TABLE opinions ADD COLUMN password_salt TEXT;
ALTER TABLE opinions ADD COLUMN password_iterations INTEGER;
ALTER TABLE opinions ADD COLUMN updated_at TEXT;
