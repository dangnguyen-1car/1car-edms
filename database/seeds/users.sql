-- database/seeds/users.sql
-- =================================================================
-- EDMS 1CAR - Sample Users Data (FIXED PASSWORD HASH)
-- Mật khẩu cho TẤT CẢ người dùng trong file seed này là: '1car2025'
-- Hash MỚI và ĐÚNG: $2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W
-- =================================================================

-- KHÔNG XÓA USERS HIỆN CÓ ĐỂ GIỮ LẠI ADMIN CHÍNH (admin@1car.vn)
-- DELETE FROM users;

-- ADMIN USERS (Ngoài admin@1car.vn)
INSERT OR IGNORE INTO users (
    email, name, department, role, password_hash, position, phone,
    is_active, last_login, password_changed_at, failed_login_attempts, locked_until, created_at, updated_at, created_by
) VALUES
('giamdoc.dh@1car.vn', 'Trần Nhân Giáp', 'Ban Giám đốc', 'admin', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Giám đốc Điều hành', '0901234567', 1, datetime('now', '-1 days'), datetime('now', '-30 days'), 0, NULL, datetime('now', '-30 days'), datetime('now', '-1 days'), 1),
('phogiamdoc@1car.vn', 'Trần Thị Bình', 'Ban Giám đốc', 'admin', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Phó Tổng Giám đốc', '0901234568', 1, datetime('now', '-2 days'), datetime('now', '-25 days'), 0, NULL, datetime('now', '-25 days'), datetime('now', '-2 days'), 1),
('it.admin@1car.vn', 'Lê Văn Cường', 'Phòng Công nghệ Hệ thống', 'admin', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng IT', '0901234569', 1, datetime('now', '-3 days'), datetime('now', '-20 days'), 0, NULL, datetime('now', '-20 days'), datetime('now', '-3 days'), 1),
('hr.admin@1car.vn', 'Phạm Thị Dung', 'Ban Giám đốc', 'admin', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng Nhân sự', '0901234570', 1, datetime('now', '-4 days'), datetime('now', '-15 days'), 0, NULL, datetime('now', '-15 days'), datetime('now', '-4 days'), 1),
('legal.admin@1car.vn', 'Hoàng Văn Em', 'Phòng Pháp lý', 'admin', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng Pháp lý', '0901234571', 1, datetime('now', '-5 days'), datetime('now', '-10 days'), 0, NULL, datetime('now', '-10 days'), datetime('now', '-5 days'), 1);

-- USER THƯỜNG
INSERT OR IGNORE INTO users (email, name, department, role, password_hash, position, phone, is_active, created_at, updated_at, created_by) VALUES
('franchise.manager@1car.vn', 'Nguyễn Thị Giang', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng', '0912345601', 1, datetime('now', '-8 days'), datetime('now', '-1 days'), 1),
('franchise.dev1@1car.vn', 'Trần Văn Hải', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên', '0912345602', 1, datetime('now', '-7 days'), datetime('now', '-1 days'), 1),
('franchise.dev2@1car.vn', 'Lê Thị Lan', 'Phòng Phát triển Nhượng quyền', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên', '0912345603', 1, datetime('now', '-6 days'), datetime('now', '-1 days'), 1),
('training.manager@1car.vn', 'Phạm Văn Minh', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng', '0912345604', 1, datetime('now', '-5 days'), datetime('now', '-1 days'), 1),
('training.spec1@1car.vn', 'Hoàng Thị Nga', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên', '0912345605', 1, datetime('now', '-4 days'), datetime('now', '-1 days'), 1),
('training.spec2@1car.vn', 'Nguyễn Văn Phong', 'Phòng Đào tạo Tiêu chuẩn', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên', '0912345606', 1, datetime('now', '-3 days'), datetime('now', '-1 days'), 1),
('marketing.manager@1car.vn', 'Trần Thị Quỳnh', 'Phòng Marketing', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng', '0912345607', 1, datetime('now', '-2 days'), datetime('now', '-1 days'), 1),
('marketing.spec@1car.vn', 'Lê Văn Rồng', 'Phòng Marketing', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên', '0912345608', 1, datetime('now', '-1 days'), datetime('now', '-1 days'), 1),
('qc.manager@1car.vn', 'Phạm Văn Sơn', 'Phòng Kỹ thuật QC', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng', '0912345609', 1, datetime('now'), datetime('now'), 1),
('qc.tech1@1car.vn', 'Hoàng Thị Tâm', 'Phòng Kỹ thuật QC', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kỹ thuật viên', '0912345610', 1, datetime('now'), datetime('now'), 1),
('qc.tech2@1car.vn', 'Nguyễn Văn Uy', 'Phòng Kỹ thuật QC', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kỹ thuật viên', '0912345611', 1, datetime('now'), datetime('now'), 1),
('finance.manager@1car.vn', 'Trần Văn Việt', 'Phòng Tài chính', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng phòng', '0912345612', 1, datetime('now'), datetime('now'), 1),
('finance.acc@1car.vn', 'Lê Thị Xuân', 'Phòng Tài chính', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kế toán viên', '0912345613', 1, datetime('now'), datetime('now'), 1),
('it.dev@1car.vn', 'Hoàng Văn Zung', 'Phòng Công nghệ Hệ thống', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Developer', '0912345615', 1, datetime('now'), datetime('now'), 1),
('legal.spec@1car.vn', 'Trần Văn Bảo', 'Phòng Pháp lý', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên Pháp lý', '0912345616', 1, datetime('now'), datetime('now'), 1),
('cskh.manager@1car.vn', 'Lê Văn Cảnh', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Trưởng bộ phận', '0912345617', 1, datetime('now'), datetime('now'), 1),
('cskh.staff1@1car.vn', 'Phạm Thị Diệu', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Nhân viên CSKH', '0912345618', 1, datetime('now'), datetime('now'), 1),
('cskh.staff2@1car.vn', 'Hoàng Văn Ếch', 'Bộ phận Tiếp nhận CSKH', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Nhân viên CSKH', '0912345619', 1, datetime('now'), datetime('now'), 1),
('garage.tech.manager@1car.vn', 'Nguyễn Văn Phúc', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Tổ trưởng Kỹ thuật', '0912345620', 1, datetime('now'), datetime('now'), 1),
('garage.tech1@1car.vn', 'Trần Thị Giang', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kỹ thuật viên', '0912345621', 1, datetime('now'), datetime('now'), 1),
('garage.tech2@1car.vn', 'Lê Văn Hùng', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kỹ thuật viên', '0912345622', 1, datetime('now'), datetime('now'), 1),
('garage.tech3@1car.vn', 'Phạm Thị Lan Anh', 'Bộ phận Kỹ thuật Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kỹ thuật viên', '0912345623', 1, datetime('now'), datetime('now'), 1),
('garage.qc.manager@1car.vn', 'Hoàng Văn Minh', 'Bộ phận QC Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Tổ trưởng QC', '0912345624', 1, datetime('now'), datetime('now'), 1),
('garage.qc1@1car.vn', 'Nguyễn Thị Nga', 'Bộ phận QC Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Nhân viên QC', '0912345625', 1, datetime('now'), datetime('now'), 1),
('garage.qc2@1car.vn', 'Trần Văn Ông', 'Bộ phận QC Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Nhân viên QC', '0912345626', 1, datetime('now'), datetime('now'), 1),
('garage.acc.manager@1car.vn', 'Lê Thị Phương', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kế toán trưởng', '0912345627', 1, datetime('now'), datetime('now'), 1),
('garage.acc1@1car.vn', 'Phạm Văn Quang', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Kế toán viên', '0912345628', 1, datetime('now'), datetime('now'), 1),
('garage.warehouse@1car.vn', 'Hoàng Thị Rùa', 'Bộ phận Kho/Kế toán Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Thủ kho', '0912345629', 1, datetime('now'), datetime('now'), 1),
('garage.marketing.manager@1car.vn', 'Nguyễn Văn Sáng', 'Bộ phận Marketing Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên Marketing', '0912345630', 1, datetime('now'), datetime('now'), 1),
('garage.marketing@1car.vn', 'Trần Thị Tuyết', 'Bộ phận Marketing Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Chuyên viên Marketing', '0912345631', 1, datetime('now'), datetime('now'), 1),
('garage.manager1@1car.vn', 'Lê Văn Uyên', 'Quản lý Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Quản lý Garage A', '0912345632', 1, datetime('now'), datetime('now'), 1),
('garage.manager2@1car.vn', 'Phạm Thị Vân', 'Quản lý Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Quản lý Garage B', '0912345633', 1, datetime('now'), datetime('now'), 1),
('garage.manager3@1car.vn', 'Hoàng Văn Xuân', 'Quản lý Garage', 'user', '$2b$12$G8B6d4jZ7.dG5.nJ3R1vN.Iqg4u0i3f.y8h.Y5u2.zJ8k8S.g9o.W', 'Quản lý Garage C', '0912345634', 1, datetime('now'), datetime('now'), 1);