-- database/seeds/documents.sql (VERSION MỚI - CẬP NHẬT TỪ TÀI LIỆU MẪU)
-- =================================================================
-- EDMS 1CAR - Dữ liệu Tài liệu Mẫu (2025-06-11)
-- File này chứa dữ liệu được trích xuất từ các file Word và kết hợp với dữ liệu gốc.
-- Sử dụng INSERT OR IGNORE để tránh lỗi nếu chạy seed nhiều lần.
-- Tham chiếu user ID từ database/seeds/users.sql
-- =================================================================

-- XÓA DỮ LIỆU CŨ ĐỂ ĐẢM BẢO TÍNH TOÀN VẸN KHI SEED LẠI
DELETE FROM document_versions;
DELETE FROM workflow_transitions;
DELETE FROM documents;


-- =================================================================
-- PHẦN 1: DỮ LIỆU TỪ 6 FILE TÀI LIỆU MẪU (.DOCX)
-- =================================================================

-- 1. Từ file: C-PL-MG-001_Chinh_sach_chat_luong.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-PL-MG-001', 'Chính sách chất lượng', 'Tài liệu này quy định chính sách chất lượng của hệ thống 1CAR, áp dụng cho tất cả các garage Standard và Mini.',
    'PL', 'Ban Giám đốc', 'published', '01.00', 'high', 'internal',
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), -- Tác giả: Giám đốc Điều hành
    (SELECT id FROM users WHERE email = 'phogiamdoc@1car.vn'), -- Người review: Phó Giám đốc
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), -- Người phê duyệt: Tổng Giám đốc 1CAR
    'Tất cả các garage Standard và Mini', '["Tất cả phòng ban"]', 365, 2555,
    date('now', '+365 days'), date('now', '+2555 days'), 'Ban hành lần đầu', 'Tạo mới chính sách chất lượng theo tiêu chuẩn IATF 16949.', 'chất lượng, chính sách, IATF 16949, cam kết',
    '2025-04-24 09:00:00', '2025-04-24 10:00:00', '2025-04-24 11:00:00',
    '/uploads/default/C-PL-MG-001_Chinh_sach_chat_luong_v1.0.pdf', 'C-PL-MG-001_Chinh_sach_chat_luong_v1.0.pdf', 158231, 'application/pdf'
);

-- 2. Từ file: C-PL-MG-002_Chinh_sach_khach_hang.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-PL-MG-002', 'Chính sách khách hàng', 'Tài liệu này quy định chính sách khách hàng của hệ thống 1CAR, áp dụng cho tất cả các garage Standard và Mini.',
    'PL', 'Ban Giám đốc', 'published', '01.00', 'high', 'internal',
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), -- Tác giả: Giám đốc Điều hành
    (SELECT id FROM users WHERE email = 'marketing.manager@1car.vn'), -- Người review: Marketing Manager
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), -- Người phê duyệt: Tổng Giám đốc 1CAR
    'Tất cả các hoạt động, quy trình và nhân viên trong hệ thống 1CAR', '["Tất cả phòng ban"]', 365, 2555,
    date('now', '+365 days'), date('now', '+2555 days'), 'Ban hành lần đầu', 'Tạo mới chính sách khách hàng, đặt khách hàng làm trung tâm.', 'khách hàng, chính sách, chăm sóc khách hàng, cskh, hài lòng',
    '2025-04-25 09:00:00', '2025-04-25 10:00:00', '2025-04-25 11:00:00',
    '/uploads/default/C-PL-MG-002_Chinh_sach_khach_hang_v1.0.pdf', 'C-PL-MG-002_Chinh_sach_khach_hang_v1.0.pdf', 162345, 'application/pdf'
);

-- 3. Từ file: C-OK-MG-001_Bang_muc_tieu_BSC_OKR_KPI_tong_the.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-OK-MG-001', 'Bảng mục tiêu BSC-OKR-KPI tổng thể', 'Tài liệu này quy định bảng mục tiêu tổng thể của hệ thống 1CAR theo phương pháp Balanced Scorecard (BSC), Objectives and Key Results (OKR) và Key Performance Indicators (KPI).',
    'PL', -- Phân loại là Chính sách (Policy) vì nó định hướng chiến lược
    'Ban Giám đốc', 'published', '01.00', 'high', 'confidential',
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    (SELECT id FROM users WHERE email = 'phogiamdoc@1car.vn'),
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    'Tất cả các garage Standard và Mini', '["Ban Giám đốc", "Quản lý Garage"]', 180, 1825,
    date('now', '+180 days'), date('now', '+1825 days'), 'Ban hành lần đầu', 'Thiết lập khung mục tiêu chiến lược cho toàn hệ thống.', 'bsc, okr, kpi, mục tiêu, chiến lược',
    '2025-04-26 09:00:00', '2025-04-26 10:00:00', '2025-04-26 11:00:00',
    '/uploads/default/C-OK-MG-001_Bang_muc_tieu_BSC_OKR_KPI_v1.0.pdf', 'C-OK-MG-001_Bang_muc_tieu_BSC_OKR_KPI_v1.0.pdf', 110489, 'application/pdf'
);

