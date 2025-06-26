// src/frontend/src/pages/DashboardPage.js
import React, { useState, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiPlus, FiSearch, FiUserCheck, FiClock, FiZap, FiStar } from 'react-icons/fi';
// Context & Service Imports
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
// Component Imports
import SkeletonLoader from '../components/common/SkeletonLoader';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';
import DocumentStatsWidget from '../components/dashboard/DocumentStatsWidget';
import RecentActivitiesWidget from '../components/dashboard/RecentActivitiesWidget';
import PendingApprovalsWidget from '../components/dashboard/PendingApprovalsWidget';
import RecentDocumentsWidget from '../components/dashboard/RecentDocumentsWidget'; // THÊM MỚI
import NotificationsWidget from '../components/dashboard/NotificationsWidget';

const QuickStatCard = ({ icon: Icon, title, value, isLoading, linkHref, linkText }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
            <div className="flex-shrink-0">
                <Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
                <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                        {isLoading ? (
                            <SkeletonLoader width="60px" height="24px" />
                        ) : (
                            value
                        )}
                    </dd>
                </dl>
            </div>
        </div>
        {linkHref && linkText && (
            <div className="mt-4">
                <Link to={linkHref} className="text-sm text-blue-600 hover:text-blue-700 font-medium" >
                    {linkText}
                </Link>
            </div>
        )}
    </div>
);

function DashboardPage() {
    const { user, hasPermission } = useAuth();
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Memoized permission checks
    const canCreateDocuments = useMemo(() =>
        hasPermission('create_documents') || user?.role !== 'guest',
        [hasPermission, user?.role]);

    const canViewPendingApprovals = useMemo(() =>
        hasPermission('approve_documents') || user?.role === 'admin' || user?.role === 'manager',
        [hasPermission, user?.role]);

    // Quick stats query
    const { data: quickStats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-quick-stats'],
        queryFn: () => dashboardService.getQuickStats(),
        staleTime: 5 * 60 * 1000,
        enabled: !!user,
    });

    const getRoleDisplayName = (role) => {
        const roleNames = {
            'admin': 'Quản trị viên',
            'manager': 'Quản lý',
            'user': 'Người dùng',
            'guest': 'Khách'
        };
        return roleNames[role] || 'Không xác định';
    };

    // Redirect if not authenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Chào mừng, {user?.name || 'Người dùng'}!
                            </h1>
                            <p className="mt-2 text-gray-600">
                                {getRoleDisplayName(user?.role)} - {user?.department || 'Chưa xác định'}
                            </p>
                        </div>
                        <div className="mt-4 sm:mt-0 flex gap-3">
                            <Link
                                to="/search"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <FiSearch className="w-4 h-4" />
                                Tìm kiếm
                            </Link>
                            {canCreateDocuments && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    Tạo tài liệu
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <QuickStatCard
                        icon={FiUserCheck}
                        title="Tài liệu của tôi"
                        value={quickStats?.myDocuments || 0}
                        isLoading={statsLoading}
                        linkHref="/documents?author=me"
                        linkText="Xem tất cả"
                    />
                    <QuickStatCard
                        icon={FiClock}
                        title="Chờ phê duyệt"
                        value={quickStats?.pendingApprovals || 0}
                        isLoading={statsLoading}
                        linkHref="/documents/pending-approval"
                        linkText="Xem chi tiết"
                    />
                    <QuickStatCard
                        icon={FiStar}
                        title="Yêu thích"
                        value={quickStats?.favorites || 0}
                        isLoading={statsLoading}
                        linkHref="/favorites"
                        linkText="Xem danh sách"
                    />
                    <QuickStatCard
                        icon={FiZap}
                        title="Hoạt động hôm nay"
                        value={quickStats?.todayActivity || 0}
                        isLoading={statsLoading}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Document Stats Widget */}
                    <div className="xl:col-span-1">
                        <DocumentStatsWidget />
                    </div>

                    {/* Recent Documents Widget - THÊM MỚI */}
                    <div className="xl:col-span-1">
                        <RecentDocumentsWidget />
                    </div>

                    {/* Pending Approvals Widget */}
                    {canViewPendingApprovals && (
                        <div className="xl:col-span-1">
                            <PendingApprovalsWidget />
                        </div>
                    )}

                    {/* Recent Activities Widget */}
                    <div className="xl:col-span-1">
                        <RecentActivitiesWidget />
                    </div>

                    {/* Notifications Widget */}
                    <div className="xl:col-span-1">
                        <NotificationsWidget />
                    </div>
                </div>

                {/* Create Document Modal */}
                {showCreateModal && (
                    <CreateDocumentModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            setShowCreateModal(false);
                            // Refresh dashboard data
                            window.location.reload();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default DashboardPage;