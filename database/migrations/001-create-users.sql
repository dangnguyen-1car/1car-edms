-- database/migrations/001-create-users.sql
-- Users table based on C-FM-MG-004 role matrix
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id)
  -- CHECK constraints cho role và department sẽ được định nghĩa trong schema.sql hoàn chỉnh
  -- hoặc trong các migration sau để đảm bảo tính toàn vẹn.
);

-- Ghi nhận migration này đã được thực thi
INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES ('001', 'Initial schema creation with users table. Default admin user (admin@1car.vn) will be created by application logic in database.js.');