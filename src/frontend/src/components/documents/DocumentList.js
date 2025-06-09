// src/frontend/src/components/documents/DocumentList.js
/** * =================================================================
 * EDMS 1CAR - Document List Component (REVISED to use documentService)
 * =================================================================
 */

// 1. IMPORTS
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiEye, FiEdit, FiDownload, FiUser, FiCalendar, FiTag, FiSearch, FiFilter, FiRefreshCw, FiAlertCircle, FiPlus, FiGrid, FiList, FiDownload as FiExport } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { getDocumentTypeDisplay, getStatusDisplay } from '../../utils/documentUtils';
import LoadingSpinner from '../common/LoadingSpinner';
import SkeletonLoader from '../common/SkeletonLoader';
import Pagination from '../common/Pagination';
import DocumentCard from './DocumentCard';
import DocumentTable from './DocumentTable';
import SearchFilters from './SearchFilters';
import CreateDocumentModal from './CreateDocumentModal';
import ConfirmDialog from '../common/ConfirmDialog';

// 2. CONSTANTS
const MESSAGES = {
  CREATE_SUCCESS: 'Tạo tài liệu thành công!',
  UPDATE_SUCCESS: 'Cập nhật tài liệu thành công!',
  DELETE_SUCCESS: 'Xóa tài liệu thành công!',
  DELETE_CONFIRM: 'Bạn có chắc muốn xóa tài liệu này?',
  NO_PERMISSION: 'Bạn không có quyền thực hiện hành động này.',
  EXPORT_SUCCESS: (count) => `Đã xuất ${count} tài liệu ra Excel.`
};

