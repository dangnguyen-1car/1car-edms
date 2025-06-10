// src/frontend/src/App.js
/**
 * =================================================================
 * EDMS 1CAR - Main App Component
 * * Chứa toàn bộ cấu trúc logic của ứng dụng, bao gồm:
 * - Khởi tạo React Query Client.
 * - Cung cấp các Context Provider (Query, Auth, Helmet).
 * - Định nghĩa cấu trúc định tuyến (Routes và Protected Routes).
 * - Cấu hình thông báo (Toaster) và React Query Devtools.
 * - Quản lý Error Boundary.
 * =================================================================
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// --- Contexts ---
import { AuthProvider, useAuth } from './contexts/AuthContext';

// --- Layout & Common Components ---
import { PageLoader } from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';

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
// ================== THÊM MỚI ==================
const DocumentDetailPage = React.lazy(() => import('./pages/DocumentDetailPage'));
// ===============================================
// const UnauthorizedPage = React.lazy(() => import('./pages/UnauthorizedPage'));


// =================================================================
// React Query Client (Single Instance)
// =================================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      cacheTime: 10 * 60 * 1000, // 10 phút
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.response?.status && [401, 403, 404].includes(error.response.status)) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

// =================================================================
// Protected Route & Role-Based Components
// =================================================================
function ProtectedRoute({ children, requiredRole = null, requiredPermission = null }) {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();

  if (isLoading) {
    return <PageLoader message="Đang kiểm tra xác thực..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

function RoleBasedRoute({ children, allowedRoles = [] }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <PageLoader message="Đang kiểm tra quyền truy cập..." />;
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Layout>{children}</Layout>;
}


// =================================================================
// Main App Component
// =================================================================
function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ErrorBoundary>
            <Helmet>
              <title>1CAR - EDMS</title>
              <meta name="description" content="Hệ thống Quản lý Tài liệu Điện tử cho 1CAR" />
            </Helmet>

            <Suspense fallback={<PageLoader message="Đang tải trang..." />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />

                {/* ================== THÊM MỚI ================== */}
                {/* Route cho trang chi tiết tài liệu */}
                <Route
                  path="/documents/:documentId"
                  element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>}
                />
                {/* =============================================== */}

                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />

                {/* Role-Based Routes */}
                <Route
                  path="/upload"
                  element={<RoleBasedRoute allowedRoles={['user', 'manager', 'admin']}><UploadPage /></RoleBasedRoute>}
                />

                {/* Admin & Specific Permission Routes */}
                <Route
                  path="/users"
                  element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>}
                />
                <Route
                  path="/archive"
                  element={<ProtectedRoute requiredPermission="view_audit_logs"><ArchivePage /></ProtectedRoute>}
                />
                <Route
                  path="/activity"
                  element={<ProtectedRoute requiredPermission="view_audit_logs"><ActivityPage /></ProtectedRoute>}
                />
                <Route
                  path="/settings"
                  element={<ProtectedRoute requiredPermission="manage_system"><SettingsPage /></ProtectedRoute>}
                />

                {/* Catch-all Route cho 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>

            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#363636', color: '#fff', fontSize: '14px' },
                success: { duration: 3000, iconTheme: { primary: '#10B981', secondary: '#fff' } },
                error: { duration: 5000, iconTheme: { primary: '#EF4444', secondary: '#fff' } },
              }}
            />
          </ErrorBoundary>
        </AuthProvider>
        
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;