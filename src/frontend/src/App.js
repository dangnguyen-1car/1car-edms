// src/frontend/src/App.js
/**
 * =================================================================
 * EDMS 1CAR - Main App Component (Rewritten for Clarity)
 * Root component for Electronic Document Management System.
 * This version clarifies the role of ProtectedRoute and Layout.
 * =================================================================
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';

// --- Contexts ---
import { AuthProvider, useAuth } from './contexts/AuthContext';

// --- Layout & Common Components ---
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout'; // Component layout chính

// --- Page Components (Lazy Loaded) ---
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const UploadPage = React.lazy(() => import('./pages/UploadPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));
const ActivityPage = React.lazy(() => import('./pages/ActivityPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

/**
 * =================================================================
 * ProtectedRoute Component
 * -> Nhiệm vụ 1: Kiểm tra quyền truy cập của người dùng.
 * -> Nhiệm vụ 2: Áp dụng layout chung (Header, Sidebar) cho các trang được bảo vệ.
 * =================================================================
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Trong khi đang kiểm tra xác thực, hiển thị màn hình loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang kiểm tra xác thực..." />
      </div>
    );
  }

  // 2. Nếu không được xác thực, chuyển hướng về trang đăng nhập
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Nếu đã xác thực, hiển thị trang yêu cầu bên trong Layout chung.
  // Layout sẽ chứa Header, Sidebar và quản lý sự tương tác giữa chúng.
  return <Layout>{children}</Layout>;
}


/**
 * =================================================================
 * Main App Component
 * =================================================================
 */
function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Helmet>
            <title>1CAR - EDMS</title>
            <meta name="description" content="Electronic Document Management System for 1CAR" />
          </Helmet>
          
          <div className="min-h-screen bg-gray-50">
            <Suspense fallback={<PageLoader message="Đang tải trang..." />}>
              <Routes>
                {/* Route công khai, không cần xác thực */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Các routes dưới đây đều được bọc bởi ProtectedRoute.
                  ProtectedRoute sẽ tự động kiểm tra quyền và áp dụng Layout.
                  Đây là một cách tổ chức code rất hiệu quả.
                */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                
                {/* Route cho các đường dẫn không tồn tại */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

// Helper component for a full-page loader, consistent with ProtectedRoute's loader
function PageLoader({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message={message} />
    </div>
  );
}

export default App;