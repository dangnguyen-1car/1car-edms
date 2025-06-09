/**
 * =================================================================
 * EDMS 1CAR - Entry Point
 * * Khởi tạo ứng dụng React và cung cấp top-level Router.
 * Tệp này đảm bảo chỉ có một instance của BrowserRouter bao bọc
 * toàn bộ ứng dụng để tránh lỗi router lồng nhau.
 * =================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Import component App chính
import App from './App';

// Import styles toàn cục
import './styles/index.css';

// Lấy element gốc từ HTML
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render ứng dụng
root.render(
  <React.StrictMode>
    {/* BrowserRouter được đặt ở cấp cao nhất và là duy nhất.
      Tất cả các component định tuyến (Routes, Route, Link, useNav...) 
      bên trong App sẽ hoạt động dựa trên context của Router này.
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);