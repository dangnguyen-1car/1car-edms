-- database/seeds/documents.sql
-- =================================================================
-- EDMS 1CAR - Sample Documents Data
-- Sử dụng INSERT OR IGNORE để tránh lỗi nếu chạy seed nhiều lần.
-- Thay thế các author_id, reviewer_id, approver_id bằng ID thực tế
-- của người dùng sau khi bảng users đã được seed.
-- admin@1car.vn (ID=1)
-- giamdoc.dh@1car.vn (ID=2)
-- phogiamdoc@1car.vn (ID=3)
-- it.admin@1car.vn (ID=4)
-- hr.admin@1car.vn (ID=5)
-- legal.admin@1car.vn (ID=6)
-- franchise.manager@1car.vn (ID=7)
-- ... và tiếp tục
-- =================================================================

INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES
(
    'C-PL-BGD-001', 'Chính sách Chất lượng Toàn diện 1CAR', 'Chính sách quản lý chất lượng áp dụng cho toàn bộ hệ thống 1CAR, tuân thủ IATF 16949.',
    'PL', 'Ban Giám đốc', 'published', '02.01', 'high', 'confidential',
    1, -- author_id (admin@1car.vn)
    2, -- reviewer_id (giamdoc.dh@1car.vn)
    1, -- approver_id (admin@1car.vn)
    'Toàn bộ hệ thống 1CAR', '["Tất cả phòng ban"]', 365, 2555,
    date('now', '+365 days'), date('now', '+2555 days'), 'Cập nhật định kỳ năm 2025', 'Rà soát và điều chỉnh theo thay đổi của thị trường và tiêu chuẩn.', 'chất lượng, chính sách, IATF, toàn diện',
    datetime('now', '-60 days'), datetime('now', '-5 days'), datetime('now', '-5 days'),
    '/uploads/default/C-PL-BGD-001_v02.01.pdf', 'Chinh_sach_Chat_luong_1CAR_v2.1.pdf', 1024000, 'application/pdf'
),
(
    'C-PR-ITS-001', 'Quy trình Quản lý Sự cố IT', 'Quy trình tiếp nhận, xử lý và giải quyết các sự cố liên quan đến hệ thống công nghệ thông tin.',
    'PR', 'Phòng Công nghệ Hệ thống', 'published', '01.00', 'high', 'internal',
    4, -- author_id (it.admin@1car.vn)
    1, -- reviewer_id (admin@1car.vn)
    4, -- approver_id (it.admin@1car.vn)
    'Phòng Công nghệ Hệ thống và các phòng ban liên quan', '["Phòng Công nghệ Hệ thống", "Ban Giám đốc"]', 180, 1095,
    date('now', '+180 days'), date('now', '+1095 days'), 'Ban hành lần đầu', 'Tạo mới quy trình quản lý sự cố IT.', 'IT, sự cố, quy trình, hỗ trợ',
    datetime('now', '-45 days'), datetime('now', '-10 days'), datetime('now', '-10 days'),
    '/uploads/default/C-PR-ITS-001_v01.00.pdf', 'Quy_trinh_Quan_ly_Su_co_IT_v1.0.pdf', 512000, 'application/pdf'
),
(
    'C-WI-CSKH-001', 'Hướng dẫn Tiếp nhận Cuộc gọi Khách hàng', 'Hướng dẫn chi tiết các bước và kịch bản cho nhân viên CSKH khi tiếp nhận cuộc gọi từ khách hàng.',
    'WI', 'Bộ phận Tiếp nhận CSKH', 'review', '01.00', 'normal', 'internal',
    (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'), -- Sử dụng subquery để lấy ID động
    1, -- reviewer_id (admin@1car.vn)
    NULL, -- approver_id (chưa duyệt)
    'Bộ phận Tiếp nhận CSKH', '["Bộ phận Tiếp nhận CSKH"]', 90, 730,
    NULL, date('now', '+730 days'), 'Soạn thảo lần đầu', 'Tạo hướng dẫn công việc cho bộ phận CSKH.', 'CSKH, cuộc gọi, kịch bản, hướng dẫn',
    datetime('now', '-20 days'), datetime('now', '-2 days'), NULL,
    NULL, NULL, NULL, NULL -- Chưa có file cho bản nháp/review
),
(
    'C-FM-HR-001', 'Biểu mẫu Đánh giá Nhân viên Thử việc', 'Biểu mẫu chuẩn dùng để đánh giá nhân viên trong giai đoạn thử việc.',
    'FM', 'Ban Giám đốc', 'published', '01.00', 'normal', 'internal',
    5, -- author_id (hr.admin@1car.vn)
    1, -- reviewer_id (admin@1car.vn)
    5, -- approver_id (hr.admin@1car.vn)
    'Tất cả các phòng ban có nhân viên thử việc', '["Tất cả phòng ban"]', NULL, NULL, -- Form thường không có chu kỳ review/lưu trữ cố định
    NULL, NULL, 'Ban hành lần đầu', 'Tạo biểu mẫu đánh giá thử việc.', 'nhân sự, thử việc, đánh giá, biểu mẫu',
    datetime('now', '-30 days'), datetime('now', '-15 days'), datetime('now', '-15 days'),
    '/uploads/default/C-FM-HR-001_v01.00.docx', 'Bieu_mau_Danh_gia_Thu_viec_v1.0.docx', 120500, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
),
(
    'C-TD-KTG-001', 'Tài liệu Kỹ thuật Dòng xe Mazda CX-5', 'Thông số kỹ thuật chi tiết, sơ đồ mạch điện và hướng dẫn sửa chữa cho dòng xe Mazda CX-5.',
    'TD', 'Bộ phận Kỹ thuật Garage', 'draft', '01.00', 'normal', 'confidential',
    (SELECT id FROM users WHERE email = 'garage.tech.manager@1car.vn'),
    NULL,
    NULL,
    'Bộ phận Kỹ thuật Garage, Bộ phận QC Garage', '["Bộ phận Kỹ thuật Garage", "Bộ phận QC Garage"]', 180, 1825,
    NULL, date('now', '+1825 days'), 'Bản nháp ban đầu', 'Biên soạn tài liệu kỹ thuật cho Mazda CX-5.', 'kỹ thuật, Mazda, CX-5, sửa chữa',
    datetime('now', '-5 days'), datetime('now', '-1 days'), NULL,
    NULL, NULL, NULL, NULL
);

-- Thêm nhiều tài liệu mẫu khác cho đủ 100 bản ghi nếu cần, theo cấu trúc tương tự.
-- Hãy đảm bảo tham chiếu đến các user ID hợp lệ đã được tạo trong users.sql.

-- Ví dụ thêm một vài bản ghi cho các phòng ban khác
INSERT OR IGNORE INTO documents (
    document_code, title, type, department, status, version, author_id, created_at, updated_at
) VALUES
('C-PR-MKT-001', 'Quy trình Lên kế hoạch Marketing Quý', 'PR', 'Phòng Marketing', 'draft', '01.00', (SELECT id FROM users WHERE email = 'marketing.manager@1car.vn'), datetime('now', '-3 days'), datetime('now', '-1 days')),
('C-PL-PTNQ-001', 'Chính sách Phát triển Đối tác Nhượng quyền', 'PL', 'Phòng Phát triển Nhượng quyền', 'published', '01.00', (SELECT id FROM users WHERE email = 'franchise.manager@1car.vn'), datetime('now', '-10 days'), datetime('now', '-2 days')),
('C-WI-DTTT-001', 'Hướng dẫn Tổ chức Khóa Đào tạo Online', 'WI', 'Phòng Đào tạo Tiêu chuẩn', 'published', '01.00', (SELECT id FROM users WHERE email = 'training.manager@1car.vn'), datetime('now', '-15 days'), datetime('now', '-5 days'));


-- =================================================================
-- INSERT DOCUMENT VERSIONS (cho một vài tài liệu chính)
-- =================================================================

-- Version cho 'Chính sách Chất lượng Toàn diện 1CAR' (document_id sẽ là ID của C-PL-BGD-001)
INSERT OR IGNORE INTO document_versions (document_id, version, file_path, file_name, file_size, change_reason, change_summary, change_type, created_by, created_at, status)
SELECT
    d.id, '01.00', '/uploads/history/C-PL-BGD-001_v01.00.pdf', 'Chinh_sach_Chat_luong_1CAR_v1.0.pdf', 950000, 'Ban hành lần đầu', 'Phiên bản đầu tiên của chính sách chất lượng.', 'major', 1, datetime('now', '-70 days'), 'superseded'
FROM documents d WHERE d.document_code = 'C-PL-BGD-001';

INSERT OR IGNORE INTO document_versions (document_id, version, file_path, file_name, file_size, change_reason, change_summary, change_type, created_by, created_at, status)
SELECT
    d.id, '02.00', '/uploads/history/C-PL-BGD-001_v02.00.pdf', 'Chinh_sach_Chat_luong_1CAR_v2.0.pdf', 980000, 'Cập nhật hàng năm', 'Rà soát và cập nhật theo tiêu chuẩn mới.', 'major', 1, datetime('now', '-65 days'), 'superseded'
FROM documents d WHERE d.document_code = 'C-PL-BGD-001';

-- Version hiện tại (02.01) của C-PL-BGD-001 đã được ghi trong bảng documents, không cần thêm ở đây.

-- =================================================================
-- INSERT WORKFLOW TRANSITIONS (cho một vài tài liệu chính)
-- =================================================================

-- Workflow cho 'Chính sách Chất lượng Toàn diện 1CAR'
INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, NULL, 'draft', 'Tạo mới tài liệu', 1, datetime('now', '-60 days')
FROM documents d WHERE d.document_code = 'C-PL-BGD-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'draft', 'review', 'Gửi cho GĐ Điều Hành review', 1, datetime('now', '-30 days')
FROM documents d WHERE d.document_code = 'C-PL-BGD-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'review', 'published', 'Đã duyệt, ban hành.', 'approved', 1, datetime('now', '-5 days')
FROM documents d WHERE d.document_code = 'C-PL-BGD-001';


-- Workflow cho 'Hướng dẫn Tiếp nhận Cuộc gọi Khách hàng' (đang ở review)
INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, NULL, 'draft', 'Soạn thảo hướng dẫn', (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'), datetime('now', '-20 days')
FROM documents d WHERE d.document_code = 'C-WI-CSKH-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'draft', 'review', 'Gửi GĐ xem xét', (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'), datetime('now', '-2 days')
FROM documents d WHERE d.document_code = 'C-WI-CSKH-001';