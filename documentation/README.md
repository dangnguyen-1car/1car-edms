# 1CAR - EDMS Documentation Hub
## Hệ Thống Quản Lý Tài Liệu Điện Tử cho 1CAR

**Phiên bản:** 1.0.0  
**Ngày cập nhật:** 26 tháng 5, 2025  
**Tình trạng:** Production Ready  
**Tuân thủ:** IATF 16949, 8 tiêu chuẩn nội bộ 1CAR  

---

## 📋 Tổng Quan Hệ Thống

1CAR - EDMS là hệ thống quản lý tài liệu điện tử được thiết kế đặc biệt cho 1CAR, hỗ trợ **40 người dùng** đồng thời với **14 phòng ban** và **7 loại tài liệu**. Hệ thống tuân thủ đầy đủ tiêu chuẩn IATF 16949 và các quy trình nội bộ của 1CAR.

### 🎯 Tính Năng Chính
- ✅ Quản lý 7 loại tài liệu: PL, PR, WI, FM, TD, TR, RC
- ✅ Kiểm soát phiên bản theo C-PR-VM-001
- ✅ Quy trình workflow 4 trạng thái
- ✅ Phân quyền theo vai trò và phòng ban
- ✅ Audit logging tuân thủ IATF 16949
- ✅ Tìm kiếm và lọc nâng cao
- ✅ Lưu trữ và archival theo C-PR-AR-001

### 🏗️ Kiến Trúc Công Nghệ
- **Backend**: Node.js + Express.js + SQLite
- **Frontend**: React 18 + Tailwind CSS
- **Authentication**: JWT-based với RBAC
- **Database**: SQLite với 7 tables chính
- **Deployment**: Docker-ready với CI/CD

---

## 📚 Cấu Trúc Tài Liệu

Tài liệu được chia thành **11 nhóm chính** với **34 modules** để dễ dàng quản lý và cập nhật:

---

## 🏛️ 1. Core System & Architecture

### [`00_System_Overview_and_Architecture.md`](./00_System_Overview_and_Architecture.md)
**Mô tả:** Tổng quan hệ thống, kiến trúc tổng thể, và các thành phần chính  
**Cập nhật khi:** Thay đổi công nghệ core, kiến trúc tổng thể, capacity requirements  
**Liên quan:** Tất cả modules khác  

---

## ⚖️ 2. Compliance Standards

### [`01_Compliance_C-PR-VM-001_Version_Management.md`](./01_Compliance_C-PR-VM-001_Version_Management.md)
**Mô tả:** Quy trình quản lý phiên bản tài liệu  
**Cập nhật khi:** Thay đổi logic version numbering, API version management  
**Liên quan:** `18_Database_Schema`, `16_API_Documentation`, `20_Testing_Strategy`  

### [`02_Compliance_C-TD-VM-001_Version_History_Template.md`](./02_Compliance_C-TD-VM-001_Version_History_Template.md)
**Mô tả:** Template và cấu trúc lịch sử phiên bản  
**Cập nhật khi:** Thay đổi cấu trúc metadata, version tracking logic  
**Liên quan:** `01_Compliance_C-PR-VM-001`, `18_Database_Schema`  

### [`03_Compliance_C-PR-AR-001_Archive_Process.md`](./03_Compliance_C-PR-AR-001_Archive_Process.md)
**Mô tả:** Quy trình lưu trữ và disposal tài liệu  
**Cập nhật khi:** Thay đổi retention policies, archive automation  
**Liên quan:** `04_Compliance_C-WI-AR-001`, `23_System_Monitoring`  

### [`04_Compliance_C-WI-AR-001_Archive_Access_Guide.md`](./04_Compliance_C-WI-AR-001_Archive_Access_Guide.md)
**Mô tả:** Hướng dẫn truy xuất tài liệu lưu trữ  
**Cập nhật khi:** Cập nhật search algorithms, access control cho archived documents  
**Liên quan:** `11_Design_Thinking_Search`, `05_Compliance_C-PL-MG-005`  

### [`05_Compliance_C-PL-MG-005_Authorization_Policy.md`](./05_Compliance_C-PL-MG-005_Authorization_Policy.md)
**Mô tả:** Chính sách phân quyền và RBAC implementation  
**Cập nhật khi:** Thay đổi role permissions, security policies  
**Liên quan:** `06_Compliance_C-FM-MG-004`, `09_Design_Thinking_Authentication`  

