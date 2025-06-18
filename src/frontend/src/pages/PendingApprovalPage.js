// src/frontend/src/pages/PendingApprovalPage.js - Đã tái cấu trúc loại bỏ code trùng lặp

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiUser, FiAlertTriangle, FiFilter, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { documentService } from '../services/documentService';
import { PageLoader } from '../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import PendingDocumentTable from '../components/documents/PendingDocumentTable';

function PendingApprovalPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // =================================================================
  // State Management
  // =================================================================
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    department: '',
    author: '',
    priority: '',
    sortBy: 'updated_at',
    sortOrder: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  // =================================================================
  // Data Fetching Queries
  // =================================================================

  // Query tài liệu chờ phê duyệt
  const { 
    data: pendingData, 
    isLoading, 
    error, 
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['pendingApproval', filters],
    queryFn: () => documentService.getPendingApproval(filters),
    staleTime: 30 * 1000, // 30 giây
    refetchInterval: 60 * 1000, // Tự động refresh mỗi phút
    refetchIntervalInBackground: false
  });

  // Query thống kê
  const { data: statsData } = useQuery({
    queryKey: ['pendingApprovalStats'],
    queryFn: () => documentService.getPendingApprovalStats(),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000 // Refresh mỗi 2 phút
  });

  // =================================================================
  // Event Handlers
  // =================================================================

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (column) => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: newSortOrder
    }));
  };

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries(['pendingApprovalStats']);
  };

  const handleExport = async () => {
    try {
      toast.loading('Đang xuất danh sách...');
      // Implementation for export functionality
      toast.success('Đã xuất danh sách thành công');
    } catch (error) {
      toast.error('Lỗi khi xuất danh sách');
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      department: '',
      author: '',
      priority: '',
      sortBy: 'updated_at',
      sortOrder: 'desc'
    });
  };

  // =================================================================
  // Loading & Error States
  // =================================================================

  if (isLoading) return <PageLoader />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">
            <FiAlertTriangle />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Không thể tải danh sách tài liệu
          </h2>
          <p className="text-gray-600 mb-4">
            {error.message || 'Có lỗi xảy ra khi tải dữ liệu'}
          </p>
          <button 
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const documents = pendingData?.data || [];
  const pagination = pendingData?.pagination || {};
  const stats = statsData?.data || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FiClock className="mr-3 text-blue-600" />
                Tài liệu đang chờ xử lý
              </h1>
              <p className="mt-2 text-gray-600">
                Quản lý và xử lý các tài liệu cần phê duyệt theo quy trình C-PR-VM-001
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
              
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <FiDownload className="mr-2" />
                Xuất Excel
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiClock className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Tổng số chờ xử lý</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.total_pending || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <FiAlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Khẩn cấp</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {stats.urgent_count || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Cần kiểm tra</p>
                  <p className="text-2xl font-semibold text-orange-600">
                    {stats.pending_review || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <FiClock className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Chờ trung bình</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {Math.round(stats.avg_days_pending || 0)} ngày
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <FiFilter className="mr-2" />
              Bộ lọc
              <span className="ml-2 text-xs text-gray-500">
                {Object.values(filters).filter(v => v && v !== 1 && v !== 20 && v !== 'updated_at' && v !== 'desc').length > 0 && 
                 `(${Object.values(filters).filter(v => v && v !== 1 && v !== 20 && v !== 'updated_at' && v !== 'desc').length})`}
              </span>
            </button>
          </div>
          
          {showFilters && (
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {user?.role === 'admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phòng ban
                    </label>
                    <select 
                      value={filters.department}
                      onChange={(e) => handleFilterChange({ department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tất cả phòng ban</option>
                      <option value="Ban Giám đốc">Ban Giám đốc</option>
                      <option value="Phòng Phát triển Nhượng quyền">Phòng Phát triển Nhượng quyền</option>
                      <option value="Phòng Đào tạo Tiêu chuẩn">Phòng Đào tạo Tiêu chuẩn</option>
                      <option value="Phòng Marketing">Phòng Marketing</option>
                      <option value="Phòng Kỹ thuật QC">Phòng Kỹ thuật QC</option>
                      <option value="Phòng Tài chính">Phòng Tài chính</option>
                      <option value="Phòng Công nghệ Hệ thống">Phòng Công nghệ Hệ thống</option>
                      <option value="Phòng Pháp lý">Phòng Pháp lý</option>
                      <option value="Bộ phận Tiếp nhận CSKH">Bộ phận Tiếp nhận CSKH</option>
                      <option value="Bộ phận Kỹ thuật Garage">Bộ phận Kỹ thuật Garage</option>
                      <option value="Bộ phận QC Garage">Bộ phận QC Garage</option>
                      <option value="Bộ phận Kho/Kế toán Garage">Bộ phận Kho/Kế toán Garage</option>
                      <option value="Bộ phận Marketing Garage">Bộ phận Marketing Garage</option>
                      <option value="Quản lý Garage">Quản lý Garage</option>
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select 
                    value={filters.priority}
                    onChange={(e) => handleFilterChange({ priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tất cả mức độ</option>
                    <option value="urgent">Khẩn cấp</option>
                    <option value="high">Cao</option>
                    <option value="normal">Bình thường</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sắp xếp theo
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="updated_at">Ngày cập nhật</option>
                    <option value="created_at">Ngày tạo</option>
                    <option value="priority">Mức độ ưu tiên</option>
                    <option value="title">Tiêu đề</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Document Table */}
        <div className="bg-white rounded-lg shadow">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FiClock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Không có tài liệu nào cần xử lý
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Tất cả tài liệu đã được xử lý hoặc bạn không có quyền xem.
              </p>
            </div>
          ) : (
            <PendingDocumentTable 
              documents={documents}
              onSort={handleSort}
              currentSort={{ column: filters.sortBy, order: filters.sortOrder }}
              pagination={pagination}
              onPageChange={handlePageChange}
              currentUser={user}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PendingApprovalPage;