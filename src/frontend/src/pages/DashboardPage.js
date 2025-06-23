// src/frontend/src/pages/DashboardPage.js
/**
 * =================================================================
 * EDMS 1CAR - Dashboard Page (FINAL, STABLE & HOOKS-COMPLIANT VERSION)
 * - Fixed the "Rules of Hooks" violation by moving useMemo hooks before conditional returns.
 * - All other logic remains the same as the previous stable version.
 * =================================================================
 */

import React, { useState, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FiPlus, FiSearch, FiUserCheck, FiClock, FiZap
} from 'react-icons/fi';

// Context & Service Imports
import { useAuth } from '../contexts/AuthContext';
import { documentService } from '../services/documentService';
import { dashboardService } from '../services/dashboardService';

// Component Imports
import { PageLoader } from '../components/common/LoadingSpinner';
import SkeletonLoader from '../components/common/SkeletonLoader';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';
import DocumentStatsWidget from '../components/dashboard/DocumentStatsWidget';
import RecentActivitiesWidget from '../components/dashboard/RecentActivitiesWidget';
import PendingApprovalsWidget from '../components/dashboard/PendingApprovalsWidget';
import NotificationsWidget from '../components/dashboard/NotificationsWidget';

const QuickStatCard = ({ icon: Icon, title, value, isLoading, linkHref, linkText }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                    <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                        <dd className="text-lg font-medium text-gray-900">
                            {isLoading ? <SkeletonLoader type="text" count={1} className="h-6 w-24 mt-1" /> : value}
                        </dd>
                    </dl>
                </div>
            </div>
        </div>
        <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
                <Link to={linkHref} className="font-medium text-blue-600 hover:text-blue-500">
                    {linkText}
                </Link>
            </div>
        </div>
    </div>
);

function DashboardPage() {
    // --- 1. HOOKS DECLARATION (MUST BE AT THE TOP) ---
    const { isAuthenticated, isLoading: isAuthLoading, user, canAccessDashboardWidget } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: docTypesData, isPending: isPendingDocTypes } = useQuery({
        queryKey: ['documentTypes'],
        queryFn: () => documentService.getDocumentTypes(),
        staleTime: 10 * 60 * 1000,
    });

    const { data: departmentsData, isPending: isPendingDepts } = useQuery({
        queryKey: ['departmentsList'],
        queryFn: () => documentService.getDepartments(),
        staleTime: 10 * 60 * 1000,
    });

    const { data: widgetStats, isPending: isPendingStats } = useQuery({
        queryKey: ['dashboardWidgetStats', user?.id],
        queryFn: () => dashboardService.getWidgetStats(),
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    // FIX: Moved useMemo hooks before conditional returns to comply with Rules of Hooks.
    const mappedDocumentTypeOptions = useMemo(() =>
        (docTypesData || []).map(dt => ({ value: dt.code, label: dt.name })),
        [docTypesData]
    );

    const mappedDepartmentOptions = useMemo(() =>
        (departmentsData || []).map(d => ({ value: d, label: d })),
        [departmentsData]
    );

    // --- 2. STATE & PROPS CALCULATION ---
    const isLoadingOptions = isPendingDocTypes || isPendingDepts;


    // --- 3. CONDITIONAL RETURNS (GUARDS) ---
    if (isAuthLoading) {
        return <PageLoader message="Đang tải dashboard..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // --- 4. RENDER LOGIC & JSX ---
    const getRoleDisplayName = (role) => ({
        'admin': 'Quản trị viên', 'manager': 'Quản lý phòng ban', 'user': 'Người dùng', 'guest': 'Khách'
    })[role] || 'Không xác định';

    const getWelcomeMessage = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{getWelcomeMessage()}, {user?.name}!</h1>
                            <p className="mt-1 text-lg text-gray-600">{getRoleDisplayName(user?.role)} - {user?.department || 'Chưa xác định'}</p>
                        </div>
                        <div className="flex space-x-3 w-full sm:w-auto">
                            <Link to="/search" className="inline-flex items-center justify-center w-1/2 sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <FiSearch className="mr-2 h-4 w-4" />
                                Tìm kiếm
                            </Link>
                            {user?.role !== 'guest' && (
                                <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center justify-center w-1/2 sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" disabled={isLoadingOptions}>
                                    <FiPlus className="mr-2 h-4 w-4" />
                                    {isLoadingOptions ? 'Đang tải...' : 'Tạo mới'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <QuickStatCard icon={FiUserCheck} title="Tài liệu của tôi" value={widgetStats?.data?.my_documents_count || 0} isLoading={isPendingStats} linkHref="/documents?owner=me" linkText="Xem tài liệu của bạn" />
                    <QuickStatCard icon={FiClock} title="Đang chờ xử lý" value={<span className="text-red-600">{widgetStats?.data?.total_pending || 0}</span>} isLoading={isPendingStats} linkHref="/documents/pending-approval" linkText="Xem danh sách chờ" />
                    <QuickStatCard icon={FiZap} title="Truy cập nhanh" value="Tác vụ thường dùng" linkHref="/upload" linkText="Tải lên tài liệu mới" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Tổng quan hệ thống</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {canAccessDashboardWidget('document_stats') && <DocumentStatsWidget />}
                    {canAccessDashboardWidget('recent_activities') && <RecentActivitiesWidget />}
                    {canAccessDashboardWidget('pending_approvals') && <PendingApprovalsWidget />}
                    {canAccessDashboardWidget('notifications') && <NotificationsWidget />}
                </div>
            </div>
            {showCreateModal && (
                <CreateDocumentModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={() => setShowCreateModal(false)} documentTypeOptions={mappedDocumentTypeOptions} departmentOptions={mappedDepartmentOptions} isLoadingOptions={isLoadingOptions} />
            )}
        </div>
    );
}

export default DashboardPage;