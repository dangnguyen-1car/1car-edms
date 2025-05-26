-- =================================================================
-- EDMS 1CAR - Sample Users Data
-- 40 users distributed across 14 departments based on 1CAR structure
-- Based on C-FM-MG-004 role matrix and C-PL-MG-005 permission policy
-- =================================================================

-- Clear existing data
DELETE FROM users;

-- Reset auto increment
DELETE FROM sqlite_sequence WHERE name='users';

-- =================================================================
-- ADMIN USERS (5 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('giamdoc@1car.vn', 'Nguyễn Văn An', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-30 days')),
('phogiamdoc@1car.vn', 'Trần Thị Bình', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-25 days')),
('it.admin@1car.vn', 'Lê Văn Cường', 'Phòng Công nghệ Hệ thống', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-20 days')),
('hr.admin@1car.vn', 'Phạm Thị Dung', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-15 days')),
('legal.admin@1car.vn', 'Hoàng Văn Em', 'Phòng Pháp lý', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-10 days'));

-- =================================================================
-- PHÒNG PHÁT TRIỂN NHƯỢNG QUYỀN (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('franchise.manager@1car.vn', 'Nguyễn Thị Giang', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-8 days')),
('franchise.dev1@1car.vn', 'Trần Văn Hải', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-7 days')),
('franchise.dev2@1car.vn', 'Lê Thị Lan', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-6 days'));

-- =================================================================
-- PHÒNG ĐÀO TẠO TIÊU CHUẨN (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('training.manager@1car.vn', 'Phạm Văn Minh', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-5 days')),
('training.spec1@1car.vn', 'Hoàng Thị Nga', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-4 days')),
('training.spec2@1car.vn', 'Nguyễn Văn Phong', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-3 days'));

-- =================================================================
-- PHÒNG MARKETING (2 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('marketing.manager@1car.vn', 'Trần Thị Quỳnh', 'Phòng Marketing', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-2 days')),
('marketing.spec@1car.vn', 'Lê Văn Rồng', 'Phòng Marketing', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now', '-1 days'));

-- =================================================================
-- PHÒNG KỸ THUẬT QC (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('qc.manager@1car.vn', 'Phạm Văn Sơn', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('qc.tech1@1car.vn', 'Hoàng Thị Tâm', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('qc.tech2@1car.vn', 'Nguyễn Văn Uy', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- PHÒNG TÀI CHÍNH (2 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('finance.manager@1car.vn', 'Trần Văn Việt', 'Phòng Tài chính', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('finance.acc@1car.vn', 'Lê Thị Xuân', 'Phòng Tài chính', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- PHÒNG CÔNG NGHỆ HỆ THỐNG (2 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('it.manager@1car.vn', 'Phạm Thị Yến', 'Phòng Công nghệ Hệ thống', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('it.dev@1car.vn', 'Hoàng Văn Zung', 'Phòng Công nghệ Hệ thống', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- PHÒNG PHÁP LÝ (2 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('legal.manager@1car.vn', 'Nguyễn Thị Ánh', 'Phòng Pháp lý', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('legal.spec@1car.vn', 'Trần Văn Bảo', 'Phòng Pháp lý', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- BỘ PHẬN TIẾP NHẬN CSKH (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('cskh.manager@1car.vn', 'Lê Văn Cảnh', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('cskh.staff1@1car.vn', 'Phạm Thị Diệu', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('cskh.staff2@1car.vn', 'Hoàng Văn Ế', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- BỘ PHẬN KỸ THUẬT GARAGE (4 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('garage.tech.manager@1car.vn', 'Nguyễn Văn Phúc', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.tech1@1car.vn', 'Trần Thị Giang', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.tech2@1car.vn', 'Lê Văn Hùng', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.tech3@1car.vn', 'Phạm Thị Lan', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- BỘ PHẬN QC GARAGE (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('garage.qc.manager@1car.vn', 'Hoàng Văn Minh', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.qc1@1car.vn', 'Nguyễn Thị Nga', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.qc2@1car.vn', 'Trần Văn Ông', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- BỘ PHẬN KHO/KẾ TOÁN GARAGE (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('garage.acc.manager@1car.vn', 'Lê Thị Phương', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.acc1@1car.vn', 'Phạm Văn Quang', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.warehouse@1car.vn', 'Hoàng Thị Rùa', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- BỘ PHẬN MARKETING GARAGE (2 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('garage.marketing.manager@1car.vn', 'Nguyễn Văn Sáng', 'Bộ phận Marketing Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.marketing@1car.vn', 'Trần Thị Tuyết', 'Bộ phận Marketing Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- QUẢN LÝ GARAGE (3 users)
-- =================================================================

INSERT INTO users (email, name, department, role, password_hash, is_active, created_at) VALUES
('garage.manager1@1car.vn', 'Lê Văn Uyên', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.manager2@1car.vn', 'Phạm Thị Vân', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now')),
('garage.manager3@1car.vn', 'Hoàng Văn Xuân', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 1, datetime('now'));

-- =================================================================
-- UPDATE CREATED_BY REFERENCES
-- =================================================================

-- Set created_by for all users (created by first admin)
UPDATE users SET created_by = 1 WHERE id > 1;

-- =================================================================
-- VERIFY DATA
-- =================================================================

-- Check total users count (should be 40)
-- SELECT COUNT(*) as total_users FROM users;

-- Check users by department
-- SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY department;

-- Check admin vs user roles
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- =================================================================
-- SAMPLE LOGIN CREDENTIALS FOR TESTING
-- All passwords are hashed version of: "1car2025"
-- Use these for testing:
-- Admin: giamdoc@1car.vn / 1car2025
-- User: cskh.staff1@1car.vn / 1car2025
-- =================================================================
