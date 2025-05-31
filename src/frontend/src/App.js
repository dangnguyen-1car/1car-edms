// src/frontend/src/App.js

/**
 * =================================================================
 * EDMS 1CAR - Main App Component
 * Root component for Electronic Document Management System
 * =================================================================
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Navigate
import { Helmet, HelmetProvider } from 'react-helmet-async';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Import useAuth

// Import components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout'; // Import Layout

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Lazy load newly added page components
const UploadPage = React.lazy(() => import('./pages/UploadPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));
const ActivityPage = React.lazy(() => import('./pages/ActivityPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));

/**
 * ProtectedRoute Component
 * Wrapper để bảo vệ các routes yêu cầu xác thực.
 * Nó cũng sẽ chứa Layout chung cho các trang được bảo vệ.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang kiểm tra xác thực..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>; // Bọc children bằng Layout
}

function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Helmet>
            <title>1CAR - EDMS</title>
            <meta name="description" content="Electronic Document Management System for 1CAR - 40 users capacity" />
          </Helmet>
          
          <div className="min-h-screen bg-gray-50">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="large" message="Đang tải trang..." /></div>}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* Routes được bảo vệ và sử dụng Layout chung */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
                <Route path="/archive" element={<ProtectedRoute><ArchivePage /></ProtectedRoute>} />
                <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </div>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;