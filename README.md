# 1CAR - EDMS
## Hệ Thống Quản Lý Tài Liệu Điện Tử cho 1CAR

### Tổng Quan
1CAR - EDMS là hệ thống quản lý tài liệu điện tử được thiết kế đặc biệt cho 1CAR, hỗ trợ 40 người dùng với 14 phòng ban và 7 loại tài liệu.

### Tính Năng Chính
- ✅ **Quản lý tài liệu** với 7 loại: PL, PR, WI, FM, TD, TR, RC
- ✅ **Kiểm soát phiên bản** theo C-PR-VM-001
- ✅ **Quy trình workflow** 4 trạng thái
- ✅ **Phân quyền** theo vai trò và phòng ban
- ✅ **Audit logging** tuân thủ IATF 16949
- ✅ **Tìm kiếm và lọc** nâng cao
- ✅ **Lưu trữ và archival** theo C-PR-AR-001

### Cấu Trúc Hệ Thống
1car-edms/
├── src/
│ ├── backend/ # Node.js API Server
│ └── frontend/ # React Application
├── database/ # SQLite Database
├── uploads/ # File Storage
├── logs/ # System Logs
└── docs/ # Documentation

### Cài Đặt
1.  **Clone repository:**
    ```bash
    git clone <repository-url>
    cd 1car-edms
    ```
2.  **Setup hệ thống:**
    ```bash
    npm run setup
    ```
3.  **Chạy development:**
    ```bash
    npm run dev
    ```

### Truy Cập
-   **Backend**: http://localhost:3000
-   **Frontend**: http://localhost:3001
-   **Admin**: admin@1car.vn / admin123

### Cấu Trúc Cơ Sở Dữ Liệu (Database Structure)
Vị trí: `database/migrations/001-create-users.sql`
```sql
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
);

-- Insert default admin user
INSERT OR IGNORE INTO users (email, password_hash, name, department, role, is_active)
VALUES ('admin@1car.vn', '$2b$10$hash', 'System Administrator', 'Ban Giám đốc', 'admin', 1);
Kịch Bản Cài Đặt (Setup Scripts)
Vị trí: scripts/setup.js

JavaScript

/**
 * EDMS 1CAR Setup Script
 * Initialize database, create directories, install dependencies
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function setup() {
  console.log('🚀 Setting up EDMS 1CAR...');
  
  // Create directories
  const dirs = [
    'database', 'database/backup', 'logs', 'uploads', 
    'uploads/documents', 'uploads/versions', 'uploads/temp'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(dir);
    console.log(`✅ Created directory: ${dir}`);
  }
  
  // Install backend dependencies
  console.log('📦 Installing backend dependencies...');
  execSync('cd src/backend && npm install', { stdio: 'inherit' });
  
  // Install frontend dependencies
  console.log('📦 Installing frontend dependencies...');
  execSync('cd src/frontend && npm install', { stdio: 'inherit' });
  
  // Initialize database
  console.log('🗄️ Initializing database...');
  execSync('npm run migrate', { stdio: 'inherit' });
  
  console.log('🎉 EDMS 1CAR setup complete!');
  console.log('👉 Run "npm run dev" to start development');
}

setup().catch(console.error);
Tuân Thủ

Hệ thống EDMS 1CAR được xây dựng tuân thủ các quy trình và tiêu chuẩn sau:
C-PR-VM-001: Quy trình quản lý phiên bản
C-PR-AR-001: Quy trình lưu trữ tài liệu
C-PL-MG-005: Chính sách phân quyền
IATF 16949: Tiêu chuẩn chất lượng

Chi Tiết Cấu Trúc Tuân Thủ EDMS 1CAR
Theo C-TD-MG-005 (Danh sách mã chuẩn):
Loại garage: C (Company)
Loại tài liệu: PR, WI, FM, TD, TR, RC, PL
Phòng ban: MG, CS, TE, QC, HR, AR
Số thứ tự: 001-999
Phiên bản: 01-99

Theo C-PR-VM-001 (Quy trình quản lý phiên bản):
Hệ thống kiểm soát phiên bản (Version control system)
Quản lý vòng đời tài liệu (Document lifecycle management)
Quy trình phê duyệt (Approval workflow)
Quản lý lưu trữ (Archive management)

Theo C-PL-MG-005 (Chính sách phân quyền):
Kiểm soát truy cập dựa trên vai trò (Role-based access control)
Quyền hạn dựa trên phòng ban (Department-based permissions)
Các mức độ bảo mật: R, C, I, P (Khả năng là Read, Create, Implement, Publish hoặc các mức độ khác tùy theo định nghĩa cụ thể của 1CAR)
Tuân thủ dấu vết kiểm toán (Audit trail compliance)

Theo C-PR-AR-001 (Quy trình lưu trữ tài liệu):
Cấu trúc lưu trữ tài liệu (Document storage structure)
Chính sách lưu giữ (Retention policies)
Thủ tục lưu trữ (Archive procedures)
Quản lý hủy tài liệu (Disposal management)
Hỗ Trợ
Tài liệu: /docs/
API Documentation: http://localhost:3000/api/docs
Logs Hệ Thống: /logs/
Version: 1.0.0
Kết Luận
Cấu trúc folder và file này đảm bảo:

✅ Tuân thủ đầy đủ 9 tài liệu EDMS 1CAR (ám chỉ các tài liệu quy định nội bộ của 1CAR)
✅ Khả năng mở rộng (Scalability) cho 40 người dùng, 14 phòng ban
✅ Khả năng bảo trì (Maintainability) với cấu trúc mã rõ ràng
✅ Bảo mật (Security) với xác thực & ủy quyền phù hợp
✅ Tuân thủ (Compliance) với tiêu chuẩn IATF 16949
✅ Hiệu năng (Performance) với cơ sở dữ liệu được tối ưu hóa & caching (nếu có)
✅ Giám sát (Monitoring) với ghi log toàn diện & dấu vết kiểm toán
License
MIT License - 1CAR Development Team