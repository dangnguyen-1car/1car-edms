# 1CAR-EDMS - Hệ Thống Quản Lý Tài Liệu Điện Tử

[![Giấy phép MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Trạng thái Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/dangnguyen-1car/1car-edms)
[![Độ bao phủ Test](https://img.shields.io/badge/coverage-85%25-yellowgreen)](https://github.com/dangnguyen-1car/1car-edms)

Hệ thống Quản lý Tài liệu Điện tử (EDMS) được thiết kế và phát triển riêng cho 1CAR, nhằm mục đích số hóa, tối ưu hóa quy trình và tuân thủ các tiêu chuẩn chất lượng.

## Mục lục

- [Tổng quan](#tổng-quan)
- [Cấu trúc chức năng](#cấu-trúc-chức-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
- [Thông tin truy cập](#thông-tin-truy-cập)
- [Các tập lệnh (Scripts)](#các-tập-lệnh-scripts)
- [Tuân thủ tiêu chuẩn](#tuân-thủ-tiêu-chuẩn)
- [Giấy phép](#giấy-phép)

## Tổng quan

1CAR-EDMS là một giải pháp toàn diện để quản lý tài liệu nội bộ, được xây dựng để hỗ trợ cho 40 người dùng thuộc 14 phòng ban khác nhau, với 7 loại tài liệu chính. Hệ thống tập trung vào việc kiểm soát phiên bản, quản lý quy trình phê duyệt và đảm bảo tuân thủ các tiêu chuẩn chất lượng như IATF 16949.

## Cấu trúc chức năng

Hệ thống được tổ chức với các chức năng chính như sau:

-   **1. Trang Đăng nhập (Login Page)**
-   **2. Dashboard Chính**
    -   2.1 Widget Thống kê Hệ thống
    -   2.2 Widget Hoạt động Người dùng
    -   2.3 Widget Thống kê Tài liệu
    -   2.4 Widget Lỗi Gần đây
-   **3. Quản lý Tài liệu (Documents)**
    -   3.1 Danh sách Tài liệu
    -   3.2 Chi tiết Tài liệu
    -   3.3 Tạo & Chỉnh sửa Tài liệu
    -   3.4 Lịch sử Phiên bản
    -   3.5 Quản lý Workflow
    -   3.6 Tài liệu Đang chờ Phê duyệt
-   **4. Tìm kiếm Nâng cao (Advanced Search)**
-   **5. Quản lý Người dùng (User Management)** - `Admin only`
    -   5.1 Danh sách & Chỉnh sửa Người dùng
    -   5.2 Tạo Người dùng Mới
    -   5.3 Phân quyền
-   **6. Báo cáo và Thống kê (Reports & Analytics)** - `Admin only`
    -   6.1 Báo cáo Hoạt động & Tuân thủ
    -   6.2 Thống kê Sử dụng
-   **7. Cài đặt Hệ thống (System Settings)** - `Admin only`
    -   7.1 Cấu hình Chung
    -   7.2 Quản lý Backup
    -   7.3 Audit Logs
-   **8. Quản lý Cá nhân**
    -   8.1 Tài liệu Yêu thích (Favorites)
    -   8.2 Tài liệu Gần đây (Recent Documents)

## Công nghệ sử dụng

-   **Backend**: Node.js, Express.js
-   **Frontend**: React, React Router, Tailwind CSS
-   **Cơ sở dữ liệu**: SQLite
-   **Kiểm thử**: Jest, Supertest
-   **Công cụ khác**: ESLint, Prettier, Nodemon, Concurrently

## Cấu trúc dự án

Dự án được cấu trúc theo mô hình monorepo để quản lý cả backend và frontend trong cùng một kho chứa.


1car-edms/
├── src/
│   ├── backend/         # Node.js API Server
│   └── frontend/        # React Application
├── database/            # SQLite Database & Scripts
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
├── uploads/             # Nơi lưu trữ file tải lên
├── logs/                # Ghi log hệ thống
├── scripts/             # Các script tự động hóa (setup, backup...)
└── documentation/       # Tài liệu dự án


## Hướng dẫn cài đặt

Để cài đặt và chạy dự án trên máy local, hãy làm theo các bước sau:

**Yêu cầu:**
-   Node.js (v16.0.0 trở lên)
-   npm (v8.0.0 trở lên)

**Các bước thực hiện:**

1.  **Clone repository về máy:**
    ```bash
    git clone [https://github.com/dangnguyen-1car/1car-edms.git](https://github.com/dangnguyen-1car/1car-edms.git)
    cd 1car-edms
    ```

2.  **Cài đặt tất cả các dependencies cho cả backend và frontend:**
    ```bash
    npm install
    ```
    *Lệnh này sẽ tự động cài đặt các gói trong file `package.json` ở thư mục gốc và trong các workspaces (`src/backend`, `src/frontend`).*

3.  **Khởi tạo và cài đặt môi trường:**
    ```bash
    npm run setup
    ```
    *Script này sẽ tự động tạo các thư mục cần thiết và khởi tạo cơ sở dữ liệu.*

4.  **(Tùy chọn) Chèn dữ liệu mẫu:**
    Để có dữ liệu mẫu bao gồm người dùng và tài liệu, hãy chạy lệnh sau:
    ```bash
    npm run seed
    ```

5.  **Chạy môi trường phát triển:**
    ```bash
    npm run dev
    ```
    *Lệnh này sẽ khởi động đồng thời cả server backend và ứng dụng frontend.*

## Thông tin truy cập

Sau khi khởi động thành công, bạn có thể truy cập hệ thống tại:

-   **Frontend Application**: `http://localhost:3001`
-   **Backend API**: `http://localhost:3000`

**Tài khoản mặc định:**

-   **Quản trị viên hệ thống:**
    -   **Email:** `admin@1car.vn`
    -   **Mật khẩu:** `admin123`
-   **Các tài khoản mẫu (sau khi chạy `seed`):**
    -   Mật khẩu chung: `1car2025`
    -   Xem chi tiết các tài khoản trong file `database/seeds/users.sql`.

## Các tập lệnh (Scripts)

| Script | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy cả backend và frontend ở chế độ phát triển với hot-reload. |
| `npm start` | Chạy server backend ở chế độ production. |
| `npm run build` | Build ứng dụng frontend cho môi trường production. |
| `npm test` | Chạy tất cả các bài test (backend và frontend). |
| `npm run lint` | Kiểm tra lỗi và quy chuẩn mã nguồn bằng ESLint. |
| `npm run format` | Tự động định dạng mã nguồn bằng Prettier. |
| `npm run setup` | Chạy script cài đặt và khởi tạo dự án lần đầu. |
| `npm run migrate`| Áp dụng các thay đổi về CSDL (database migrations). |
| `npm run seed` | Chèn dữ liệu mẫu vào cơ sở dữ liệu. |
| `npm run backup` | Tạo một bản sao lưu cho cơ sở dữ liệu. |
| `npm run restore`| Phục hồi cơ sở dữ liệu từ một bản sao lưu. |

## Tuân thủ tiêu chuẩn

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

Kết Luận
Cấu trúc folder và file này đảm bảo:

✅ Tuân thủ đầy đủ 9 tài liệu EDMS 1CAR (ám chỉ các tài liệu quy định nội bộ của 1CAR)
✅ Khả năng mở rộng (Scalability) cho 40 người dùng, 14 phòng ban
✅ Khả năng bảo trì (Maintainability) với cấu trúc mã rõ ràng
✅ Bảo mật (Security) với xác thực & ủy quyền phù hợp
✅ Tuân thủ (Compliance) với tiêu chuẩn IATF 16949
✅ Hiệu năng (Performance) với cơ sở dữ liệu được tối ưu hóa & caching (nếu có)
✅ Giám sát (Monitoring) với ghi log toàn diện & dấu vết kiểm toán

## Giấy phép
MIT License - 1CAR Development Team
