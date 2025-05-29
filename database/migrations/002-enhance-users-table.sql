-- database/migrations/002-enhance-users-table.sql
-- Migration script to enhance users table for EDMS 1CAR System

-- Add missing columns for enhanced user management
ALTER TABLE users ADD COLUMN position TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Update existing records to set default values
UPDATE users SET 
    failed_login_attempts = 0 
WHERE failed_login_attempts IS NULL;

-- Create indexes for performance optimization
CREATE INDEX idx_users_position ON users(position);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_failed_attempts ON users(failed_login_attempts);
CREATE INDEX idx_users_locked_until ON users(locked_until);
CREATE INDEX idx_users_department_role ON users(department, role);
CREATE INDEX idx_users_active_status ON users(is_active);

-- Add check constraints for data integrity
ALTER TABLE users ADD CONSTRAINT chk_users_role 
CHECK (role IN ('admin', 'user'));

ALTER TABLE users ADD CONSTRAINT chk_users_department 
CHECK (department IN (
    'Ban Giám đốc',
    'Phòng Phát triển Nhượng quyền',
    'Phòng Đào tạo Tiêu chuẩn',
    'Phòng Marketing',
    'Phòng Kỹ thuật QC',
    'Phòng Tài chính',
    'Phòng Công nghệ Hệ thống',
    'Phòng Pháp lý',
    'Bộ phận Tiếp nhận CSKH',
    'Bộ phận Kỹ thuật Garage',
    'Bộ phận QC Garage',
    'Bộ phận Kho/Kế toán Garage',
    'Bộ phận Marketing Garage',
    'Quản lý Garage'
));

-- Add constraint for failed login attempts
ALTER TABLE users ADD CONSTRAINT chk_users_failed_attempts 
CHECK (failed_login_attempts >= 0 AND failed_login_attempts <= 10);

-- Create view for active users statistics
CREATE VIEW v_active_users_stats AS
SELECT 
    department,
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
    COUNT(CASE WHEN last_login >= date('now', '-30 days') THEN 1 END) as recent_active_users,
    COUNT(CASE WHEN failed_login_attempts >= 3 THEN 1 END) as locked_users
FROM users
GROUP BY department, role;

-- Insert migration record
INSERT INTO schema_migrations (version, description, executed_at) 
VALUES ('002', 'Enhance users table with security and profile fields', CURRENT_TIMESTAMP);
