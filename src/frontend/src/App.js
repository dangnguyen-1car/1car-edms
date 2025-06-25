// src/frontend/src/App.js
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// =================================================================
// Contexts
// =================================================================
import { AuthProvider, useAuth } from './contexts/AuthContext';

// =================================================================
// Layout & Common Components
// =================================================================
import { PageLoader } from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';

// =================================================================
// Page Components (Lazy Loaded)
// =================================================================
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = React.lazy(() => import('./pages/DocumentsPage'));
const DocumentDetailPage = React.lazy(() => import('./pages/DocumentDetailPage'));
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const UploadPage = React.lazy(() => import('./pages/UploadPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const ArchivePage = React.lazy(() => import('./pages/ArchivePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const PendingApprovalPage = React.lazy(() => import('./pages/PendingApprovalPage'));
// Report Pages
const ActivityPage = React.lazy(() => import('./pages/ActivityPage'));
const ComplianceReportsPage = React.lazy(() => import('./pages/ComplianceReportsPage'));
const UsageStatisticsPage = React.lazy(() => import('./pages/UsageStatisticsPage'));

// =================================================================
// React Query Client Configuration
// =================================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
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
// OPTIMIZED Route Protection Component
// =================================================================
function ProtectedRoute({ children, allowedRoles = [], requiredPermission = null }) {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user's role is in the allowed list
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check for specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If all checks pass, render the layout and children
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
              <meta name="description" content="Electronic Document Management System for 1CAR" />
            </Helmet>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<NotFoundPage />} />

                {/* Common Protected Routes (for all authenticated users) */}
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
                <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/documents/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />

                {/* Role-Specific Routes */}
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
                      <UploadPage />
                    </ProtectedRoute>
                  }
                />

                {/* Report Routes (Admin & Manager) */}
                <Route 
                  path="/reports" 
                  element={<Navigate to="/reports/activity" replace />} 
                />
                <Route
                  path="/reports/activity"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ActivityPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/compliance"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <ComplianceReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports/usage"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager']}>
                      <UsageStatisticsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only Routes */}
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/archive"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <ArchivePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all Route for 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>

            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />

            {/* React Query Devtools */}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;