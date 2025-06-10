// src/frontend/src/pages/DashboardPage.js
import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
// Sửa đổi 1: Đảm bảo import từ đúng package
import { useQuery } from '@tanstack/react-query';
import { FiPlus, FiSearch, FiTrendingUp, FiUsers, FiFileText } from 'react-icons/fi';
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

  // --- BẮT ĐẦU SỬA ĐỔI ---
  // Sửa đổi 2: Cập nhật cú pháp useQuery sang dạng object và dùng isPending
  const { data: docTypesData, isPending: isPendingDocTypes } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => documentService.getDocumentTypes(),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    cacheTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const { data: departmentsData, isPending: isPendingDepts } = useQuery({
    queryKey: ['departmentsList'],
    queryFn: () => documentService.getDepartments(),
    staleTime: 10 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
  // --- KẾT THÚC SỬA ĐỔI ---

  if (isLoading) {
    return <PageLoader message="Đang tải dashboard..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getRoleDisplayName = (role) => {
    // ... (logic không đổi)
    const roleNames = {
      'admin': 'Quản trị viên',
      'manager': 'Quản lý phòng ban',
      'user': 'Người dùng',
      'guest': 'Khách'
    };
    return roleNames[role] || 'Không xác định';
  };

  const getWelcomeMessage = () => {
    // ... (logic không đổi)
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const handleCreateDocument = (newDocument) => {
    // ... (logic không đổi)
    console.log('Document created:', newDocument);
  };

  const mappedDocumentTypeOptions = docTypesData?.data?.documentTypes?.map(dt => ({
    value: dt.code,
    label: dt.name
  })) || [];

  const mappedDepartmentOptions = departmentsData?.data?.departments?.map(d => ({
    value: d,
    label: d
  })) || [];

  // Sửa đổi 3: Cập nhật biến kiểm tra loading options
  const isLoadingOptions = isPendingDocTypes || isPendingDepts;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {getWelcomeMessage()}, {user?.name}!
              </h1>
              <p className="mt-1 text-lg text-gray-600">
                {getRoleDisplayName(user?.role)} - {user?.department || 'Chưa xác định phòng ban'}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiSearch className="mr-2 h-4 w-4" />
                Tìm kiếm nâng cao
              </Link>
              {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'user') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isLoadingOptions}
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  {isLoadingOptions ? 'Đang tải...' : 'Tạo tài liệu mới'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Cards - For all roles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* ... (phần này không thay đổi) ... */}
           <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiFileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Tài liệu
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Quản lý tài liệu điện tử
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <Link to="/documents" className="font-medium text-blue-600 hover:text-blue-500">
                  Xem tất cả tài liệu
                </Link>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiUsers className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Phòng ban
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.department || 'Chưa xác định'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-600">
                  Vai trò: {getRoleDisplayName(user?.role)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiTrendingUp className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Hệ thống
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      1CAR - EDMS
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-600">
                  Phiên bản 1.0.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {canAccessDashboardWidget('document_stats') && (
            <DocumentStatsWidget className="lg:col-span-1" />
          )}
          {canAccessDashboardWidget('recent_activities') && (
            <RecentActivitiesWidget className="lg:col-span-1" />
          )}
          {canAccessDashboardWidget('pending_approvals') && (
            <PendingApprovalsWidget className="lg:col-span-1" />
          )}
          {canAccessDashboardWidget('notifications') && (
            <NotificationsWidget className="lg:col-span-1" />
          )}
        </div>

        {/* Guest User Special Message */}
        {user?.role === 'guest' && (
           <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            {/* ... (phần này không thay đổi) ... */}
            </div>
        )}
      </div>

      {/* Create Document Modal */}
      {showCreateModal && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreateDocument}
          documentTypeOptions={mappedDocumentTypeOptions}
          departmentOptions={mappedDepartmentOptions}
          isLoadingOptions={isLoadingOptions}
        />
      )}
    </div>
  );
}

export default DashboardPage;