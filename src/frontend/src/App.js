/**
 * =================================================================
 * EDMS 1CAR - Main App Component
 * Root component for Electronic Document Management System
 * =================================================================
 */

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Import contexts
import { AuthProvider } from './contexts/AuthContext';

// Import components
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

function App() {
  return (
    <ErrorBoundary>
      <Helmet>
        <title>1CAR - EDMS</title>
        <meta name="description" content="Electronic Document Management System for 1CAR - 40 users capacity" />
      </Helmet>
      
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