// 3. COMPONENT DEFINITION
function DocumentList({
  onDocumentSelect,
  documentTypeOptions = [],
  departmentOptions = [],
  statusOptions = [],
  isLoadingOptions = false
}) {
  // 3.1. HOOKS
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 3.2. STATE MANAGEMENT
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    department: '',
    status: '',
    date_from: '',
    date_to: '',
    include_archived: false,
    search_content: false,
    exact_match: false,
    sort: 'updated_at_desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, document: null });
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('documentViewMode') || 'card';
    } catch (error) {
      console.warn('Failed to read view mode from localStorage:', error);
      return 'card';
    }
  });

  // 3.3. SIDE EFFECTS
  useEffect(() => {
    try {
      localStorage.setItem('documentViewMode', viewMode);
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error);
    }
  }, [viewMode]);

  // 3.4. DATA FETCHING (React Query)
  const {
    data: documentsResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['documents', currentPage, pageSize, filters],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        search: filters.search || undefined,
        type: filters.type || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        include_archived: filters.include_archived,
        search_content: filters.search_content,
        exact_match: filters.exact_match,
        sort: filters.sort,
      };
      return documentService.searchDocuments(params);
    },
    {
      keepPreviousData: true,
      staleTime: 1 * 60 * 1000,
      onError: (err) => {
        console.error('Error fetching documents:', err);
        toast.error(err.response?.data?.message || err.message || 'Lỗi tải danh sách tài liệu');
      }
    }
  );

  // 3.5. EVENT HANDLERS & LOGIC
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '', type: '', department: '', status: '',
      date_from: '', date_to: '', include_archived: false,
      search_content: false, exact_match: false, sort: 'updated_at_desc'
    });
    setCurrentPage(1);
  };

  const handlePageChange = (page) => setCurrentPage(page);
  const handlePageSizeChange = (size) => { setPageSize(size); setCurrentPage(1); };
  const handleRefresh = () => refetch();
  const handleViewModeChange = (newMode) => setViewMode(newMode);

  const handleDocumentCreated = () => {
    setShowCreateModal(false);
    toast.success(MESSAGES.CREATE_SUCCESS);
    queryClient.invalidateQueries('documents');
  };

  const handleViewDocument = (documentId) => {
    toast.info(`Điều hướng đến chi tiết tài liệu ID: ${documentId}`);
    if (onDocumentSelect) onDocumentSelect(documentId);
  };

  const handleEditDocument = (documentId) => {
    toast.info(`Điều hướng đến chỉnh sửa tài liệu ID: ${documentId}`);
  };

  const handleDeleteDocument = (document) => {
    setConfirmDialog({ isOpen: true, document });
  };

  const confirmDelete = async () => {
    const { document } = confirmDialog;
    setConfirmDialog({ isOpen: false, document: null });
    try {
      await documentService.deleteDocument(document.id);
      toast.success(MESSAGES.DELETE_SUCCESS);
      queryClient.invalidateQueries('documents');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Lỗi khi xóa tài liệu');
    }
  };
  
  const handleExportExcel = async () => {
    if (documents.length === 0) {
      toast.error('Không có tài liệu nào để xuất');
      return;
    }
    setIsExporting(true);
    try {
      const exportData = documents.map(doc => ({
        'Mã tài liệu': doc.document_code,
        'Tiêu đề': doc.title,
        'Loại': getDocumentTypeDisplay(doc.type),
        'Phòng ban': doc.department,
        'Trạng thái': getStatusDisplay(doc.status),
        'Phiên bản': doc.version,
        'Ngày tạo': new Date(doc.created_at).toLocaleDateString('vi-VN'),
        'Ngày cập nhật': new Date(doc.updated_at).toLocaleDateString('vi-VN'),
        'Tác giả': doc.author_name,
        'Mô tả': doc.description || '',
        'Mức bảo mật': doc.security_level
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách tài liệu');
  
      const colWidths = Object.keys(exportData[0]).map(key => ({
        wch: Math.max(key.length, ...exportData.map(row => String(row[key]).length))
      }));
      ws['!cols'] = colWidths;
  
      const fileName = `danh-sach-tai-lieu-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
  
      toast.success(MESSAGES.EXPORT_SUCCESS(exportData.length));
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // 3.6. DERIVED DATA
  const documents = documentsResponse?.data?.documents || [];
  const pagination = documentsResponse?.data?.pagination || {
    total: 0, totalPages: 1, page: currentPage, limit: pageSize
  };

  // 3.7. RENDER LOGIC
  // Loading State
  if (isLoading && !documentsResponse) {
    return <div className="py-8"><SkeletonLoader type="card" count={6} /></div>;
  }

  // Error State
  if (isError && !documentsResponse) {
    return (
      <div className="text-center py-10">
        <FiAlertCircle className="mx-auto text-red-500 h-12 w-12 mb-2" />
        <p className="text-red-600">Lỗi tải danh sách tài liệu: {error.message}</p>
        <button onClick={handleRefresh} className="btn btn-primary mt-4">Thử lại</button>
      </div>
    );
  }

  // Main Component Render
  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-gray-600">
            {isFetching && !isLoading ? <LoadingSpinner size="sm" noMessage={true} className="inline mr-2" /> : null}
            Tìm thấy {pagination.total || 0} tài liệu.
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => handleViewModeChange('card')}
              className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              title="Xem dạng thẻ"
              aria-label="Chuyển sang chế độ xem dạng thẻ"
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => handleViewModeChange('table')}
              className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm transform scale-105' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              title="Xem dạng bảng"
              aria-label="Chuyển sang chế độ xem dạng bảng"
            >
              <FiList size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary-outline ${showFilters ? 'bg-gray-100' : ''}`}>
            <FiFilter className="mr-1.5" /> {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </button>
          <button onClick={handleExportExcel} className="btn btn-secondary-outline" disabled={documents.length === 0 || isExporting}>
            <FiExport className="mr-1.5" />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          {hasPermission('create_documents') && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <FiPlus className="mr-1.5" /> Tạo mới
            </button>
          )}
          <button onClick={handleRefresh} className="btn-icon" title="Làm mới danh sách" disabled={isFetching}>
            <FiRefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            showAdvanced={true}
            onToggleAdvanced={() => setShowFilters(!showFilters)}
            documentTypeOptions={documentTypeOptions}
            departmentOptions={departmentOptions}
            statusOptions={statusOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </div>
      )}

      {/* Content Area */}
      {isLoading && !documents.length ? (
        <div className="py-8"><SkeletonLoader type="card" count={pageSize} /></div>
      ) : !isLoading && documents.length === 0 && !isFetching ? (
        <div className="text-center py-12">
          <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy tài liệu</h3>
          <p className="text-gray-500">Vui lòng thử lại với bộ lọc khác hoặc tạo tài liệu mới.</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onViewClick={handleViewDocument}
                  onEditClick={handleEditDocument}
                  onDeleteClick={handleDeleteDocument}
                />
              ))}
            </div>
          ) : (
            <DocumentTable
              documents={documents}
              onViewClick={handleViewDocument}
              onEditClick={handleEditDocument}
              onDeleteClick={handleDeleteDocument}
              onSort={(column) => {
                const currentSort = filters.sort;
                let newSort;
                if (currentSort === `${column}_asc`) {
                  newSort = `${column}_desc`;
                } else {
                  newSort = `${column}_asc`;
                }
                handleFilterChange({ ...filters, sort: newSort });
              }}
              currentSort={filters.sort}
            />
          )}
        </>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && documents.length > 0 && (
        <div className="mt-8">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* Modals & Dialogs */}
      {showCreateModal && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDocumentCreated}
          documentTypeOptions={documentTypeOptions}
          departmentOptions={departmentOptions}
          isLoadingOptions={isLoadingOptions}
        />
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Xác nhận xóa tài liệu"
        message={`Bạn có chắc muốn xóa tài liệu "${confirmDialog.document?.title}"?`}
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, document: null })}
        type="danger"
      />
    </div>
  );
}

// 4. EXPORT
export default DocumentList;