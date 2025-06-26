Trung Tâm Tài Liệu - 1CAR EDMS
Phiên bản: 1.0.0
Ngày cập nhật: 26/06/2025
Trạng thái: Production Ready
Tuân thủ: IATF 16949, 8 Tiêu chuẩn Nội bộ 1CAR

📋 Tổng Quan
Chào mừng bạn đến với trung tâm tài liệu toàn diện của dự án 1CAR-EDMS. Toàn bộ tài liệu được tổ chức một cách có hệ thống để cung cấp cái nhìn chi tiết về mọi khía cạnh của dự án, từ kiến trúc hệ thống đến hướng dẫn người dùng cuối.

Hệ thống được thiết kế để hỗ trợ 40 người dùng thuộc 14 phòng ban với 7 loại tài liệu chính, tuân thủ tiêu chuẩn IATF 16949 và các quy trình chất lượng nội bộ của 1CAR.

🎯 Tính Năng Chính
✅ Quản lý Tài liệu: Hỗ trợ 7 loại tài liệu: PL, PR, WI, FM, TD, TR, RC.
✅ Kiểm soát Phiên bản: Tuân thủ quy trình C-PR-VM-001.
✅ Quy trình Phê duyệt: Workflow 4 trạng thái (Draft, Pending, Approved, Rejected).
✅ Phân quyền Chi tiết: Kiểm soát truy cập dựa trên vai trò (RBAC) và phòng ban.
✅ Dấu vết Kiểm toán: Ghi lại mọi hoạt động quan trọng, tuân thủ IATF 16949.
✅ Tìm kiếm Nâng cao: Tìm kiếm toàn văn bản và lọc theo nhiều tiêu chí.
✅ Lưu trữ An toàn: Quy trình lưu trữ và archival theo C-PR-AR-001.

🏗️ Kiến Trúc Công Nghệ
Backend: Node.js, Express.js
Frontend: React 18, React Router, Tailwind CSS
Cơ sở dữ liệu: SQLite
Xác thực: JWT (JSON Web Token) với RBAC
Kiểm thử: Jest, Supertest

📚 Cấu Trúc Tài Liệu
Tài liệu được chia thành 11 nhóm chính với 34 modules để dễ dàng quản lý và cập nhật.

🏛️ 1. Hệ thống Lõi & Kiến trúc

00. Tổng quan Hệ thống và Kiến trúc
Mô tả: Tổng quan hệ thống, kiến trúc tổng thể, và các thành phần chính.
Cập nhật khi: Thay đổi công nghệ core, kiến trúc tổng thể, yêu cầu về năng lực hệ thống.
Liên quan: Tất cả các module khác.

⚖️ 2. Tiêu chuẩn Tuân thủ

01. Quy trình Quản lý Phiên bản (C-PR-VM-001)
Mô tả: Quy trình quản lý phiên bản tài liệu.
Cập nhật khi: Thay đổi logic đánh số phiên bản, quản lý phiên bản API.
Liên quan: 18_Database_Schema, 16_API_Documentation, 20_Testing_Strategy.

02. Biểu mẫu Lịch sử Phiên bản (C-TD-VM-001)
Mô tả: Template và cấu trúc lịch sử phiên bản.
Cập nhật khi: Thay đổi cấu trúc metadata, logic theo dõi phiên bản.
Liên quan: 01_Compliance_C-PR-VM-001, 18_Database_Schema.

03. Quy trình Lưu trữ (C-PR-AR-001)
Mô tả: Quy trình lưu trữ và xử lý tài liệu hết hạn.
Cập nhật khi: Thay đổi chính sách lưu giữ, tự động hóa lưu trữ.
Liên quan: 04_Compliance_C-WI-AR-001, 23_System_Monitoring.

04. Hướng dẫn Truy cập Lưu trữ (C-WI-AR-001)
Mô tả: Hướng dẫn truy xuất tài liệu đã lưu trữ.
Cập nhật khi: Cập nhật thuật toán tìm kiếm, kiểm soát truy cập cho tài liệu lưu trữ.
Liên quan: 11_Design_Thinking_Search, 05_Compliance_C-PL-MG-005.

05. Chính sách Phân quyền (C-PL-MG-005)
Mô tả: Chính sách phân quyền và triển khai RBAC.
Cập nhật khi: Thay đổi quyền của vai trò, chính sách bảo mật.
Liên quan: 06_Compliance_C-FM-MG-004, 09_Design_Thinking_Authentication.

06. Ma trận Phân quyền Vai trò (C-FM-MG-004)
Mô tả: Ma trận phân quyền chi tiết cho 14 phòng ban.
Cập nhật khi: Thay đổi cấu trúc tổ chức, thêm/bớt phòng ban.
Liên quan: 05_Compliance_C-PL-MG-005, 25_User_Guide_System_Administrator.

07. Quy trình Quản lý Truy cập (C-PR-MG-003)
Mô tả: Quy trình quản lý truy cập hệ thống.
Cập nhật khi: Cập nhật luồng xác thực, cấp phát người dùng.
Liên quan: 09_Design_Thinking_Authentication, 26_User_Guide_Department_Manager.