### [`06_Compliance_C-FM-MG-004_Role_Permission_Matrix.md`](./06_Compliance_C-FM-MG-004_Role_Permission_Matrix.md)
**Mô tả:** Ma trận phân quyền chi tiết cho 14 phòng ban  
**Cập nhật khi:** Thay đổi cấu trúc tổ chức, thêm/bớt phòng ban  
**Liên quan:** `05_Compliance_C-PL-MG-005`, `25_User_Guide_System_Administrator`  

### [`07_Compliance_C-PR-MG-003_Access_Management_Process.md`](./07_Compliance_C-PR-MG-003_Access_Management_Process.md)
**Mô tả:** Quy trình quản lý truy cập hệ thống  
**Cập nhật khi:** Cập nhật authentication flow, user provisioning  
**Liên quan:** `09_Design_Thinking_Authentication`, `26_User_Guide_Department_Manager`  

### [`08_Compliance_C-TD-MG-005_Document_Code_Standards.md`](./08_Compliance_C-TD-MG-005_Document_Code_Standards.md)
**Mô tả:** Chuẩn mã tài liệu và 7 loại tài liệu  
**Cập nhật khi:** Thêm loại tài liệu mới, thay đổi naming convention  
**Liên quan:** `10_Design_Thinking_Document_Management`, `18_Database_Schema`  

---

## 🎨 3. Design Thinking & User Experience

### [`09_Design_Thinking_Authentication_System.md`](./09_Design_Thinking_Authentication_System.md)
**Mô tả:** UX design cho hệ thống authentication  
**Cập nhật khi:** Thay đổi authentication method, UI/UX improvements  
**Liên quan:** `05_Compliance_C-PL-MG-005`, `13_UI_Detailed_Layouts`  

### [`10_Design_Thinking_Document_Management.md`](./10_Design_Thinking_Document_Management.md)
**Mô tả:** UX design cho document lifecycle management  
**Cập nhật khi:** Cập nhật document workflow, UI redesign  
**Liên quan:** `12_Design_Thinking_Workflow`, `27_User_Guide_Employee`  

### [`11_Design_Thinking_Search_and_Discovery.md`](./11_Design_Thinking_Search_and_Discovery.md)
**Mô tả:** UX design cho search và discovery features  
**Cập nhật khi:** Thêm AI search, advanced filtering, search analytics  
**Liên quan:** `04_Compliance_C-WI-AR-001`, `21_Performance_Testing`  

### [`12_Design_Thinking_Workflow_Management.md`](./12_Design_Thinking_Workflow_Management.md)
**Mô tả:** UX design cho approval workflow  
**Cập nhật khi:** Thay đổi approval process, workflow optimization  
**Liên quan:** `01_Compliance_C-PR-VM-001`, `26_User_Guide_Department_Manager`  

---

## 🖥️ 4. User Interface & Interaction Design

### [`13_UI_Detailed_Layouts_and_Flows.md`](./13_UI_Detailed_Layouts_and_Flows.md)
**Mô tả:** Chi tiết bố cục màn hình và user flows  
**Cập nhật khi:** UI redesign, responsive design updates, accessibility improvements  
**Liên quan:** `14_Frontend_Component_Architecture`, `09-12_Design_Thinking`  

### [`14_Frontend_Component_Architecture.md`](./14_Frontend_Component_Architecture.md)
**Mô tả:** Kiến trúc component React và state management  
**Cập nhật khi:** Thay đổi component structure, state management strategy  
**Liên quan:** `15_Code_Modification_Guidelines`, `20_Testing_Strategy`  

---

## 💻 5. Development & Implementation

### [`15_Code_Modification_Guidelines.md`](./15_Code_Modification_Guidelines.md)
**Mô tả:** Hướng dẫn development và coding standards  
**Cập nhật khi:** Thay đổi coding standards, project structure, development workflow  
**Liên quan:** `16_API_Documentation`, `17_Environment_Configuration`  

### [`16_API_Documentation_and_Cross_References.md`](./16_API_Documentation_and_Cross_References.md)
**Mô tả:** API documentation và cross-references  
**Cập nhật khi:** Thêm/sửa API endpoints, cập nhật API documentation  
**Liên quan:** `30_API_Reference_Complete`, `01-08_Compliance`  

### [`17_Environment_Configuration.md`](./17_Environment_Configuration.md)
**Mô tả:** Environment variables và deployment configuration  
**Cập nhật khi:** Thêm environment variables mới, cập nhật deployment configs  
**Liên quan:** `22_Scalability_Future_Roadmap`, `23_System_Monitoring`  

---

## 🗄️ 6. Database & Data Management

### [`18_Database_Schema_and_Relationships.md`](./18_Database_Schema_and_Relationships.md)
**Mô tả:** SQLite schema và relationship mapping  
**Cập nhật khi:** Schema changes, new tables, relationship modifications  
**Liên quan:** `19_Data_Migration`, `01-08_Compliance`  

