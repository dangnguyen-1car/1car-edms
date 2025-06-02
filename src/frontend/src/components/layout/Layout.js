// src/frontend/src/components/layout/Layout.js
/**
 * =================================================================
 * EDMS 1CAR - Main Layout Component
 * Component này quản lý trạng thái và sự tương tác giữa Header và Sidebar.
 * =================================================================
 */

import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children }) {
  // State để quản lý việc đóng/mở sidebar trên màn hình mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hàm này sẽ được truyền cho Header để khi người dùng nhấn nút menu,
  // nó sẽ cập nhật state và ra lệnh cho Sidebar mở ra.
  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  // Hàm này được truyền cho Sidebar để nó có thể tự đóng lại
  // (khi người dùng nhấn nút "X" hoặc click vào nền mờ).
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar nhận vào trạng thái `isOpen` và hàm `onClose`.
        Các component này đã được tối ưu để tự lấy user từ AuthContext,
        do đó chúng ta không cần truyền user prop nữa.
      */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Class `md:pl-64` để tạo khoảng trống bên trái cho sidebar trên desktop.
        Khi sidebar desktop hiển thị, nội dung chính sẽ không bị che lấp.
      */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Header nhận vào hàm `onMenuClick` để kích hoạt sidebar trên mobile. */}
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Nội dung chính của các trang (Dashboard, Documents, etc.) sẽ được render ở đây */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;