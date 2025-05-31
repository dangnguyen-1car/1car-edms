// src/frontend/src/App.js

/**
 * =================================================================
 * EDMS 1CAR - Main App Component
 * Root component for Electronic Document Management System
 * =================================================================
 */

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
// Thay đổi import từ react-helmet sang react-helmet-async
import { Helmet, HelmetProvider } from 'react-helmet-async';

// Import contexts
import { AuthProvider } from './contexts/AuthContext';

// Import components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    // Bọc toàn bộ ứng dụng trong HelmetProvider
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Helmet>
            <title>1CAR - EDMS</title>
            {/* Bạn có thể thêm các meta tags khác ở đây nếu cần */}
            <meta name="description" content="Electronic Document Management System for 1CAR - 40 users capacity" />
          </Helmet>
          
          <div className="min-h-screen bg-gray-50"> {/* Giả sử bạn muốn giữ div này làm container chính */}
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<DashboardPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/search" element={<SearchPage />} />
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