### [`19_Data_Migration_and_Seeding.md`](./19_Data_Migration_and_Seeding.md)
**Mô tả:** Migration scripts và seed data  
**Cập nhật khi:** New migration scripts, updated seed data  
**Liên quan:** `18_Database_Schema`, `34_Change_Management`  

---

## 🧪 7. Testing & Quality Assurance

### [`20_Testing_Strategy_and_Implementation.md`](./20_Testing_Strategy_and_Implementation.md)
**Mô tả:** Testing framework và implementation  
**Cập nhật khi:** New test cases, testing framework updates, CI/CD changes  
**Liên quan:** `21_Performance_Testing`, `15_Code_Modification_Guidelines`  

### [`21_Performance_Testing_and_Optimization.md`](./21_Performance_Testing_and_Optimization.md)
**Mô tả:** Performance testing và optimization strategies  
**Cập nhật khi:** Performance targets changes, new optimization techniques  
**Liên quan:** `22_Scalability_Future_Roadmap`, `23_System_Monitoring`  

---

## 🔧 8. Operations & Maintenance

### [`22_Scalability_and_Future_Roadmap.md`](./22_Scalability_and_Future_Roadmap.md)
**Mô tả:** Scalability planning và future roadmap  
**Cập nhật khi:** Roadmap changes, new technology integrations  
**Liên quan:** `32_Third_Party_Integrations`, `33_Plugin_Extension_Framework`  

### [`23_System_Monitoring_and_Maintenance.md`](./23_System_Monitoring_and_Maintenance.md)
**Mô tả:** System monitoring và maintenance procedures  
**Cập nhật khi:** Monitoring tools changes, maintenance procedures updates  
**Liên quan:** `24_Security_Compliance_Operations`, `31_Troubleshooting_FAQ`  

### [`24_Security_and_Compliance_Operations.md`](./24_Security_and_Compliance_Operations.md)
**Mô tả:** Security operations và compliance monitoring  
**Cập nhật khi:** Security policy changes, new compliance requirements  
**Liên quan:** `05_Compliance_C-PL-MG-005`, `06_Compliance_C-FM-MG-004`  

---

## 👥 9. User Documentation

### [`25_User_Guide_System_Administrator.md`](./25_User_Guide_System_Administrator.md)
**Mô tả:** Hướng dẫn cho System Administrator  
**Cập nhật khi:** New admin features, UI changes affecting admin users  
**Liên quan:** `23_System_Monitoring`, `24_Security_Compliance_Operations`  

### [`26_User_Guide_Department_Manager.md`](./26_User_Guide_Department_Manager.md)
**Mô tả:** Hướng dẫn cho Department Manager  
**Cập nhật khi:** Changes in approval workflow, manager-specific features  
**Liên quan:** `12_Design_Thinking_Workflow`, `06_Compliance_C-FM-MG-004`  

### [`27_User_Guide_Employee_User.md`](./27_User_Guide_Employee_User.md)
**Mô tả:** Hướng dẫn cho Employee User  
**Cập nhật khi:** UI changes, new document features  
**Liên quan:** `10_Design_Thinking_Document_Management`, `11_Design_Thinking_Search`  

### [`28_User_Guide_Guest_User.md`](./28_User_Guide_Guest_User.md)
**Mô tả:** Hướng dẫn cho Guest User  
**Cập nhật khi:** Changes in public document access, guest permissions  
**Liên quan:** `05_Compliance_C-PL-MG-005`, `04_Compliance_C-WI-AR-001`  

---

## 📖 10. Reference & Appendices

### [`29_Glossary_and_Terminology.md`](./29_Glossary_and_Terminology.md)
**Mô tả:** Glossary và terminology definitions  
**Cập nhật khi:** New terms, updated definitions  
**Liên quan:** Tất cả modules khác  

### [`30_API_Reference_Complete.md`](./30_API_Reference_Complete.md)
**Mô tả:** Complete API reference documentation  
**Cập nhật khi:** API changes, new endpoints, deprecated endpoints  
**Liên quan:** `16_API_Documentation`, `32_Third_Party_Integrations`  

### [`31_Troubleshooting_and_FAQ.md`](./31_Troubleshooting_and_FAQ.md)
**Mô tả:** Troubleshooting guide và FAQ  
**Cập nhật khi:** New issues discovered, solution updates  
**Liên quan:** `23_System_Monitoring`, `25-28_User_Guides`  

---

## 🔗 11. Integration & Extensions