-- 4. Từ file: C-FM-MG-001_Bieu_mau_theo_doi_muc_tieu.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-FM-MG-001', 'Biểu mẫu theo dõi mục tiêu', 'Biểu mẫu dùng để theo dõi các mục tiêu theo BSC, OKR và KPI cho các garage.',
    'FM', 'Ban Giám đốc', 'published', '01.00', 'normal', 'internal',
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    (SELECT id FROM users WHERE email = 'phogiamdoc@1car.vn'),
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    'Tất cả các garage Standard và Mini', '["Tất cả phòng ban"]', 90, 1095,
    date('now', '+90 days'), date('now', '+1095 days'), 'Ban hành lần đầu', 'Tạo biểu mẫu chuẩn để theo dõi hiệu suất.', 'biểu mẫu, form, kpi, theo dõi',
    '2025-04-27 09:00:00', '2025-04-27 10:00:00', '2025-04-27 11:00:00',
    '/uploads/default/C-FM-MG-001_Bieu_mau_theo_doi_muc_tieu_v1.0.pdf', 'C-FM-MG-001_Bieu_mau_theo_doi_muc_tieu_v1.0.pdf', 198334, 'application/pdf'
);

-- 5. Từ file: C-TD-MG-001_Ma_tran_RACI_tong_bo_phan.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-TD-MG-001', 'Ma trận RACI - Trách nhiệm các bộ phận', 'Cung cấp ma trận phân bổ trách nhiệm RACI cho tất cả các quy trình cốt lõi và quản lý trong hệ thống 1CAR.',
    'TD', 'Ban Giám đốc', 'published', '01.00', 'high', 'internal',
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    (SELECT id FROM users WHERE email = 'hr.admin@1car.vn'), -- HR review
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    'Tất cả các garage Standard và Mini', '["Tất cả phòng ban"]', 180, 1825,
    date('now', '+180 days'), date('now', '+1825 days'), 'Ban hành lần đầu', 'Làm rõ vai trò và trách nhiệm của từng phòng ban.', 'raci, ma trận, trách nhiệm, phân công',
    '2025-04-28 09:00:00', '2025-04-28 10:00:00', '2025-04-28 11:00:00',
    '/uploads/default/C-TD-MG-001_Ma_tran_RACI_v1.0.pdf', 'C-TD-MG-001_Ma_tran_RACI_v1.0.pdf', 210987, 'application/pdf'
);

