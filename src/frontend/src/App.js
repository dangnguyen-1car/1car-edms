// src/frontend/src/App.js
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout & Common Components
import { PageLoader } from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';

// Page Components (Lazy Loaded)
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
const ReportsPage = React.lazy(() => import('./pages/ReportsPage'));
const ActivityPage = React.lazy(() => import('./pages/ActivityPage'));
const ComplianceReportsPage = React.lazy(() => import('./pages/ComplianceReportsPage'));
const UsageStatisticsPage = React.lazy(() => import('./pages/UsageStatisticsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, cacheTime: 10 * 60 * 1000, refetchOnWindowFocus: false, refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.response?.status && [401, 403, 404].includes(error.response.status)) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: 1 },
  },
});

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}

const AppLayout = () => (
  <Layout>
    <Outlet />
  </Layout>
);

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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<NotFoundPage />} />
                <Route element={<AppLayout />}>
                    <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />
                    <Route path="/documents/:id" element={<ProtectedRoute><DocumentDetailPage /></ProtectedRoute>} />
                    <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                    <Route path="/documents/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
                    <Route path="/upload" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'user']}><UploadPage /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>}>
                        <Route index element={<Navigate to="activity" replace />} />
                        <Route path="activity" element={<ActivityPage />} />
                        <Route path="compliance" element={<ComplianceReportsPage />} />
                        <Route path="usage" element={<UsageStatisticsPage />} />
                    </Route>
                    <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersPage /></ProtectedRoute>} />
                    <Route path="/archive" element={<ProtectedRoute allowedRoles={['admin']}><ArchivePage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#363636', color: '#fff' } }} />
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
          </ErrorBoundary>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;