### [`32_Third_Party_Integrations.md`](./32_Third_Party_Integrations.md)
**Mô tả:** Third-party integrations (SAP, Email, etc.)  
**Cập nhật khi:** New integrations, API changes from third parties  
**Liên quan:** `22_Scalability_Future_Roadmap`, `17_Environment_Configuration`  

### [`33_Plugin_and_Extension_Framework.md`](./33_Plugin_and_Extension_Framework.md)
**Mô tả:** Plugin framework và extension capabilities  
**Cập nhật khi:** New extension points, plugin architecture changes  
**Liên quan:** `14_Frontend_Component_Architecture`, `15_Code_Modification_Guidelines`  

### [`34_Change_Management_and_Versioning.md`](./34_Change_Management_and_Versioning.md)
**Mô tả:** Change management process và system versioning  
**Cập nhật khi:** Process changes, versioning strategy updates  
**Liên quan:** `01_Compliance_C-PR-VM-001`, `19_Data_Migration`  

---

## 🚀 Quick Start Guide

### Cho Developers
1. Đọc [`00_System_Overview_and_Architecture.md`](./00_System_Overview_and_Architecture.md)
2. Xem [`15_Code_Modification_Guidelines.md`](./15_Code_Modification_Guidelines.md)
3. Thiết lập environment theo [`17_Environment_Configuration.md`](./17_Environment_Configuration.md)
4. Chạy tests theo [`20_Testing_Strategy_and_Implementation.md`](./20_Testing_Strategy_and_Implementation.md)

### Cho System Administrators
1. Đọc [`25_User_Guide_System_Administrator.md`](./25_User_Guide_System_Administrator.md)
2. Thiết lập monitoring theo [`23_System_Monitoring_and_Maintenance.md`](./23_System_Monitoring_and_Maintenance.md)
3. Cấu hình security theo [`24_Security_and_Compliance_Operations.md`](./24_Security_and_Compliance_Operations.md)

### Cho End Users
1. Chọn user guide phù hợp: [`25-28_User_Guide_*.md`](./25_User_Guide_System_Administrator.md)
2. Tham khảo [`29_Glossary_and_Terminology.md`](./29_Glossary_and_Terminology.md) khi cần
3. Xem [`31_Troubleshooting_and_FAQ.md`](./31_Troubleshooting_and_FAQ.md) khi gặp vấn đề

---

## 📊 Document Maintenance Matrix

| Module Group | Update Frequency | Owner | Dependencies |
|--------------|------------------|-------|--------------|
| Core System & Architecture | Quarterly | Tech Lead | All modules |
| Compliance Standards | As needed | Compliance Officer | Testing, Database |
| Design Thinking & UX | Monthly | UX Designer | UI, User Guides |
| Development & Implementation | Weekly | Development Team | Testing, Database |
| Database & Data | As needed | Database Admin | Compliance, Development |
| Testing & QA | Bi-weekly | QA Team | Development, Performance |
| Operations & Maintenance | Monthly | DevOps Team | Security, Monitoring |
| User Documentation | As needed | Technical Writer | UX, Features |
| Reference & Appendices | As needed | Documentation Team | All modules |
| Integration & Extensions | Quarterly | Integration Team | Architecture, Development |

---

## 🔄 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0.0 | 2025-05-26 | Modular documentation structure | Documentation Team |
| 1.0.0 | 2025-05-24 | Initial comprehensive documentation | Development Team |

---

## 📞 Support & Contact

- **Technical Issues**: [`31_Troubleshooting_and_FAQ.md`](./31_Troubleshooting_and_FAQ.md)
- **System Administration**: [`25_User_Guide_System_Administrator.md`](./25_User_Guide_System_Administrator.md)
- **Development Questions**: [`15_Code_Modification_Guidelines.md`](./15_Code_Modification_Guidelines.md)
- **Compliance Queries**: [`01-08_Compliance_*.md`](./01_Compliance_C-PR-VM-001_Version_Management.md)

---

## 📝 License & Compliance

Tài liệu này tuân thủ:
- ✅ **IATF 16949**: Automotive Quality Management System
- ✅ **ISO 9001**: Quality Management System  
- ✅ **8 Tiêu chuẩn nội bộ 1CAR**: C-PR-VM-001, C-TD-VM-001, C-PR-AR-001, C-WI-AR-001, C-PL-MG-005, C-FM-MG-004, C-PR-MG-003, C-TD-MG-005

**© 2025 1CAR - EDMS Documentation. All rights reserved.**

---

*Tài liệu này được tạo và maintain bởi 1CAR Development Team. Để đóng góp hoặc báo cáo lỗi, vui lòng tham khảo [`34_Change_Management_and_Versioning.md`](./34_Change_Management_and_Versioning.md)*