08. Tiêu chuẩn Mã Tài liệu (C-TD-MG-005)
Mô tả: Chuẩn mã tài liệu và 7 loại tài liệu.
Cập nhật khi: Thêm loại tài liệu mới, thay đổi quy ước đặt tên.
Liên quan: 10_Design_Thinking_Document_Management, 18_Database_Schema.

🎨 3. Tư duy Thiết kế & Trải nghiệm Người dùng (UX)

09. Hệ thống Xác thực
Mô tả: Thiết kế UX cho hệ thống xác thực.
Cập nhật khi: Thay đổi phương thức xác thực, cải tiến UI/UX.
Liên quan: 05_Compliance_C-PL-MG-005, 13_UI_Detailed_Layouts.

10. Quản lý Tài liệu
Mô tả: Thiết kế UX cho quản lý vòng đời tài liệu.
Cập nhật khi: Cập nhật quy trình tài liệu, thiết kế lại UI.
Liên quan: 12_Design_Thinking_Workflow, 27_User_Guide_Employee.

11. Tìm kiếm và Khám phá
Mô tả: Thiết kế UX cho tính năng tìm kiếm và khám phá.
Cập nhật khi: Thêm tìm kiếm AI, bộ lọc nâng cao, phân tích tìm kiếm.
Liên quan: 04_Compliance_C-WI-AR-001, 21_Performance_Testing.

12. Quản lý Luồng công việc (Workflow)
Mô tả: Thiết kế UX cho quy trình phê duyệt.
Cập nhật khi: Thay đổi quy trình phê duyệt, tối ưu hóa quy trình.
Liên quan: 01_Compliance_C-PR-VM-001, 26_User_Guide_Department_Manager.

🖥️ 4. Thiết kế Giao diện & Tương tác (UI)

13. Bố cục Chi tiết và Luồng Tương tác
Mô tả: Chi tiết bố cục màn hình và luồng người dùng.
Cập nhật khi: Thiết kế lại UI, cập nhật thiết kế responsive, cải thiện khả năng truy cập.
Liên quan: 14_Frontend_Component_Architecture, 09-12_Design_Thinking.

14. Kiến trúc Component Frontend
Mô tả: Kiến trúc component React và quản lý state.
Cập nhật khi: Thay đổi cấu trúc component, chiến lược quản lý state.
Liên quan: 15_Code_Modification_Guidelines, 20_Testing_Strategy.

💻 5. Phát triển & Triển khai

15. Hướng dẫn Chỉnh sửa Mã nguồn
Mô tả: Hướng dẫn phát triển và tiêu chuẩn mã nguồn.
Cập nhật khi: Thay đổi tiêu chuẩn mã nguồn, cấu trúc dự án, quy trình phát triển.
Liên quan: 16_API_Documentation, 17_Environment_Configuration.

16. Tài liệu API và Tham chiếu chéo
Mô tả: Tài liệu API và tham chiếu chéo.
Cập nhật khi: Thêm/sửa các điểm cuối API, cập nhật tài liệu API.
Liên quan: 30_API_Reference_Complete, 01-08_Compliance.

17. Cấu hình Môi trường
Mô tả: Biến môi trường và cấu hình triển khai.
Cập nhật khi: Thêm biến môi trường mới, cập nhật cấu hình triển khai.
Liên quan: 22_Scalability_Future_Roadmap, 23_System_Monitoring.

🗄️ 6. Cơ sở dữ liệu & Quản lý Dữ liệu

18. Lược đồ CSDL và các Mối quan hệ
Mô tả: Lược đồ SQLite và ánh xạ mối quan hệ.
Cập nhật khi: Thay đổi lược đồ, bảng mới, sửa đổi mối quan hệ.
Liên quan: 19_Data_Migration, 01-08_Compliance.

19. Di chuyển và Khởi tạo Dữ liệu (Migration & Seeding)
Mô tả: Các script di chuyển và dữ liệu mẫu.
Cập nhật khi: Script di chuyển mới, cập nhật dữ liệu mẫu.
Liên quan: 18_Database_Schema, 34_Change_Management.

🧪 7. Kiểm thử & Đảm bảo Chất lượng (QA)

20. Chiến lược và Triển khai Kiểm thử
Mô tả: Framework kiểm thử và triển khai.
Cập nhật khi: Trường hợp kiểm thử mới, cập nhật framework kiểm thử, thay đổi CI/CD.
Liên quan: 21_Performance_Testing, 15_Code_Modification_Guidelines.

21. Kiểm thử Hiệu năng và Tối ưu hóa
Mô tả: Kiểm thử hiệu năng và các chiến lược tối ưu hóa.
Cập nhật khi: Thay đổi mục tiêu hiệu năng, kỹ thuật tối ưu hóa mới.
Liên quan: 22_Scalability_Future_Roadmap, 23_System_Monitoring.

🔧 8. Vận hành & Bảo trì

