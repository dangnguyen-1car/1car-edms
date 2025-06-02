// src/frontend/src/components/layout/AppLayout.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';

function AppLayout({ children }) {
  // State để quản lý việc đóng/mở sidebar trên mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Lấy thông tin người dùng từ AuthContext để truyền vào các component con
  const { user } = useAuth();

  // Hàm được gọi bởi Header khi nhấn nút menu
  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  // Hàm được gọi bởi Sidebar khi nhấn nút "X" hoặc click vào nền mờ
  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Truyền `isOpen` và `onClose` cho Sidebar.
        Lưu ý: Chúng ta không cần truyền `user` nữa vì Sidebar đã được tối ưu
        để tự lấy user từ useAuth().
      */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Class `md:pl-64` để tạo khoảng trống bên trái cho sidebar trên desktop.
      */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Truyền `onMenuClick` cho Header.
          Lưu ý: Chúng ta không cần truyền `user` nữa vì Header đã được tối ưu
          để tự lấy user từ useAuth().
        */}
        <Header onMenuClick={handleMenuClick} />
        
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Nội dung chính của các trang sẽ được hiển thị ở đây */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;