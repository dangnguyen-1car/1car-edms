// src/routes/documentRoutes.js
/**
 * =================================================================
 * EDMS 1CAR - Document Routes Configuration
 * Route definitions for document-related pages
 * =================================================================
 */

// 1. IMPORTS & LAZY LOADING
// -----------------------------------------------------------------
import { lazy } from 'react';

// Lazy load page components for better performance and code splitting.
const DocumentListPage = lazy(() => import('../pages/DocumentListPage'));
const CreateDocumentPage = lazy(() => import('../pages/CreateDocumentPage'));
const DocumentDetailPage = lazy(() => import('../pages/DocumentDetailPage'));
const EditDocumentPage = lazy(() => import('../pages/EditDocumentPage'));


// 2. ROUTE DEFINITIONS
// -----------------------------------------------------------------
/**
 * Array of route objects for document-related pages.
 * To be used in the main router configuration.
 */
export const documentRoutes = [
    {
        path: '/documents',
        element: DocumentListPage,
        exact: true,
        title: 'Danh sách Tài liệu',
        breadcrumb: 'Tài liệu'
    },
    {
        path: '/documents/create',
        element: CreateDocumentPage,
        exact: true,
        title: 'Tạo Tài liệu Mới',
        breadcrumb: 'Tạo mới'
    },
    {
        path: '/documents/:documentId',
        element: DocumentDetailPage,
        exact: true,
        title: 'Chi tiết Tài liệu',
        breadcrumb: 'Chi tiết'
    },
    {
        path: '/documents/:documentId/edit',
        element: EditDocumentPage,
        exact: true,
        title: 'Chỉnh sửa Tài liệu',
        breadcrumb: 'Chỉnh sửa'
    }
];


// 3. EXAMPLE USAGE
// -----------------------------------------------------------------
/**
 * Example string showing how to integrate `documentRoutes` into the main App component.
 * This is for documentation purposes and is not executed as part of this module.
 */
export const documentRouteIntegration = `
// FILE: src/App.js
// -----------------

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider } from './contexts/AuthContext';

// Layout components
import Layout from './components/layout/Layout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Route imports
import { documentRoutes } from './routes/documentRoutes';
// (Import other routes as needed)
// import DashboardPage from './pages/DashboardPage';
// import NotFoundPage from './pages/NotFoundPage';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Router>
                    <div className="App">
                        <Layout>
                            <Suspense fallback={
                                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                                    <LoadingSpinner size="large" message="Đang tải trang..." />
                                </div>
                            }>
                                <Routes>
                                    {/* Dashboard & other primary routes */}
                                    <Route path="/" element={<DashboardPage />} />
                                    <Route path="/dashboard" element={<DashboardPage />} />

                                    {/* Document Routes are mapped here */}
                                    {documentRoutes.map((route) => (
                                        <Route
                                            key={route.path}
                                            path={route.path}
                                            element={<route.element />}
                                            exact={route.exact}
                                        />
                                    ))}
                                    
                                    {/* Other application routes */}
                                    <Route path="/search" element={<AdvancedSearchPage />} />
                                    <Route path="/favorites" element={<FavoritesPage />} />
                                    
                                    {/* Admin routes */}
                                    <Route path="/admin/users" element={<UserManagementPage />} />
                                    
                                    {/* 404 Not Found */}
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </Suspense>
                        </Layout>
                        
                        {/* Global Toast Notifications */}
                        <Toaster
                            position="top-right"
                            toastOptions={{
                                duration: 4000,
                                style: { background: '#363636', color: '#fff' },
                                success: {
                                    duration: 3000,
                                    iconTheme: { primary: '#4ade80', secondary: '#fff' },
                                },
                                error: {
                                    duration: 5000,
                                    iconTheme: { primary: '#ef4444', secondary: '#fff' },
                                },
                            }}
                        />
                    </div>
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
`;