22. Khả năng Mở rộng và Lộ trình Phát triển
Mô tả: Kế hoạch mở rộng và lộ trình tương lai.
Cập nhật khi: Thay đổi lộ trình, tích hợp công nghệ mới.
Liên quan: 32_Third_Party_Integrations, 33_Plugin_Extension_Framework.

23. Giám sát và Bảo trì Hệ thống
Mô tả: Giám sát hệ thống và các quy trình bảo trì.
Cập nhật khi: Thay đổi công cụ giám sát, cập nhật quy trình bảo trì.
Liên quan: 24_Security_Compliance_Operations, 31_Troubleshooting_FAQ.

24. Vận hành Bảo mật và Tuân thủ
Mô tả: Vận hành bảo mật và giám sát tuân thủ.
Cập nhật khi: Thay đổi chính sách bảo mật, yêu cầu tuân thủ mới.
Liên quan: 05_Compliance_C-PL-MG-005, 06_Compliance_C-FM-MG-004.

👥 9. Tài liệu Hướng dẫn Người dùng

25. Hướng dẫn cho Quản trị viên Hệ thống
Mô tả: Hướng dẫn cho Quản trị viên Hệ thống.
Cập nhật khi: Tính năng quản trị mới, thay đổi UI ảnh hưởng đến người dùng quản trị.
Liên quan: 23_System_Monitoring, 24_Security_Compliance_Operations.

26. Hướng dẫn cho Trưởng phòng
Mô tả: Hướng dẫn cho Trưởng phòng.
Cập nhật khi: Thay đổi trong quy trình phê duyệt, các tính năng dành riêng cho người quản lý.
Liên quan: 12_Design_Thinking_Workflow, 06_Compliance_C-FM-MG-004.

27. Hướng dẫn cho Nhân viên
Mô tả: Hướng dẫn cho Nhân viên.
Cập nhật khi: Thay đổi UI, tính năng tài liệu mới.
Liên quan: 10_Design_Thinking_Document_Management, 11_Design_Thinking_Search.

28. Hướng dẫn cho Người dùng Khách
Mô tả: Hướng dẫn cho Người dùng Khách.
Cập nhật khi: Thay đổi trong quyền truy cập tài liệu công khai, quyền của khách.
Liên quan: 05_Compliance_C-PL-MG-005, 04_Compliance_C-WI-AR-001.

📖 10. Tham khảo & Phụ lục

29. Bảng chú giải Thuật ngữ
Mô tả: Bảng chú giải và định nghĩa thuật ngữ.
Cập nhật khi: Thuật ngữ mới, cập nhật định nghĩa.
Liên quan: Tất cả các module khác.

30. Toàn bộ Tham chiếu API
Mô tả: Toàn bộ tài liệu tham chiếu API.
Cập nhật khi: Thay đổi API, điểm cuối mới, điểm cuối không còn được dùng.
Liên quan: 16_API_Documentation, 32_Third_Party_Integrations.

31. Gỡ lỗi và Câu hỏi thường gặp (FAQ)
Mô tả: Hướng dẫn khắc phục sự cố và câu hỏi thường gặp.
Cập nhật khi: Phát hiện vấn đề mới, cập nhật giải pháp.
Liên quan: 23_System_Monitoring, 25-28_User_Guides.

🔗 11. Tích hợp & Mở rộng

32. Tích hợp với Bên thứ ba
Mô tả: Tích hợp với bên thứ ba (SAP, Email, v.v.).
Cập nhật khi: Tích hợp mới, thay đổi API từ bên thứ ba.
Liên quan: 22_Scalability_Future_Roadmap, 17_Environment_Configuration.

33. Framework cho Plugin và Mở rộng
Mô tả: Framework plugin và khả năng mở rộng.
Cập nhật khi: Điểm mở rộng mới, thay đổi kiến trúc plugin.
Liên quan: 14_Frontend_Component_Architecture, 15_Code_Modification_Guidelines.

34. Quản lý Thay đổi và Phiên bản
Mô tả: Quy trình quản lý thay đổi và phiên bản hệ thống.
Cập nhật khi: Thay đổi quy trình, cập nhật chiến lược phiên bản.
Liên quan: 01_Compliance_C-PR-VM-001, 19_Data_Migration.

🚀 Hướng dẫn nhanh

Dành cho Lập trình viên:
Đọc Tổng quan Hệ thống và Kiến trúc.
Xem Hướng dẫn Chỉnh sửa Mã nguồn.
Tham khảo Tài liệu API.

Dành cho Quản trị viên Hệ thống:
Bắt đầu với Hướng dẫn cho Quản trị viên Hệ thống.
Nắm rõ Quy trình Quản lý Truy cập.
Thiết lập giám sát theo Giám sát và Bảo trì Hệ thống.

Tài liệu này được tạo và duy trì bởi 1CAR Development Team. Để đóng góp hoặc báo cáo lỗi, vui lòng tham khảo Quy trình Quản lý Thay đổi và Phiên bản.