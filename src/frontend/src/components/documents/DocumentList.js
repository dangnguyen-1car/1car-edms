/**
 * =================================================================
 * EDMS 1CAR - Document List Component (Fixed Warnings)
 * Display documents with pagination and filtering for 40 users
 * Based on C-WI-AR-001, C-TD-VM-001, and C-PR-VM-001 requirements
 * =================================================================
 */

import React, { useState } from 'react'; // Removed unused useEffect
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiEye, 
  FiEdit, 
  FiDownload, 
  FiUser,
  FiCalendar,
  FiTag,
  FiSearch,
  FiFilter
} from 'react-icons/fi'; // Removed unused FiClock
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import LoadingSpinner from '../common/LoadingSpinner';
import Pagination from '../common/Pagination';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';

function DocumentList() {
  const { user, hasPermission, canAccessDepartment } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    department: '',
    status: '',
    author_id: '',
    date_from: '',
    date_to: ''
  });

  // Fetch documents with React Query
  const {
    data: documentsData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery(
    ['documents', currentPage, pageSize, filters],
    () => documentService.searchDocuments({
      ...filters,
      page: currentPage,
      limit: pageSize
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
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
      'draft': 'badge-warning',
      'review': 'badge-info',
      'published': 'badge-success',
      'archived': 'badge-danger'
    };
    return colors[status] || 'badge-info';
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

  if (isLoading) {
    return <LoadingSpinner message="Đang tải danh sách tài liệu..." />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FiFileText className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium">Không thể tải danh sách tài liệu</p>
          <p className="text-sm">{error?.message || 'Đã xảy ra lỗi'}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn btn-primary"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const documents = documentsData?.data || [];
  const pagination = documentsData?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài liệu</h1>
          <p className="mt-1 text-sm text-gray-500">
            {pagination.total || 0} tài liệu được tìm thấy
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* View mode toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Lưới
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Danh sách
            </button>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center`}
          >
            <FiFilter className="h-4 w-4 mr-2" />
            Bộ lọc
          </button>

          {/* Create document button */}
          {hasPermission('create_documents') && (
            <Link
              to="/documents/create"
              className="btn btn-primary flex items-center"
            >
              <FiFileText className="h-4 w-4 mr-2" />
              Tạo tài liệu
            </Link>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Quick search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="form-input pl-10"
            placeholder="Tìm kiếm tài liệu theo tiêu đề, mã tài liệu..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClearFilters={() => handleFilterChange({
              search: '',
              type: '',
              department: '',
              status: '',
              author_id: '',
              date_from: '',
              date_to: ''
            })}
          />
        )}
      </div>

      {/* Documents display */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FiFileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Không tìm thấy tài liệu
          </h3>
          <p className="text-gray-500 mb-6">
            Thử thay đổi bộ lọc hoặc tạo tài liệu mới.
          </p>
          {hasPermission('create_documents') && (
            <Link
              to="/documents/create"
              className="btn btn-primary"
            >
              Tạo tài liệu đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((document) => (
                canViewDocument(document) && (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    canEdit={canEditDocument(document)}
                    onRefresh={refetch}
                  />
                )
              ))}
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {documents.map((document) => (
                  canViewDocument(document) && (
                    <li key={document.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0 flex-1">
                            <div className="flex-shrink-0">
                              <FiFileText className="h-8 w-8 text-primary-600" />
                            </div>
                            <div className="min-w-0 flex-1 px-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Link
                                    to={`/documents/${document.id}`}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-500 truncate"
                                  >
                                    {document.title}
                                  </Link>
                                  <p className="text-sm text-gray-500 truncate">
                                    {document.document_code} • {getDocumentTypeDisplay(document.type)}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`badge ${getStatusBadgeColor(document.status)}`}>
                                    {getStatusDisplay(document.status)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    v{document.version}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <div className="flex items-center">
                                  <FiUser className="h-4 w-4 mr-1" />
                                  {document.author_name || 'N/A'}
                                </div>
                                <div className="flex items-center">
                                  <FiTag className="h-4 w-4 mr-1" />
                                  {document.department}
                                </div>
                                <div className="flex items-center">
                                  <FiCalendar className="h-4 w-4 mr-1" />
                                  {new Date(document.created_at).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Link
                              to={`/documents/${document.id}`}
                              className="btn btn-outline btn-sm flex items-center"
                            >
                              <FiEye className="h-4 w-4 mr-1" />
                              Xem
                            </Link>
                            {canEditDocument(document) && (
                              <Link
                                to={`/documents/${document.id}/edit`}
                                className="btn btn-outline btn-sm flex items-center"
                              >
                                <FiEdit className="h-4 w-4 mr-1" />
                                Sửa
                              </Link>
                            )}
                            {document.file_path && (
                              <button
                                onClick={() => documentService.downloadDocument(document.id)}
                                className="btn btn-outline btn-sm flex items-center"
                              >
                                <FiDownload className="h-4 w-4 mr-1" />
                                Tải
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                ))}
              </ul>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="form-input text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">
                  trên {pagination.total} tài liệu
                </span>
              </div>

              <div className="mt-4 sm:mt-0">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  showFirstLast={true}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DocumentList;