-- 6. Từ file: C-PR-QC-001-QUY_TRINH_QUAN_LY_CHAT_LUONG_TONG_THE.docx
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES (
    'C-PR-QC-001', 'Quy trình quản lý chất lượng tổng thể', 'Quy trình này thiết lập khung quản lý chất lượng tổng thể cho hệ thống 1CAR, đảm bảo tuân thủ tiêu chuẩn IATF 16949.',
    'PR', 'Phòng Đào tạo Tiêu chuẩn', 'published', '01.00', 'high', 'internal',
    (SELECT id FROM users WHERE email = 'training.manager@1car.vn'),
    (SELECT id FROM users WHERE email = 'qc.manager@1car.vn'), -- QC manager reviews
    (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'),
    'Tất cả các garage Standard và Mini', '["Phòng Đào tạo Tiêu chuẩn", "Phòng Kỹ thuật QC", "Ban Giám đốc"]', 180, 1825,
    date('now', '+180 days'), date('now', '+1825 days'), 'Ban hành lần đầu', 'Chuẩn hóa quy trình quản lý chất lượng trên toàn hệ thống.', 'quy trình, chất lượng, qms, qc',
    '2025-04-29 09:00:00', '2025-04-29 10:00:00', '2025-04-29 11:00:00',
    '/uploads/default/C-PR-QC-001_Quy_trinh_quan_ly_chat_luong_v1.0.pdf', 'C-PR-QC-001_Quy_trinh_quan_ly_chat_luong_v1.0.pdf', 178543, 'application/pdf'
);


-- =================================================================
-- PHẦN 2: DỮ LIỆU TỪ FILE documents.sql GỐC (ĐÃ SỬA LỖI)
-- Giữ lại các tài liệu này để làm phong phú dữ liệu mẫu
-- =================================================================

-- Câu lệnh INSERT đầy đủ cho các tài liệu có đủ 28 cột
INSERT OR IGNORE INTO documents (
    document_code, title, description, type, department, status, version, priority, security_level,
    author_id, reviewer_id, approver_id, scope_of_application, recipients, review_cycle, retention_period,
    next_review_date, disposal_date, change_reason, change_summary, keywords,
    created_at, updated_at, published_at, file_path, file_name, file_size, mime_type
) VALUES
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
    (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'),
    1, -- reviewer_id (admin@1car.vn)
    NULL, -- approver_id (chưa duyệt)
    'Bộ phận Tiếp nhận CSKH', '["Bộ phận Tiếp nhận CSKH"]', 90, 730,
    NULL, date('now', '+730 days'), 'Soạn thảo lần đầu', 'Tạo hướng dẫn công việc cho bộ phận CSKH.', 'CSKH, cuộc gọi, kịch bản, hướng dẫn',
    datetime('now', '-20 days'), datetime('now', '-2 days'), NULL,
    NULL, NULL, NULL, NULL
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

-- Câu lệnh INSERT riêng cho các tài liệu chỉ có 9 cột
INSERT OR IGNORE INTO documents (document_code, title, type, department, status, version, author_id, created_at, updated_at) VALUES
('C-PR-MKT-001', 'Quy trình Lên kế hoạch Marketing Quý', 'PR', 'Phòng Marketing', 'draft', '01.00', (SELECT id FROM users WHERE email = 'marketing.manager@1car.vn'), datetime('now', '-3 days'), datetime('now', '-1 days')),
('C-PL-PTNQ-001', 'Chính sách Phát triển Đối tác Nhượng quyền', 'PL', 'Phòng Phát triển Nhượng quyền', 'published', '01.00', (SELECT id FROM users WHERE email = 'franchise.manager@1car.vn'), datetime('now', '-10 days'), datetime('now', '-2 days')),
('C-WI-DTTT-001', 'Hướng dẫn Tổ chức Khóa Đào tạo Online', 'WI', 'Phòng Đào tạo Tiêu chuẩn', 'published', '01.00', (SELECT id FROM users WHERE email = 'training.manager@1car.vn'), datetime('now', '-15 days'), datetime('now', '-5 days'));

-- =================================================================
-- PHẦN 3: INSERT DOCUMENT VERSIONS & WORKFLOWS (từ file gốc)
-- Giữ nguyên phần này
-- =================================================================
-- Version cho 'Chính sách Chất lượng Toàn diện 1CAR' (C-PL-MG-001 đã được đổi tên)
INSERT OR IGNORE INTO document_versions (document_id, version, file_path, file_name, file_size, change_reason, change_summary, change_type, created_by, created_at, status)
SELECT
    d.id, '00.90', '/uploads/history/C-PL-MG-001_v00.90.pdf', 'Chinh_sach_Chat_luong_1CAR_v0.9.pdf', 950000, 'Bản nháp ban đầu', 'Phiên bản đầu tiên của chính sách chất lượng.', 'major', 1, datetime('now', '-70 days'), 'superseded'
FROM documents d WHERE d.document_code = 'C-PL-MG-001';

-- Workflow cho 'Chính sách Chất lượng Toàn diện 1CAR'
INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, NULL, 'draft', 'Tạo mới tài liệu chính sách chất lượng.', NULL, (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), datetime('now', '-60 days')
FROM documents d WHERE d.document_code = 'C-PL-MG-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'draft', 'review', 'Gửi cho Phó Giám đốc review.', NULL, (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), datetime('now', '-30 days')
FROM documents d WHERE d.document_code = 'C-PL-MG-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'review', 'published', 'Đã duyệt, ban hành.', 'approved', (SELECT id FROM users WHERE email = 'giamdoc.dh@1car.vn'), datetime('now', '-5 days')
FROM documents d WHERE d.document_code = 'C-PL-MG-001';

-- Workflow cho 'Hướng dẫn Tiếp nhận Cuộc gọi Khách hàng' (đang ở review)
INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, NULL, 'draft', 'Soạn thảo hướng dẫn.', NULL, (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'), datetime('now', '-20 days')
FROM documents d WHERE d.document_code = 'C-WI-CSKH-001';

INSERT OR IGNORE INTO workflow_transitions (document_id, from_status, to_status, comment, decision, transitioned_by, transitioned_at)
SELECT
    d.id, 'draft', 'review', 'Gửi Admin xem xét.', NULL, (SELECT id FROM users WHERE email = 'cskh.manager@1car.vn'), datetime('now', '-2 days')
FROM documents d WHERE d.document_code = 'C-WI-CSKH-001';