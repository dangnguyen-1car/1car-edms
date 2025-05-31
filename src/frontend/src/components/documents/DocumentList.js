/** 
 * =================================================================
 * EDMS 1CAR - Document List Component (API Integration with useQuery)
 * Display documents with pagination and filtering for 40 users
 * Based on C-WI-AR-001, C-TD-VM-001, and C-PR-VM-001 requirements
 * =================================================================
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  FiFileText, FiEye, FiEdit, FiDownload, FiUser, FiCalendar, 
  FiTag, FiSearch, FiFilter, FiRefreshCw, FiAlertCircle, FiPlus 
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { documentAPI } from '../../api/documentApi';
import LoadingSpinner from '../common/LoadingSpinner';
import SkeletonLoader from '../common/SkeletonLoader';
import Pagination from '../common/Pagination';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';
import CreateDocumentModal from './CreateDocumentModal'; // **THÊM MỚI**

function DocumentList({ onDocumentSelect }) {
  const { user, hasPermission, canAccessDepartment } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // **THÊM MỚI**
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    department: '',
    status: '',
    author_id: '',
    date_from: '',
    date_to: ''
  });

  // Fetch documents with React Query - Updated to use documentAPI
  const {
    data: documentsData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['documents', currentPage, pageSize, filters],
    async () => {
      // Prepare params for API call
      const params = {
        page: currentPage,
        limit: pageSize,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      // Call the real API
      const response = await documentAPI.getDocuments(params);
      return response;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        console.error('Error fetching documents:', error);
      }
    }
  );

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle page size change
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Handle document click
  const handleDocumentClick = (document) => {
    if (onDocumentSelect) {
      onDocumentSelect(document);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // **THÊM MỚI: Xử lý sau khi tạo tài liệu thành công**
  const handleDocumentCreated = () => {
    refetch(); // Refresh danh sách tài liệu
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: '',
      department: '',
      status: '',
      author_id: '',
      date_from: '',
      date_to: ''
    });
  };

  // Get document type display name based on C-TD-MG-005
  const getDocumentTypeDisplay = (type) => {
    const types = {
      'PL': 'Chính sách',
      'PR': 'Quy trình',
      'WI': 'Hướng dẫn',
      'FM': 'Biểu mẫu',
      'TD': 'Tài liệu kỹ thuật',
      'TR': 'Tài liệu đào tạo',
      'RC': 'Hồ sơ'
    };
    return types[type] || type;
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    const colors = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'review': 'bg-blue-100 text-blue-800',
      'published': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Get status display name
  const getStatusDisplay = (status) => {
    const statuses = {
      'draft': 'Bản nháp',
      'review': 'Đang xem xét',
      'published': 'Đã phê duyệt',
      'archived': 'Đã lưu trữ'
    };
    return statuses[status] || status;
  };

  // Check if user can edit document
  const canEditDocument = (document) => {
    if (hasPermission('manage_system')) return true;
    if (document.author_id === user.id) return true;
    if (canAccessDepartment(document.department) && document.status === 'draft') return true;
    return false;
  };

  // Check if user can view document
  const canViewDocument = (document) => {
    if (hasPermission('view_all_documents')) return true;
    if (document.author_id === user.id) return true;
    if (canAccessDepartment(document.department)) return true;
    // Check if user is in recipients list
    if (document.recipients && document.recipients.includes(user.department)) return true;
    return false;
  };

  // Extract data from API response
  const documents = documentsData?.data?.documents || [];
  const pagination = documentsData?.data?.pagination || { total: 0 };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonLoader />
        <SkeletonLoader />
        <SkeletonLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FiAlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Lỗi kết nối</h3>
        <p className="text-gray-500 text-center mb-4">
          {error?.message || 'Đã xảy ra lỗi khi kết nối với server'}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiRefreshCw size={16} />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* **THÊM MỚI: Header với nút tạo tài liệu** */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý tài liệu</h1>
          <p className="text-gray-600 mt-1">
            {pagination.total || 0} tài liệu được tìm thấy
            {isFetching && (
              <span className="ml-2 text-blue-600">
                <LoadingSpinner size="sm" className="inline" /> Đang tải...
              </span>
            )}
          </p>
        </div>
        
        {/* Nút tạo tài liệu mới */}
        {hasPermission('create_documents') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiPlus size={16} />
            Tạo tài liệu mới
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            showAdvanced={showFilters}
            onToggleAdvanced={() => setShowFilters(!showFilters)}
          />
        </div>
      </div>

      {/* Documents Grid/List */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy tài liệu</h3>
          <p className="text-gray-500 mb-4">
            Thử thay đổi bộ lọc hoặc tạo tài liệu mới.
          </p>
          {hasPermission('create_documents') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tạo tài liệu đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {documents.map((document) => (
            <div
              key={document.id}
              className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleDocumentClick(document)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
                      {document.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {document.document_code} • {getDocumentTypeDisplay(document.type)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(document.status)}`}>
                    {getStatusDisplay(document.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <FiUser size={14} />
                      <span>{document.author_name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiCalendar size={14} />
                      <span>{new Date(document.created_at).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {canViewDocument(document) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle view action
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Xem tài liệu"
                      >
                        <FiEye size={16} />
                      </button>
                    )}
                    {canEditDocument(document) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit action
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <FiEdit size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        documentAPI.downloadDocument(document.id);
                      }}
                      className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                      title="Tải xuống"
                    >
                      <FiDownload size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {documents.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages || 1}
          totalItems={pagination.total || 0}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* **THÊM MỚI: Modal tạo tài liệu** */}
      <CreateDocumentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleDocumentCreated}
      />
    </div>
  );
}

export default DocumentList;
