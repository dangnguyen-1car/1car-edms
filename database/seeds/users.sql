-- =================================================================
-- EDMS 1CAR - Sample Users Data (REVISED AND ALIGNED)
-- 40 users distributed across 14 departments based on 1CAR structure
-- Aligned with 003-align-schema-definition.sql (SQL_vD) and database.js (DB_JS_vD)
-- Based on C-FM-MG-004 role matrix and C-PL-MG-005 permission policy
-- =================================================================

-- Clear existing data (Nếu bạn muốn bắt đầu sạch mỗi khi chạy seed)
-- Nếu bạn muốn GIỮ LẠI user admin@1car.vn / admin123 được tạo bởi database.js
-- thì hãy COMMENT OUT hoặc XÓA dòng DELETE FROM users; này.
-- Tuy nhiên, nếu để lại, bạn sẽ có 2 user 'Ban Giám đốc' với role 'admin'.
-- Để đơn giản cho việc seed, tạm thời vẫn xóa.
DELETE FROM users;

-- Reset auto increment
DELETE FROM sqlite_sequence WHERE name='users';

-- =================================================================
-- ADMIN USERS (5 users)
-- Password for all users in this seed file is '1car2025'
-- Hash: $2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP. (bcrypt, 12 rounds)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, last_login, password_changed_at, failed_login_attempts, locked_until, created_at, updated_at
) VALUES
('giamdoc@1car.vn', 'Nguyễn Văn An', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Tổng Giám đốc', '0901234567', 1, datetime('now', '-1 days'), datetime('now', '-30 days'), 0, NULL, datetime('now', '-30 days'), datetime('now', '-1 days')),
('phogiamdoc@1car.vn', 'Trần Thị Bình', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Phó Tổng Giám đốc', '0901234568', 1, datetime('now', '-2 days'), datetime('now', '-25 days'), 0, NULL, datetime('now', '-25 days'), datetime('now', '-2 days')),
('it.admin@1car.vn', 'Lê Văn Cường', 'Phòng Công nghệ Hệ thống', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng IT', '0901234569', 1, datetime('now', '-3 days'), datetime('now', '-20 days'), 0, NULL, datetime('now', '-20 days'), datetime('now', '-3 days')),
('hr.admin@1car.vn', 'Phạm Thị Dung', 'Ban Giám đốc', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng Nhân sự', '0901234570', 1, datetime('now', '-4 days'), datetime('now', '-15 days'), 0, NULL, datetime('now', '-15 days'), datetime('now', '-4 days')),
('legal.admin@1car.vn', 'Hoàng Văn Em', 'Phòng Pháp lý', 'admin', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng Pháp lý', '0901234571', 1, datetime('now', '-5 days'), datetime('now', '-10 days'), 0, NULL, datetime('now', '-10 days'), datetime('now', '-5 days'));

-- =================================================================
-- PHÒNG PHÁT TRIỂN NHƯỢNG QUYỀN (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('franchise.manager@1car.vn', 'Nguyễn Thị Giang', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng', '0912345601', 1, datetime('now', '-8 days'), datetime('now', '-1 days')),
('franchise.dev1@1car.vn', 'Trần Văn Hải', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên', '0912345602', 1, datetime('now', '-7 days'), datetime('now', '-1 days')),
('franchise.dev2@1car.vn', 'Lê Thị Lan', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên', '0912345603', 1, datetime('now', '-6 days'), datetime('now', '-1 days'));

-- =================================================================
-- PHÒNG ĐÀO TẠO TIÊU CHUẨN (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('training.manager@1car.vn', 'Phạm Văn Minh', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng', '0912345604', 1, datetime('now', '-5 days'), datetime('now', '-1 days')),
('training.spec1@1car.vn', 'Hoàng Thị Nga', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên', '0912345605', 1, datetime('now', '-4 days'), datetime('now', '-1 days')),
('training.spec2@1car.vn', 'Nguyễn Văn Phong', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên', '0912345606', 1, datetime('now', '-3 days'), datetime('now', '-1 days'));

-- =================================================================
-- PHÒNG MARKETING (2 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('marketing.manager@1car.vn', 'Trần Thị Quỳnh', 'Phòng Marketing', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng', '0912345607', 1, datetime('now', '-2 days'), datetime('now', '-1 days')),
('marketing.spec@1car.vn', 'Lê Văn Rồng', 'Phòng Marketing', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên', '0912345608', 1, datetime('now', '-1 days'), datetime('now', '-1 days'));

-- =================================================================
-- PHÒNG KỸ THUẬT QC (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('qc.manager@1car.vn', 'Phạm Văn Sơn', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng', '0912345609', 1, datetime('now'), datetime('now')),
('qc.tech1@1car.vn', 'Hoàng Thị Tâm', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kỹ thuật viên', '0912345610', 1, datetime('now'), datetime('now')),
('qc.tech2@1car.vn', 'Nguyễn Văn Uy', 'Phòng Kỹ thuật QC', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kỹ thuật viên', '0912345611', 1, datetime('now'), datetime('now'));

-- =================================================================
-- PHÒNG TÀI CHÍNH (2 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('finance.manager@1car.vn', 'Trần Văn Việt', 'Phòng Tài chính', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng phòng', '0912345612', 1, datetime('now'), datetime('now')),
('finance.acc@1car.vn', 'Lê Thị Xuân', 'Phòng Tài chính', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kế toán viên', '0912345613', 1, datetime('now'), datetime('now'));

-- =================================================================
-- PHÒNG CÔNG NGHỆ HỆ THỐNG (2 users - ngoài admin)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('it.manager@1car.vn', 'Phạm Thị Yến', 'Phòng Công nghệ Hệ thống', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Phó phòng IT', '0912345614', 1, datetime('now'), datetime('now')),
('it.dev@1car.vn', 'Hoàng Văn Zung', 'Phòng Công nghệ Hệ thống', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Developer', '0912345615', 1, datetime('now'), datetime('now'));

-- =================================================================
-- PHÒNG PHÁP LÝ (1 user - ngoài admin)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('legal.spec@1car.vn', 'Trần Văn Bảo', 'Phòng Pháp lý', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên Pháp lý', '0912345616', 1, datetime('now'), datetime('now'));

-- =================================================================
-- BỘ PHẬN TIẾP NHẬN CSKH (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('cskh.manager@1car.vn', 'Lê Văn Cảnh', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Trưởng bộ phận', '0912345617', 1, datetime('now'), datetime('now')),
('cskh.staff1@1car.vn', 'Phạm Thị Diệu', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Nhân viên CSKH', '0912345618', 1, datetime('now'), datetime('now')),
('cskh.staff2@1car.vn', 'Hoàng Văn Ếch', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Nhân viên CSKH', '0912345619', 1, datetime('now'), datetime('now')); -- Sửa tên "Ế" thành "Ếch"

-- =================================================================
-- BỘ PHẬN KỸ THUẬT GARAGE (4 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('garage.tech.manager@1car.vn', 'Nguyễn Văn Phúc', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Tổ trưởng Kỹ thuật', '0912345620', 1, datetime('now'), datetime('now')),
('garage.tech1@1car.vn', 'Trần Thị Giang', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kỹ thuật viên', '0912345621', 1, datetime('now'), datetime('now')),
('garage.tech2@1car.vn', 'Lê Văn Hùng', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kỹ thuật viên', '0912345622', 1, datetime('now'), datetime('now')),
('garage.tech3@1car.vn', 'Phạm Thị Lan Anh', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kỹ thuật viên', '0912345623', 1, datetime('now'), datetime('now')); -- Sửa tên "Lan" thành "Lan Anh"

-- =================================================================
-- BỘ PHẬN QC GARAGE (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('garage.qc.manager@1car.vn', 'Hoàng Văn Minh', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Tổ trưởng QC', '0912345624', 1, datetime('now'), datetime('now')),
('garage.qc1@1car.vn', 'Nguyễn Thị Nga', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Nhân viên QC', '0912345625', 1, datetime('now'), datetime('now')),
('garage.qc2@1car.vn', 'Trần Văn Ông', 'Bộ phận QC Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Nhân viên QC', '0912345626', 1, datetime('now'), datetime('now'));

-- =================================================================
-- BỘ PHẬN KHO/KẾ TOÁN GARAGE (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('garage.acc.manager@1car.vn', 'Lê Thị Phương', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kế toán trưởng', '0912345627', 1, datetime('now'), datetime('now')),
('garage.acc1@1car.vn', 'Phạm Văn Quang', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Kế toán viên', '0912345628', 1, datetime('now'), datetime('now')),
('garage.warehouse@1car.vn', 'Hoàng Thị Rùa', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Thủ kho', '0912345629', 1, datetime('now'), datetime('now'));

-- =================================================================
-- BỘ PHẬN MARKETING GARAGE (2 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('garage.marketing.manager@1car.vn', 'Nguyễn Văn Sáng', 'Bộ phận Marketing Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên Marketing', '0912345630', 1, datetime('now'), datetime('now')),
('garage.marketing@1car.vn', 'Trần Thị Tuyết', 'Bộ phận Marketing Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Chuyên viên Marketing', '0912345631', 1, datetime('now'), datetime('now'));

-- =================================================================
-- QUẢN LÝ GARAGE (3 users)
-- =================================================================

INSERT INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, created_at, updated_at
) VALUES
('garage.manager1@1car.vn', 'Lê Văn Uyên', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Quản lý Garage A', '0912345632', 1, datetime('now'), datetime('now')),
('garage.manager2@1car.vn', 'Phạm Thị Vân', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Quản lý Garage B', '0912345633', 1, datetime('now'), datetime('now')),
('garage.manager3@1car.vn', 'Hoàng Văn Xuân', 'Quản lý Garage', 'user', '$2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.', 'Quản lý Garage C', '0912345634', 1, datetime('now'), datetime('now'));

-- =================================================================
-- UPDATE CREATED_BY REFERENCES
-- Giả định user có ID = 1 (giamdoc@1car.vn) là người tạo các user khác.
-- Nếu user admin@1car.vn (từ database.js) là người tạo, ID có thể khác.
-- Để an toàn, lấy ID của một admin hiện có.
-- =================================================================

-- Set created_by for all users (created by first admin 'giamdoc@1car.vn' which should have ID=1 after this script runs due to DELETE FROM users)
UPDATE users SET created_by = (SELECT id FROM users WHERE email = 'giamdoc@1car.vn') WHERE id > (SELECT id FROM users WHERE email = 'giamdoc@1car.vn');

-- =================================================================
-- VERIFY DATA
-- =================================================================

-- SELECT COUNT(*) as total_users FROM users;
-- SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY department;
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- =================================================================
-- SAMPLE LOGIN CREDENTIALS FOR TESTING
-- All passwords are hashed version of: "1car2025"
-- Hash: $2b$12$LQv3c1yqBwmnSJqD6tnub.VBkxPQxqcq6VQFz/aNQ6/L/GDGzluP.
-- Use these for testing:
-- Admin: giamdoc@1car.vn / 1car2025
-- User: cskh.staff1@1car.vn / 1car2025
-- =================================================================