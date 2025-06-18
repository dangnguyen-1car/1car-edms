// src/frontend/src/pages/DashboardPage.js - Cập nhật với PendingApprovalsWidget
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiPlus, FiSearch, FiTrendingUp, FiUsers, FiFileText, FiClock } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { PageLoader } from '../components/common/LoadingSpinner';
import DocumentStatsWidget from '../components/dashboard/DocumentStatsWidget';
import RecentActivitiesWidget from '../components/dashboard/RecentActivitiesWidget';
import PendingApprovalsWidget from '../components/dashboard/PendingApprovalsWidget';
import NotificationsWidget from '../components/dashboard/NotificationsWidget';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';
import { documentService } from '../services/documentService';

function DashboardPage() {
  const { isAuthenticated, isLoading, user, canAccessDashboardWidget } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // =================================================================
  // Helper Functions
  // =================================================================
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Quản trị viên',
      'manager': 'Quản lý',
      'user': 'Người dùng',
      'guest': 'Khách'
    };
    return roleNames[role] || 'Không xác định';
  };

  // =================================================================
  // Data Fetching (TanStack Query)
  // =================================================================
  // Queries for metadata
  const { data: docTypesData, isPending: isPendingDocTypes } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => documentService.getDocumentTypes(),
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  const { data: departmentsData, isPending: isPendingDepts } = useQuery({
    queryKey: ['departmentsList'],
    queryFn: () => documentService.getDepartments(),
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });

  // =================================================================
  // Early Exit Conditions (Loading, Authentication)
  // =================================================================
  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // =================================================================
  // Event Handlers
  // =================================================================
  const handleCreateDocument = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleDocumentCreated = (newDocument) => {
    setShowCreateModal(false);
    // Có thể thêm logic refresh data hoặc hiển thị thông báo thành công
  };

  // =================================================================
  // Render JSX
  // =================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Chào mừng trở lại, {user?.name || 'Người dùng'}
              </h1>
              <p className="mt-2 text-gray-600">
                {getRoleDisplayName(user?.role)} - {user?.department || 'Chưa xác định phòng ban'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <FiSearch className="mr-2 h-4 w-4" />
                Tìm kiếm nâng cao
              </Link>

              {user?.role !== 'guest' && (
                <button
                  onClick={handleCreateDocument}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Tạo tài liệu mới
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiFileText className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tài liệu của tôi</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <FiTrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đã phê duyệt</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <FiClock className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Đang chờ xử lý</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <FiUsers className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hoạt động tuần</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Document Statistics Widget */}
            {canAccessDashboardWidget('documentStats') && (
              <DocumentStatsWidget />
            )}
            {/* Recent Activities Widget */}
            {canAccessDashboardWidget('recentActivities') && (
              <RecentActivitiesWidget />
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-8">
            {/* Pending Approvals Widget - CHỨC NĂNG MỚI */}
            <PendingApprovalsWidget />
            {/* Notifications Widget */}
            {canAccessDashboardWidget('notifications') && (
              <NotificationsWidget />
            )}
            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Truy cập nhanh
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  <Link
                    to="/documents"
                    className="flex items-center p-3 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiFileText className="mr-3 h-5 w-5 text-gray-400" />
                    Danh sách tài liệu
                  </Link>

                  <Link
                    to="/documents/pending-approval"
                    className="flex items-center p-3 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiClock className="mr-3 h-5 w-5 text-gray-400" />
                    Tài liệu chờ phê duyệt
                  </Link>

                  <Link
                    to="/search"
                    className="flex items-center p-3 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FiSearch className="mr-3 h-5 w-5 text-gray-400" />
                    Tìm kiếm nâng cao
                  </Link>

                  {user?.role !== 'guest' && (
                    <button
                      onClick={handleCreateDocument}
                      className="flex items-center w-full p-3 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <FiPlus className="mr-3 h-5 w-5 text-gray-400" />
                      Tạo tài liệu mới
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Thông tin hệ thống
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phiên bản:</span>
                    <span className="text-gray-900">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Người dùng online:</span>
                    <span className="text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tài liệu tổng:</span>
                    <span className="text-gray-900">-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cập nhật cuối:</span>
                    <span className="text-gray-900">Hôm nay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Document Modal */}
        {showCreateModal && (
          <CreateDocumentModal
            isOpen={showCreateModal}
            onClose={handleCloseCreateModal}
            onDocumentCreated={handleDocumentCreated}
            documentTypes={docTypesData?.data?.documentTypes || []}
            departments={departmentsData?.data?.departments || []}
            isLoadingTypes={isPendingDocTypes}
            isLoadingDepartments={isPendingDepts}
          />
        )}
      </div>
    </div>
  );
}

export default DashboardPage;