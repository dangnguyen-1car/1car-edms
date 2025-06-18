// src/frontend/src/pages/DocumentsPage.js

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiPlus, FiFilter, FiRefreshCw, FiGrid, FiList, FiFileText } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// --- Component Imports ---
import DocumentList from '../components/documents/DocumentList';
import Breadcrumb from '../components/common/Breadcrumb';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import DocumentFormWrapper from '../components/documents/DocumentFormWrapper';
import SearchFilters from '../components/documents/SearchFilters';
import Pagination from '../components/common/Pagination';

// --- Service & Context Imports ---
import { documentService } from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';

// --- Utility Imports ---
import { documentTypeOptions, departmentOptions } from '../utils/documentUtils';

/**
 * =================================================================
 * EDMS 1CAR - DocumentsPage (FINAL & RESTRUCTURED)
 *
 * Chức năng:
 * - Quản lý toàn bộ state và logic cho trang Quản lý tài liệu.
 * - Hiển thị các nút điều khiển chính (Tạo mới, Làm mới, Lọc, Chế độ xem).
 * - Render component SearchFilters và quản lý việc hiển thị của nó.
 * - Fetch dữ liệu dựa trên bộ lọc và phân trang.
 * - Truyền dữ liệu cuối cùng xuống cho DocumentList để hiển thị.
 *
 * Sửa lỗi:
 * - Đã chuyển toàn bộ UI và logic điều khiển từ DocumentList lên đây,
 * giải quyết vấn đề nút "Hiện bộ lọc" bị lặp và không hoạt động.
 * - Cấu trúc component rõ ràng, dễ bảo trì hơn.
 * =================================================================
 */
function DocumentsPage() {
  // === HOOKS & STATE MANAGEMENT ===
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState(null);

  // Filter & View states
  const [filters, setFilters] = useState({
    search: '', type: '', department: '', status: '',
    sort: 'updated_at_desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    const savedMode = localStorage.getItem('documentViewMode');
    return savedMode || 'card';
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // === DATA FETCHING ===
  const { data: workflowStatesData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['workflowStatesForFilter'],
    queryFn: documentService.getWorkflowStates,
    staleTime: 10 * 60 * 1000,
  });

  const statusOptions = useMemo(() =>
    workflowStatesData?.data?.workflowStates.map(s => ({ value: s.code, label: s.name })) || [],
    [workflowStatesData]
  );

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['documents', currentPage, pageSize, filters],
    queryFn: () => {
        const searchParams = { page: currentPage, limit: pageSize, ...filters };
        Object.keys(searchParams).forEach(key => {
            if (!searchParams[key]) delete searchParams[key];
        });
        return documentService.searchDocuments(searchParams);
    },
    select: (res) => {
        if (res?.success) {
            return {
                documents: res.data?.results || [],
                pagination: res.data?.pagination || { total: 0, totalPages: 1, page: 1, limit: pageSize }
            };
        }
        return { documents: [], pagination: { total: 0, totalPages: 1, page: 1, limit: pageSize } };
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  const { documents, pagination } = response || { documents: [], pagination: { total: 0, totalPages: 1, page: 1, limit: pageSize } };

  // === DERIVED DATA & BREADCRUMBS ===
  const breadcrumbItems = [
    { label: 'Trang chủ', href: '/', current: false },
    { label: 'Quản lý tài liệu', href: '/documents', current: true },
  ];

  // === EVENT HANDLERS ===
  const handleOpenCreateModal = () => {
    setEditingDocumentId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEditDocument = (docId) => {
    setEditingDocumentId(docId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDocumentId(null);
  };

  const handleSuccess = () => {
    refetch();
    handleCloseModal();
  };

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
        search: '', type: '', department: '', status: '',
        sort: 'updated_at_desc'
    });
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    toast.promise(refetch(), {
      loading: 'Đang làm mới...',
      success: 'Đã làm mới danh sách tài liệu!',
      error: 'Làm mới thất bại!',
    });
  }, [refetch]);
  
  const handleSetViewMode = (mode) => {
      setViewMode(mode);
      localStorage.setItem('documentViewMode', mode);
  };

  const handlePageChange = (page) => setCurrentPage(page);
  const handlePageSizeChange = (size) => {
      setPageSize(size);
      setCurrentPage(1);
  };

  // === RENDER LOGIC ===
  if (isLoading && !response) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner message="Đang tải danh sách tài liệu..." />
      </div>
    );
  }

  if (isError) {
    return <ErrorMessage message={error.message || "Đã xảy ra lỗi khi tải tài liệu."} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Quản lý tài liệu</h1>
            <p className="mt-1 text-sm text-gray-600">
              Quản lý và tìm kiếm tài liệu trong hệ thống EDMS 1CAR
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
             {hasPermission('create_documents') && (
                <button onClick={handleOpenCreateModal} className="btn btn-primary w-full sm:w-auto">
                    <FiPlus className="mr-1.5" /> Tạo mới
                </button>
              )}
              <button onClick={handleRefresh} className="btn-icon p-2" title="Làm mới" disabled={isFetching}>
                  <FiRefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
          </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
            {/* Filter Controls */}
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                        {isFetching ? <LoadingSpinner size="sm" noMessage={true} className="inline mr-2" /> : null} 
                        Tìm thấy {pagination.total || 0} tài liệu.
                    </div>
                    <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
                        <button onClick={() => handleSetViewMode('card')} className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng thẻ"><FiGrid size={18} /></button>
                        <button onClick={() => handleSetViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng bảng"><FiList size={18} /></button>
                    </div>
                </div>
                <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary-outline ${showFilters ? 'bg-gray-100' : ''}`}>
                    <FiFilter className="mr-1.5" /> {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
                </button>
            </div>
            
            {showFilters && (
                <div className="animate-fade-in-down mb-6">
                    <SearchFilters 
                        filters={filters} 
                        onFiltersChange={handleFilterChange} 
                        onClearFilters={handleClearFilters} 
                        documentTypeOptions={documentTypeOptions} 
                        departmentOptions={departmentOptions.map(d => ({ value: d.label, label: d.label }))} 
                        statusOptions={statusOptions}
                        isLoadingOptions={isLoadingOptions}
                        showAdvanced={true}
                    />
                </div>
            )}
            
            {/* Document List */}
            {documents.length > 0 ? (
                <DocumentList
                    documents={documents}
                    isLoading={isFetching}
                    viewMode={viewMode}
                    onEdit={handleEditDocument}
                    onDeleteSuccess={handleSuccess}
                    onSortChange={(sortKey) => handleFilterChange({ sort: sortKey })}
                    currentSort={filters.sort}
                />
            ) : (
                <div className="text-center py-12">
                    <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700">Không tìm thấy tài liệu</h3>
                    <p className="text-gray-500">Vui lòng thử lại với bộ lọc khác hoặc tạo tài liệu mới.</p>
                </div>
            )}
        </div>

        {pagination && pagination.totalPages > 1 && (
            <div className="p-6 border-t border-gray-200">
                <Pagination 
                    currentPage={pagination.page || currentPage} 
                    totalPages={pagination.totalPages} 
                    totalItems={pagination.total} 
                    pageSize={pagination.limit || pageSize} 
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                />
            </div>
        )}
      </div>
      
      {/* Modals */}
      {isModalOpen && (
        <DocumentFormWrapper
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          isEditMode={isEditMode}
          documentId={editingDocumentId}
        />
      )}
    </div>
  );
}

export default DocumentsPage;