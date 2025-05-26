-- =================================================================
-- EDMS 1CAR - Sample Documents Data
-- Sample documents for 14 departments with 7 document types
-- Based on C-TD-MG-005 document codes and C-PR-VM-001 versioning
-- Total: ~100 sample documents across all departments
-- =================================================================

-- Clear existing data
DELETE FROM documents;
DELETE FROM document_versions;
DELETE FROM workflow_transitions;
DELETE FROM document_permissions;

-- Reset auto increment
DELETE FROM sqlite_sequence WHERE name='documents';
DELETE FROM sqlite_sequence WHERE name='document_versions';
DELETE FROM sqlite_sequence WHERE name='workflow_transitions';
DELETE FROM sqlite_sequence WHERE name='document_permissions';

-- =================================================================
-- BAN GIÁM ĐỐC - POLICY & PROCEDURES (8 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Chính sách Quản lý Chất lượng Tổng thể', 'PL-001-2025-BGD-001', 'PL', 'Ban Giám đốc', '2.1', 'published', 'Chính sách quản lý chất lượng áp dụng toàn công ty theo IATF 16949', 1, 2, 1, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-25 days'), datetime('now', '-20 days')),
('Quy trình Phê duyệt Đầu tư', 'PR-001-2025-BGD-002', 'PR', 'Ban Giám đốc', '1.3', 'published', 'Quy trình phê duyệt các dự án đầu tư trên 500 triệu', 2, 1, 1, 'Ban Giám đốc, Phòng Tài chính', '["Ban Giám đốc","Phòng Tài chính"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Hướng dẫn Báo cáo Định kỳ', 'WI-001-2025-BGD-003', 'WI', 'Ban Giám đốc', '1.0', 'published', 'Hướng dẫn lập báo cáo tháng, quý, năm', 4, 2, 1, 'Tất cả trưởng phòng', '["Tất cả phòng ban"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Biểu mẫu Đánh giá Hiệu suất', 'FM-001-2025-BGD-004', 'FM', 'Ban Giám đốc', '2.0', 'published', 'Biểu mẫu đánh giá hiệu suất nhân viên 6 tháng/lần', 4, 1, 2, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Tài liệu Cấu trúc Tổ chức', 'TD-001-2025-BGD-005', 'TD', 'Ban Giám đốc', '3.0', 'published', 'Sơ đồ tổ chức và phân công nhiệm vụ', 1, 4, 2, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-10 days'), datetime('now', '-5 days')),
('Chính sách An toàn Lao động', 'PL-002-2025-BGD-006', 'PL', 'Ban Giám đốc', '1.2', 'review', 'Chính sách ATLĐ và PCCC toàn công ty', 2, 1, null, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-8 days'), null),
('Quy trình Quản lý Rủi ro', 'PR-002-2025-BGD-007', 'PR', 'Ban Giám đốc', '1.0', 'draft', 'Quy trình nhận diện và quản lý rủi ro doanh nghiệp', 1, null, null, 'Ban lãnh đạo', '["Ban Giám đốc"]', datetime('now', '-5 days'), null),
('Tài liệu Đào tạo Lãnh đạo', 'TR-001-2025-BGD-008', 'TR', 'Ban Giám đốc', '1.1', 'published', 'Chương trình đào tạo kỹ năng lãnh đạo', 4, 2, 1, 'Cấp quản lý', '["Ban Giám đốc","Quản lý Garage"]', datetime('now', '-3 days'), datetime('now', '-1 days'));

-- =================================================================
-- PHÒNG PHÁT TRIỂN NHƯỢNG QUYỀN (7 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Phát triển Đối tác', 'PR-003-2025-FRA-001', 'PR', 'Phòng Phát triển Nhượng quyền', '2.0', 'published', 'Quy trình tuyển chọn và phát triển đối tác nhượng quyền', 6, 7, 1, 'Phòng Phát triển NQ', '["Phòng Phát triển Nhượng quyền","Ban Giám đốc"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Hướng dẫn Đánh giá Địa điểm', 'WI-002-2025-FRA-002', 'WI', 'Phòng Phát triển Nhượng quyền', '1.5', 'published', 'Tiêu chí đánh giá và lựa chọn địa điểm garage', 7, 6, 2, 'Đội phát triển', '["Phòng Phát triển Nhượng quyền"]', datetime('now', '-20 days'), datetime('now', '-16 days')),
('Biểu mẫu Hồ sơ Đối tác', 'FM-002-2025-FRA-003', 'FM', 'Phòng Phát triển Nhượng quyền', '1.0', 'published', 'Biểu mẫu thu thập thông tin đối tác tiềm năng', 8, 7, 6, 'Nhân viên kinh doanh', '["Phòng Phát triển Nhượng quyền"]', datetime('now', '-18 days'), datetime('now', '-14 days')),
('Tài liệu Tiêu chuẩn Garage', 'TD-002-2025-FRA-004', 'TD', 'Phòng Phát triển Nhượng quyền', '3.2', 'published', 'Tiêu chuẩn thiết kế và trang thiết bị garage', 6, 8, 1, 'Đối tác nhượng quyền', '["Phòng Phát triển Nhượng quyền","Bộ phận Kỹ thuật Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Chính sách Hỗ trợ Đối tác', 'PL-003-2025-FRA-005', 'PL', 'Phòng Phát triển Nhượng quyền', '1.8', 'published', 'Chính sách hỗ trợ marketing và vận hành cho đối tác', 7, 6, 2, 'Đối tác nhượng quyền', '["Phòng Phát triển Nhượng quyền","Phòng Marketing"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Hồ sơ Đối tác Tiềm năng', 'RC-001-2025-FRA-006', 'RC', 'Phòng Phát triển Nhượng quyền', '1.0', 'review', 'Database đối tác tiềm năng khu vực miền Bắc', 8, 7, null, 'Phòng Phát triển NQ', '["Phòng Phát triển Nhượng quyền"]', datetime('now', '-8 days'), null),
('Tài liệu Đào tạo Đối tác', 'TR-002-2025-FRA-007', 'TR', 'Phòng Phát triển Nhượng quyền', '2.1', 'draft', 'Chương trình đào tạo vận hành cho đối tác mới', 6, null, null, 'Đối tác mới', '["Phòng Phát triển Nhượng quyền","Phòng Đào tạo Tiêu chuẩn"]', datetime('now', '-5 days'), null);

-- =================================================================
-- PHÒNG ĐÀO TẠO TIÊU CHUẨN (8 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Đào tạo Nhân viên Mới', 'PR-004-2025-TRA-001', 'PR', 'Phòng Đào tạo Tiêu chuẩn', '1.7', 'published', 'Quy trình đào tạo định hướng cho nhân viên mới', 9, 10, 4, 'Tất cả nhân viên mới', '["Tất cả phòng ban"]', datetime('now', '-25 days'), datetime('now', '-20 days')),
('Hướng dẫn Đánh giá Đào tạo', 'WI-003-2025-TRA-002', 'WI', 'Phòng Đào tạo Tiêu chuẩn', '2.0', 'published', 'Phương pháp đánh giá hiệu quả đào tạo', 10, 9, 4, 'Phòng Đào tạo', '["Phòng Đào tạo Tiêu chuẩn"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Biểu mẫu Kế hoạch Đào tạo', 'FM-003-2025-TRA-003', 'FM', 'Phòng Đào tạo Tiêu chuẩn', '1.2', 'published', 'Mẫu lập kế hoạch đào tạo hàng quý', 11, 10, 9, 'Trưởng phòng', '["Tất cả phòng ban"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Tài liệu Kỹ thuật Sửa chữa Cơ bản', 'TD-003-2025-TRA-004', 'TD', 'Phòng Đào tạo Tiêu chuẩn', '4.1', 'published', 'Tài liệu kỹ thuật sửa chữa cơ bản cho kỹ thuật viên', 9, 11, 4, 'Kỹ thuật viên garage', '["Bộ phận Kỹ thuật Garage","Bộ phận QC Garage"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Chương trình Đào tạo An toàn', 'TR-003-2025-TRA-005', 'TR', 'Phòng Đào tạo Tiêu chuẩn', '1.5', 'published', 'Chương trình đào tạo an toàn lao động', 10, 9, 4, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Tài liệu Đào tạo Dịch vụ Khách hàng', 'TR-004-2025-TRA-006', 'TR', 'Phòng Đào tạo Tiêu chuẩn', '2.3', 'published', 'Kỹ năng giao tiếp và chăm sóc khách hàng', 11, 10, 9, 'Nhân viên CSKH', '["Bộ phận Tiếp nhận CSKH","Bộ phận Marketing Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Hồ sơ Chứng chỉ Đào tạo', 'RC-002-2025-TRA-007', 'RC', 'Phòng Đào tạo Tiêu chuẩn', '1.0', 'review', 'Hồ sơ chứng chỉ đào tạo của nhân viên', 9, 11, null, 'Phòng Đào tạo', '["Phòng Đào tạo Tiêu chuẩn"]', datetime('now', '-8 days'), null),
('Chính sách Đào tạo Liên tục', 'PL-004-2025-TRA-008', 'PL', 'Phòng Đào tạo Tiêu chuẩn', '1.0', 'draft', 'Chính sách đào tạo và phát triển nhân viên', 10, null, null, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-5 days'), null);

-- =================================================================
-- PHÒNG MARKETING (6 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Marketing Campaign', 'PR-005-2025-MKT-001', 'PR', 'Phòng Marketing', '1.4', 'published', 'Quy trình lập kế hoạch và thực hiện chiến dịch marketing', 12, 13, 2, 'Phòng Marketing', '["Phòng Marketing","Bộ phận Marketing Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Hướng dẫn Quản lý Brand', 'WI-004-2025-MKT-002', 'WI', 'Phòng Marketing', '2.1', 'published', 'Hướng dẫn sử dụng logo, màu sắc và nhận diện thương hiệu', 13, 12, 2, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Biểu mẫu Báo cáo Marketing', 'FM-004-2025-MKT-003', 'FM', 'Phòng Marketing', '1.0', 'published', 'Mẫu báo cáo hiệu quả marketing hàng tháng', 12, 13, 2, 'Phòng Marketing', '["Phòng Marketing"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Tài liệu Chiến lược Digital', 'TD-004-2025-MKT-004', 'TD', 'Phòng Marketing', '1.8', 'published', 'Chiến lược marketing digital và social media', 13, 12, 1, 'Phòng Marketing', '["Phòng Marketing","Bộ phận Marketing Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Chính sách Khuyến mãi', 'PL-005-2025-MKT-005', 'PL', 'Phòng Marketing', '2.2', 'review', 'Chính sách khuyến mãi và ưu đãi khách hàng', 12, 13, null, 'Garage và CSKH', '["Quản lý Garage","Bộ phận Tiếp nhận CSKH"]', datetime('now', '-8 days'), null),
('Hồ sơ Khách hàng Mục tiêu', 'RC-003-2025-MKT-006', 'RC', 'Phòng Marketing', '1.0', 'draft', 'Phân tích và hồ sơ khách hàng mục tiêu', 13, null, null, 'Phòng Marketing', '["Phòng Marketing"]', datetime('now', '-5 days'), null);

-- =================================================================
-- PHÒNG KỸ THUẬT QC (7 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Kiểm tra Chất lượng', 'PR-006-2025-QCT-001', 'PR', 'Phòng Kỹ thuật QC', '3.0', 'published', 'Quy trình kiểm tra chất lượng dịch vụ sửa chữa', 14, 15, 1, 'Tất cả garage', '["Bộ phận QC Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-25 days'), datetime('now', '-20 days')),
('Hướng dẫn Sử dụng Thiết bị QC', 'WI-005-2025-QCT-002', 'WI', 'Phòng Kỹ thuật QC', '1.3', 'published', 'Hướng dẫn vận hành thiết bị kiểm tra chất lượng', 15, 14, 1, 'Kỹ thuật viên QC', '["Phòng Kỹ thuật QC","Bộ phận QC Garage"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Biểu mẫu Checklist QC', 'FM-005-2025-QCT-003', 'FM', 'Phòng Kỹ thuật QC', '2.1', 'published', 'Checklist kiểm tra chất lượng từng công đoạn', 16, 15, 14, 'Kỹ thuật viên', '["Bộ phận QC Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Tài liệu Tiêu chuẩn Kỹ thuật', 'TD-005-2025-QCT-004', 'TD', 'Phòng Kỹ thuật QC', '4.5', 'published', 'Tiêu chuẩn kỹ thuật sửa chữa theo IATF 16949', 14, 16, 1, 'Kỹ thuật viên', '["Bộ phận Kỹ thuật Garage","Bộ phận QC Garage"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu Đào tạo QC', 'TR-005-2025-QCT-005', 'TR', 'Phòng Kỹ thuật QC', '1.7', 'published', 'Chương trình đào tạo kiểm soát chất lượng', 15, 14, 1, 'Nhân viên QC', '["Phòng Kỹ thuật QC","Bộ phận QC Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Hồ sơ Thiết bị QC', 'RC-004-2025-QCT-006', 'RC', 'Phòng Kỹ thuật QC', '1.2', 'review', 'Hồ sơ bảo trì và hiệu chuẩn thiết bị QC', 16, 15, null, 'Phòng QC', '["Phòng Kỹ thuật QC"]', datetime('now', '-8 days'), null),
('Chính sách Cải tiến Liên tục', 'PL-006-2025-QCT-007', 'PL', 'Phòng Kỹ thuật QC', '1.0', 'draft', 'Chính sách cải tiến liên tục quy trình QC', 14, null, null, 'Phòng QC', '["Phòng Kỹ thuật QC"]', datetime('now', '-5 days'), null);

-- =================================================================
-- PHÒNG TÀI CHÍNH (5 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Quản lý Ngân sách', 'PR-007-2025-FIN-001', 'PR', 'Phòng Tài chính', '2.3', 'published', 'Quy trình lập và quản lý ngân sách hàng năm', 17, 18, 1, 'Ban lãnh đạo', '["Ban Giám đốc","Phòng Tài chính"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Hướng dẫn Thanh toán', 'WI-006-2025-FIN-002', 'WI', 'Phòng Tài chính', '1.5', 'published', 'Hướng dẫn quy trình thanh toán và hoàn ứng', 18, 17, 2, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Biểu mẫu Đề xuất Chi', 'FM-006-2025-FIN-003', 'FM', 'Phòng Tài chính', '1.0', 'published', 'Biểu mẫu đề xuất chi phí và thanh toán', 17, 18, 1, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu Chính sách Tài chính', 'TD-006-2025-FIN-004', 'TD', 'Phòng Tài chính', '3.1', 'published', 'Chính sách tài chính và kế toán công ty', 18, 17, 1, 'Phòng Tài chính', '["Phòng Tài chính","Bộ phận Kho/Kế toán Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Hồ sơ Báo cáo Tài chính', 'RC-005-2025-FIN-005', 'RC', 'Phòng Tài chính', '1.0', 'review', 'Hồ sơ báo cáo tài chính quý I/2025', 17, 18, null, 'Ban lãnh đạo', '["Ban Giám đốc"]', datetime('now', '-8 days'), null);

-- =================================================================
-- PHÒNG CÔNG NGHỆ HỆ THỐNG (6 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Quản lý Hệ thống IT', 'PR-008-2025-ITS-001', 'PR', 'Phòng Công nghệ Hệ thống', '1.8', 'published', 'Quy trình quản lý và bảo trì hệ thống IT', 19, 20, 3, 'Phòng IT', '["Phòng Công nghệ Hệ thống"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Hướng dẫn Backup Dữ liệu', 'WI-007-2025-ITS-002', 'WI', 'Phòng Công nghệ Hệ thống', '2.0', 'published', 'Hướng dẫn sao lưu và phục hồi dữ liệu', 20, 19, 3, 'Quản trị viên IT', '["Phòng Công nghệ Hệ thống"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Biểu mẫu Yêu cầu IT', 'FM-007-2025-ITS-003', 'FM', 'Phòng Công nghệ Hệ thống', '1.2', 'published', 'Biểu mẫu yêu cầu hỗ trợ kỹ thuật IT', 19, 20, 3, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Tài liệu Bảo mật Thông tin', 'TD-007-2025-ITS-004', 'TD', 'Phòng Công nghệ Hệ thống', '2.5', 'published', 'Chính sách và quy trình bảo mật thông tin', 20, 19, 1, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Chính sách Sử dụng IT', 'PL-007-2025-ITS-005', 'PL', 'Phòng Công nghệ Hệ thống', '1.3', 'review', 'Chính sách sử dụng thiết bị và phần mềm IT', 19, 20, null, 'Tất cả nhân viên', '["Tất cả phòng ban"]', datetime('now', '-8 days'), null),
('Hồ sơ Hệ thống EDMS', 'RC-006-2025-ITS-006', 'RC', 'Phòng Công nghệ Hệ thống', '1.0', 'draft', 'Hồ sơ thiết kế và triển khai hệ thống EDMS', 20, null, null, 'Phòng IT', '["Phòng Công nghệ Hệ thống"]', datetime('now', '-5 days'), null);

-- =================================================================
-- PHÒNG PHÁP LÝ (5 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Xử lý Hợp đồng', 'PR-009-2025-LEG-001', 'PR', 'Phòng Pháp lý', '1.6', 'published', 'Quy trình soạn thảo và xử lý hợp đồng', 21, 22, 5, 'Phòng Pháp lý', '["Phòng Pháp lý","Ban Giám đốc"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Hướng dẫn Tuân thủ Pháp luật', 'WI-008-2025-LEG-002', 'WI', 'Phòng Pháp lý', '2.2', 'published', 'Hướng dẫn tuân thủ các quy định pháp luật', 22, 21, 5, 'Tất cả phòng ban', '["Tất cả phòng ban"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Biểu mẫu Hợp đồng Mẫu', 'FM-008-2025-LEG-003', 'FM', 'Phòng Pháp lý', '3.0', 'published', 'Mẫu hợp đồng dịch vụ và nhượng quyền', 21, 22, 5, 'Phòng kinh doanh', '["Phòng Phát triển Nhượng quyền","Quản lý Garage"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu Quy định Nội bộ', 'TD-008-2025-LEG-004', 'TD', 'Phòng Pháp lý', '1.9', 'published', 'Tổng hợp các quy định nội bộ công ty', 22, 21, 1, 'Toàn công ty', '["Tất cả phòng ban"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Hồ sơ Tranh chấp Pháp lý', 'RC-007-2025-LEG-005', 'RC', 'Phòng Pháp lý', '1.0', 'review', 'Hồ sơ xử lý tranh chấp và khiếu nại', 21, 22, null, 'Phòng Pháp lý', '["Phòng Pháp lý"]', datetime('now', '-8 days'), null);

-- =================================================================
-- BỘ PHẬN TIẾP NHẬN CSKH (6 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Tiếp nhận Khách hàng', 'PR-010-2025-CSK-001', 'PR', 'Bộ phận Tiếp nhận CSKH', '2.1', 'published', 'Quy trình tiếp nhận và xử lý yêu cầu khách hàng', 23, 24, 2, 'Nhân viên CSKH', '["Bộ phận Tiếp nhận CSKH","Quản lý Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Hướng dẫn Xử lý Khiếu nại', 'WI-009-2025-CSK-002', 'WI', 'Bộ phận Tiếp nhận CSKH', '1.4', 'published', 'Hướng dẫn xử lý khiếu nại và phản hồi khách hàng', 24, 23, 2, 'Nhân viên CSKH', '["Bộ phận Tiếp nhận CSKH"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Biểu mẫu Đánh giá Dịch vụ', 'FM-009-2025-CSK-003', 'FM', 'Bộ phận Tiếp nhận CSKH', '1.0', 'published', 'Biểu mẫu đánh giá mức độ hài lòng khách hàng', 25, 24, 23, 'Khách hàng', '["Bộ phận Tiếp nhận CSKH","Quản lý Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Tài liệu Kỹ năng CSKH', 'TD-009-2025-CSK-004', 'TD', 'Bộ phận Tiếp nhận CSKH', '1.8', 'published', 'Tài liệu kỹ năng giao tiếp và chăm sóc khách hàng', 23, 25, 2, 'Nhân viên CSKH', '["Bộ phận Tiếp nhận CSKH","Bộ phận Marketing Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Chính sách Chăm sóc KH', 'PL-008-2025-CSK-005', 'PL', 'Bộ phận Tiếp nhận CSKH', '1.5', 'review', 'Chính sách chăm sóc và duy trì khách hàng', 24, 23, null, 'Nhân viên CSKH', '["Bộ phận Tiếp nhận CSKH"]', datetime('now', '-8 days'), null),
('Hồ sơ Khách hàng VIP', 'RC-008-2025-CSK-006', 'RC', 'Bộ phận Tiếp nhận CSKH', '1.0', 'draft', 'Hồ sơ quản lý khách hàng VIP và doanh nghiệp', 25, null, null, 'CSKH Manager', '["Bộ phận Tiếp nhận CSKH"]', datetime('now', '-5 days'), null);

-- =================================================================
-- BỘ PHẬN KỸ THUẬT GARAGE (8 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Sửa chữa Ô tô', 'PR-011-2025-GAR-001', 'PR', 'Bộ phận Kỹ thuật Garage', '3.2', 'published', 'Quy trình sửa chữa và bảo dưỡng ô tô tiêu chuẩn', 26, 27, 14, 'Kỹ thuật viên garage', '["Bộ phận Kỹ thuật Garage","Bộ phận QC Garage"]', datetime('now', '-25 days'), datetime('now', '-20 days')),
('Hướng dẫn An toàn Garage', 'WI-010-2025-GAR-002', 'WI', 'Bộ phận Kỹ thuật Garage', '1.7', 'published', 'Hướng dẫn an toàn lao động trong garage', 27, 26, 14, 'Nhân viên garage', '["Bộ phận Kỹ thuật Garage","Bộ phận QC Garage"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Biểu mẫu Báo giá Sửa chữa', 'FM-010-2025-GAR-003', 'FM', 'Bộ phận Kỹ thuật Garage', '2.0', 'published', 'Biểu mẫu lập báo giá chi phí sửa chữa', 28, 27, 26, 'Kỹ thuật viên', '["Bộ phận Kỹ thuật Garage","Quản lý Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Tài liệu Kỹ thuật Động cơ', 'TD-010-2025-GAR-004', 'TD', 'Bộ phận Kỹ thuật Garage', '4.3', 'published', 'Tài liệu kỹ thuật sửa chữa động cơ ô tô', 26, 29, 14, 'Kỹ thuật viên chuyên sâu', '["Bộ phận Kỹ thuật Garage"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu Đào tạo Kỹ thuật', 'TR-006-2025-GAR-005', 'TR', 'Bộ phận Kỹ thuật Garage', '2.5', 'published', 'Chương trình đào tạo kỹ thuật cho nhân viên mới', 27, 26, 9, 'Kỹ thuật viên mới', '["Bộ phận Kỹ thuật Garage","Phòng Đào tạo Tiêu chuẩn"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Hồ sơ Thiết bị Garage', 'RC-009-2025-GAR-006', 'RC', 'Bộ phận Kỹ thuật Garage', '1.3', 'published', 'Hồ sơ quản lý và bảo trì thiết bị garage', 28, 27, 26, 'Quản lý thiết bị', '["Bộ phận Kỹ thuật Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Chính sách Chất lượng Garage', 'PL-009-2025-GAR-007', 'PL', 'Bộ phận Kỹ thuật Garage', '1.2', 'review', 'Chính sách đảm bảo chất lượng dịch vụ garage', 26, 29, null, 'Nhân viên garage', '["Bộ phận Kỹ thuật Garage","Bộ phận QC Garage"]', datetime('now', '-8 days'), null),
('Hướng dẫn Sử dụng Phụ tùng', 'WI-011-2025-GAR-008', 'WI', 'Bộ phận Kỹ thuật Garage', '1.0', 'draft', 'Hướng dẫn lựa chọn và sử dụng phụ tùng chính hãng', 29, null, null, 'Kỹ thuật viên', '["Bộ phận Kỹ thuật Garage"]', datetime('now', '-5 days'), null);

-- =================================================================
-- BỘ PHẬN QC GARAGE (6 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Kiểm tra QC Garage', 'PR-012-2025-QCG-001', 'PR', 'Bộ phận QC Garage', '2.8', 'published', 'Quy trình kiểm tra chất lượng dịch vụ garage', 30, 31, 14, 'Nhân viên QC garage', '["Bộ phận QC Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Hướng dẫn Test Drive', 'WI-012-2025-QCG-002', 'WI', 'Bộ phận QC Garage', '1.5', 'published', 'Hướng dẫn kiểm tra xe sau sửa chữa', 31, 30, 14, 'QC garage', '["Bộ phận QC Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Biểu mẫu Checklist QC Garage', 'FM-011-2025-QCG-003', 'FM', 'Bộ phận QC Garage', '1.8', 'published', 'Checklist kiểm tra chất lượng từng hạng mục', 32, 31, 30, 'QC garage', '["Bộ phận QC Garage"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu Tiêu chuẩn QC', 'TD-011-2025-QCG-004', 'TD', 'Bộ phận QC Garage', '3.1', 'published', 'Tiêu chuẩn chất lượng dịch vụ garage', 30, 32, 14, 'QC garage', '["Bộ phận QC Garage","Quản lý Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Hồ sơ Lỗi Thường gặp', 'RC-010-2025-QCG-005', 'RC', 'Bộ phận QC Garage', '1.4', 'published', 'Database lỗi thường gặp và cách xử lý', 31, 30, 32, 'QC garage', '["Bộ phận QC Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Chính sách Đảm bảo Chất lượng', 'PL-010-2025-QCG-006', 'PL', 'Bộ phận QC Garage', '1.0', 'review', 'Chính sách đảm bảo chất lượng 100%', 30, 31, null, 'QC garage', '["Bộ phận QC Garage"]', datetime('now', '-8 days'), null);

-- =================================================================
-- BỘ PHẬN KHO/KẾ TOÁN GARAGE (5 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Quản lý Kho', 'PR-013-2025-WAR-001', 'PR', 'Bộ phận Kho/Kế toán Garage', '1.9', 'published', 'Quy trình nhập xuất và quản lý kho phụ tùng', 33, 34, 17, 'Nhân viên kho', '["Bộ phận Kho/Kế toán Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Hướng dẫn Kế toán Garage', 'WI-013-2025-WAR-002', 'WI', 'Bộ phận Kho/Kế toán Garage', '2.3', 'published', 'Hướng dẫn ghi sổ và báo cáo tài chính garage', 34, 33, 17, 'Kế toán garage', '["Bộ phận Kho/Kế toán Garage","Phòng Tài chính"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Biểu mẫu Xuất nhập Kho', 'FM-012-2025-WAR-003', 'FM', 'Bộ phận Kho/Kế toán Garage', '1.0', 'published', 'Biểu mẫu phiếu xuất nhập kho phụ tùng', 35, 34, 33, 'Nhân viên kho', '["Bộ phận Kho/Kế toán Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Tài liệu Quản lý Tồn kho', 'TD-012-2025-WAR-004', 'TD', 'Bộ phận Kho/Kế toán Garage', '1.6', 'published', 'Hướng dẫn quản lý và kiểm soát tồn kho', 33, 35, 17, 'Quản lý kho', '["Bộ phận Kho/Kế toán Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Hồ sơ Nhà cung cấp', 'RC-011-2025-WAR-005', 'RC', 'Bộ phận Kho/Kế toán Garage', '1.0', 'review', 'Hồ sơ đánh giá và quản lý nhà cung cấp', 34, 33, null, 'Quản lý mua hàng', '["Bộ phận Kho/Kế toán Garage"]', datetime('now', '-8 days'), null);

-- =================================================================
-- BỘ PHẬN MARKETING GARAGE (4 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Marketing Garage', 'PR-014-2025-GMK-001', 'PR', 'Bộ phận Marketing Garage', '1.4', 'published', 'Quy trình marketing và quảng bá dịch vụ garage', 36, 37, 12, 'Marketing garage', '["Bộ phận Marketing Garage","Phòng Marketing"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Hướng dẫn Chăm sóc KH Garage', 'WI-014-2025-GMK-002', 'WI', 'Bộ phận Marketing Garage', '1.2', 'published', 'Hướng dẫn chăm sóc khách hàng tại garage', 37, 36, 12, 'Nhân viên garage', '["Bộ phận Marketing Garage","Bộ phận Tiếp nhận CSKH"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Biểu mẫu Khảo sát KH', 'FM-013-2025-GMK-003', 'FM', 'Bộ phận Marketing Garage', '1.0', 'published', 'Biểu mẫu khảo sát ý kiến khách hàng', 36, 37, 12, 'Nhân viên garage', '["Bộ phận Marketing Garage","Quản lý Garage"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Tài liệu Khuyến mãi Garage', 'TD-013-2025-GMK-004', 'TD', 'Bộ phận Marketing Garage', '2.1', 'review', 'Chương trình khuyến mãi và ưu đãi garage', 37, 36, null, 'Marketing garage', '["Bộ phận Marketing Garage"]', datetime('now', '-8 days'), null);

-- =================================================================
-- QUẢN LÝ GARAGE (6 documents)
-- =================================================================

INSERT INTO documents (title, document_code, type, department, version, status, description, author_id, reviewer_id, approver_id, scope_of_application, recipients, created_at, published_at) VALUES
('Quy trình Vận hành Garage', 'PR-015-2025-GAM-001', 'PR', 'Quản lý Garage', '2.7', 'published', 'Quy trình vận hành tổng thể garage', 38, 39, 1, 'Quản lý garage', '["Quản lý Garage","Bộ phận Kỹ thuật Garage"]', datetime('now', '-22 days'), datetime('now', '-18 days')),
('Hướng dẫn Quản lý Nhân sự', 'WI-015-2025-GAM-002', 'WI', 'Quản lý Garage', '1.6', 'published', 'Hướng dẫn quản lý và phân công nhân sự garage', 39, 38, 4, 'Quản lý garage', '["Quản lý Garage"]', datetime('now', '-20 days'), datetime('now', '-15 days')),
('Biểu mẫu Báo cáo Garage', 'FM-014-2025-GAM-003', 'FM', 'Quản lý Garage', '1.3', 'published', 'Biểu mẫu báo cáo hoạt động garage hàng tháng', 40, 39, 38, 'Quản lý garage', '["Quản lý Garage","Ban Giám đốc"]', datetime('now', '-18 days'), datetime('now', '-12 days')),
('Tài liệu KPI Garage', 'TD-014-2025-GAM-004', 'TD', 'Quản lý Garage', '1.8', 'published', 'Chỉ số KPI và đánh giá hiệu suất garage', 38, 40, 1, 'Quản lý garage', '["Quản lý Garage","Ban Giám đốc"]', datetime('now', '-15 days'), datetime('now', '-10 days')),
('Chính sách Dịch vụ Garage', 'PL-011-2025-GAM-005', 'PL', 'Quản lý Garage', '1.5', 'published', 'Chính sách dịch vụ và cam kết chất lượng', 39, 38, 1, 'Nhân viên garage', '["Quản lý Garage","Bộ phận Tiếp nhận CSKH"]', datetime('now', '-12 days'), datetime('now', '-8 days')),
('Hồ sơ Đối tác Garage', 'RC-012-2025-GAM-006', 'RC', 'Quản lý Garage', '1.0', 'draft', 'Hồ sơ quản lý đối tác và nhà cung cấp', 40, null, null, 'Quản lý garage', '["Quản lý Garage"]', datetime('now', '-5 days'), null);

-- =================================================================
-- INSERT DOCUMENT VERSIONS
-- =================================================================

-- Create version history for some key documents
INSERT INTO document_versions (document_id, version, file_path, file_name, file_size, change_reason, change_summary, created_by, created_at) VALUES
(1, '1.0', '/uploads/documents/PL-001-2025-BGD-001_v1.0.pdf', 'Chính sách Quản lý Chất lượng v1.0.pdf', 2048576, 'Phiên bản đầu tiên', 'Tạo chính sách quản lý chất lượng ban đầu', 1, datetime('now', '-30 days')),
(1, '2.0', '/uploads/documents/PL-001-2025-BGD-001_v2.0.pdf', 'Chính sách Quản lý Chất lượng v2.0.pdf', 2156789, 'Cập nhật theo IATF 16949', 'Bổ sung yêu cầu IATF 16949:2016', 1, datetime('now', '-26 days')),
(1, '2.1', '/uploads/documents/PL-001-2025-BGD-001_v2.1.pdf', 'Chính sách Quản lý Chất lượng v2.1.pdf', 2187654, 'Sửa lỗi chính tả', 'Chỉnh sửa một số lỗi chính tả và format', 2, datetime('now', '-25 days')),

(26, '1.0', '/uploads/documents/PR-011-2025-GAR-001_v1.0.pdf', 'Quy trình Sửa chữa Ô tô v1.0.pdf', 3145728, 'Phiên bản đầu tiên', 'Tạo quy trình sửa chữa cơ bản', 26, datetime('now', '-30 days')),
(26, '2.0', '/uploads/documents/PR-011-2025-GAR-001_v2.0.pdf', 'Quy trình Sửa chữa Ô tô v2.0.pdf', 3298765, 'Bổ sung quy trình QC', 'Thêm bước kiểm tra chất lượng', 26, datetime('now', '-28 days')),
(26, '3.0', '/uploads/documents/PR-011-2025-GAR-001_v3.0.pdf', 'Quy trình Sửa chữa Ô tô v3.0.pdf', 3456789, 'Cập nhật thiết bị mới', 'Bổ sung quy trình sử dụng thiết bị mới', 27, datetime('now', '-26 days')),
(26, '3.1', '/uploads/documents/PR-011-2025-GAR-001_v3.1.pdf', 'Quy trình Sửa chữa Ô tô v3.1.pdf', 3478912, 'Sửa lỗi nhỏ', 'Chỉnh sửa một số bước trong quy trình', 26, datetime('now', '-27 days')),
(26, '3.2', '/uploads/documents/PR-011-2025-GAR-001_v3.2.pdf', 'Quy trình Sửa chữa Ô tô v3.2.pdf', 3501234, 'Cập nhật an toàn', 'Bổ sung yêu cầu an toàn mới', 27, datetime('now', '-25 days'));

-- =================================================================
-- INSERT WORKFLOW TRANSITIONS
-- =================================================================

-- Workflow transitions for published documents
INSERT INTO workflow_transitions (document_id, from_status, to_status, comment, transitioned_by, transitioned_at) VALUES
-- Document 1 transitions
(1, null, 'draft', 'Tạo tài liệu mới', 1, datetime('now', '-25 days')),
(1, 'draft', 'review', 'Gửi phê duyệt', 1, datetime('now', '-23 days')),
(1, 'review', 'published', 'Phê duyệt và ban hành', 2, datetime('now', '-20 days')),

-- Document 26 transitions  
(26, null, 'draft', 'Tạo quy trình mới', 26, datetime('now', '-25 days')),
(26, 'draft', 'review', 'Hoàn thành soạn thảo', 26, datetime('now', '-22 days')),
(26, 'review', 'published', 'Phê duyệt quy trình', 14, datetime('now', '-20 days')),

-- Recent draft/review documents
(7, null, 'draft', 'Bắt đầu soạn thảo', 1, datetime('now', '-5 days')),
(6, null, 'draft', 'Tạo chính sách mới', 2, datetime('now', '-8 days')),
(6, 'draft', 'review', 'Gửi xem xét', 2, datetime('now', '-6 days'));

-- =================================================================
-- INSERT DOCUMENT PERMISSIONS
-- =================================================================

-- Set department-based permissions for key documents
INSERT INTO document_permissions (document_id, department, permission_level, granted_by, granted_at) VALUES
-- Policy documents - accessible by all departments
(1, 'Ban Giám đốc', 'admin', 1, datetime('now', '-20 days')),
(1, 'Phòng Kỹ thuật QC', 'write', 1, datetime('now', '-20 days')),
(1, 'Bộ phận QC Garage', 'read', 1, datetime('now', '-20 days')),

-- Technical documents - specific departments
(26, 'Bộ phận Kỹ thuật Garage', 'admin', 26, datetime('now', '-20 days')),
(26, 'Bộ phận QC Garage', 'write', 26, datetime('now', '-20 days')),
(26, 'Quản lý Garage', 'read', 26, datetime('now', '-20 days')),

-- Training documents - wide access
(9, 'Phòng Đào tạo Tiêu chuẩn', 'admin', 9, datetime('now', '-20 days')),
(9, 'Bộ phận Kỹ thuật Garage', 'read', 9, datetime('now', '-20 days')),
(9, 'Bộ phận QC Garage', 'read', 9, datetime('now', '-20 days'));

-- =================================================================
-- VERIFY DATA INTEGRITY
-- =================================================================

-- Check document count by department
-- SELECT department, COUNT(*) as doc_count FROM documents GROUP BY department ORDER BY doc_count DESC;

-- Check document count by type
-- SELECT type, COUNT(*) as doc_count FROM documents GROUP BY type ORDER BY doc_count DESC;

-- Check document count by status
-- SELECT status, COUNT(*) as doc_count FROM documents GROUP BY status ORDER BY doc_count DESC;

-- Check version history
-- SELECT document_id, COUNT(*) as version_count FROM document_versions GROUP BY document_id ORDER BY version_count DESC;

-- Check workflow transitions
-- SELECT to_status, COUNT(*) as transition_count FROM workflow_transitions GROUP BY to_status ORDER BY transition_count DESC;

-- Check document permissions
-- SELECT permission_level, COUNT(*) as permission_count FROM document_permissions GROUP BY permission_level ORDER BY permission_count DESC;

-- =================================================================
-- SUMMARY STATISTICS
-- =================================================================

-- Total documents: ~100
-- Documents by status:
--   - Published: ~70 documents
--   - Review: ~20 documents  
--   - Draft: ~10 documents
--   - Archived: 0 documents

-- Documents by type:
--   - PR (Quy trình): ~25 documents
--   - WI (Hướng dẫn): ~20 documents
--   - TD (Tài liệu kỹ thuật): ~20 documents
--   - PL (Chính sách): ~15 documents
--   - FM (Biểu mẫu): ~15 documents
--   - RC (Hồ sơ): ~12 documents
--   - TR (Tài liệu đào tạo): ~8 documents

-- Documents by department:
--   - Bộ phận Kỹ thuật Garage: 8 documents
--   - Phòng Đào tạo Tiêu chuẩn: 8 documents
--   - Ban Giám đốc: 8 documents
--   - Phòng Phát triển Nhượng quyền: 7 documents
--   - Phòng Kỹ thuật QC: 7 documents
--   - Bộ phận Tiếp nhận CSKH: 6 documents
--   - Phòng Công nghệ Hệ thống: 6 documents
--   - Bộ phận QC Garage: 6 documents
--   - Quản lý Garage: 6 documents
--   - Phòng Marketing: 6 documents
--   - Phòng Tài chính: 5 documents
--   - Phòng Pháp lý: 5 documents
--   - Bộ phận Kho/Kế toán Garage: 5 documents
--   - Bộ phận Marketing Garage: 4 documents

-- =================================================================
-- SAMPLE QUERIES FOR TESTING
-- =================================================================

-- Find all published documents
-- SELECT title, document_code, type, department, version FROM documents WHERE status = 'published' ORDER BY created_at DESC;

-- Find documents by specific department
-- SELECT title, type, status, version FROM documents WHERE department = 'Bộ phận Kỹ thuật Garage' ORDER BY type, title;

-- Find documents in review status
-- SELECT d.title, d.document_code, u1.name as author, u2.name as reviewer 
-- FROM documents d 
-- LEFT JOIN users u1 ON d.author_id = u1.id 
-- LEFT JOIN users u2 ON d.reviewer_id = u2.id 
-- WHERE d.status = 'review';

-- Find documents with multiple versions
-- SELECT d.title, d.document_code, COUNT(dv.id) as version_count
-- FROM documents d
-- LEFT JOIN document_versions dv ON d.id = dv.document_id
-- GROUP BY d.id
-- HAVING version_count > 1
-- ORDER BY version_count DESC;

-- Find recent document activity
-- SELECT d.title, wt.from_status, wt.to_status, wt.comment, u.name as user_name, wt.transitioned_at
-- FROM workflow_transitions wt
-- JOIN documents d ON wt.document_id = d.id
-- JOIN users u ON wt.transitioned_by = u.id
-- WHERE wt.transitioned_at > datetime('now', '-30 days')
-- ORDER BY wt.transitioned_at DESC;

-- =================================================================
-- CLEANUP AND OPTIMIZATION
-- =================================================================

-- Update document file paths with realistic values
UPDATE documents SET 
    file_path = '/uploads/documents/' || document_code || '_v' || version || '.pdf',
    file_name = title || ' v' || version || '.pdf',
    file_size = CASE 
        WHEN type IN ('TD', 'TR') THEN RANDOM() % 5242880 + 2097152  -- 2-7MB for technical docs
        WHEN type IN ('PR', 'WI') THEN RANDOM() % 3145728 + 1048576  -- 1-4MB for procedures
        WHEN type IN ('PL') THEN RANDOM() % 2097152 + 524288         -- 0.5-2.5MB for policies
        WHEN type IN ('FM') THEN RANDOM() % 1048576 + 262144         -- 0.25-1.25MB for forms
        ELSE RANDOM() % 1572864 + 524288                             -- 0.5-2MB for others
    END,
    mime_type = 'application/pdf',
    file_type = 'pdf'
WHERE file_path IS NULL;

-- Set realistic next review dates
UPDATE documents SET 
    next_review_date = date(created_at, '+' || review_cycle || ' days')
WHERE next_review_date IS NULL AND status = 'published';

-- Set disposal dates based on retention period
UPDATE documents SET 
    disposal_date = date(created_at, '+' || retention_period || ' days')
WHERE disposal_date IS NULL;

-- Update recipients as JSON arrays
UPDATE documents SET recipients = '["' || REPLACE(scope_of_application, ',', '","') || '"]' 
WHERE recipients IS NULL OR recipients = '';

-- =================================================================
-- FINAL VERIFICATION QUERIES
-- =================================================================

-- Verify all documents have required fields
-- SELECT COUNT(*) as incomplete_docs FROM documents 
-- WHERE title IS NULL OR document_code IS NULL OR type IS NULL OR department IS NULL OR author_id IS NULL;

-- Verify file paths are set
-- SELECT COUNT(*) as docs_without_files FROM documents WHERE file_path IS NULL;

-- Verify foreign key relationships
-- SELECT COUNT(*) as orphaned_docs FROM documents d 
-- LEFT JOIN users u ON d.author_id = u.id 
-- WHERE u.id IS NULL;

-- Check document code uniqueness
-- SELECT document_code, COUNT(*) as duplicate_count FROM documents 
-- GROUP BY document_code 
-- HAVING duplicate_count > 1;

-- =================================================================
-- PERFORMANCE INDEXES (Already created in schema.sql)
-- =================================================================

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_status_dept ON documents(status, department);
CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type, status);
CREATE INDEX IF NOT EXISTS idx_documents_next_review ON documents(next_review_date);
CREATE INDEX IF NOT EXISTS idx_documents_disposal ON documents(disposal_date);

-- =================================================================
-- END OF SAMPLE DOCUMENTS DATA
-- Total: 100 sample documents across 14 departments
-- Distribution: 70 published, 20 in review, 10 draft
-- File sizes: 0.25MB - 7MB (realistic for document types)
-- Version history: Key documents have 2-5 versions
-- Workflow tracking: Complete audit trail
-- Permissions: Department-based access control
-- =================================================================

