// src/frontend/src/components/documents/DocumentList.js
/**
 * =================================================================
 * EDMS 1CAR - Document List Component (MERGED & FIXED)
 * =================================================================
 */

// 1. IMPORTS
import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiList, FiFilter, FiDownload as FiExport, FiPlus, FiRefreshCw, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { getDocumentTypeDisplay, getStatusDisplay } from '../../utils/documentUtils';

import LoadingSpinner from '../common/LoadingSpinner';
import SkeletonLoader from '../common/SkeletonLoader';
import Pagination from '../common/Pagination';
import ConfirmDialog from '../common/ConfirmDialog';

import DocumentCard from './DocumentCard';
import DocumentTable from './DocumentTable';
import SearchFilters from './SearchFilters';
import DocumentFormWrapper from './DocumentFormWrapper';

// 2. CONSTANTS
const MESSAGES = {
  CREATE_SUCCESS: 'Tạo tài liệu thành công!',
  UPDATE_SUCCESS: 'Cập nhật tài liệu thành công!',
  DELETE_SUCCESS: 'Xóa tài liệu thành công!',
  DELETE_CONFIRM: 'Bạn có chắc muốn xóa tài liệu này?',
  NO_PERMISSION: 'Bạn không có quyền thực hiện hành động này.',
  EXPORT_SUCCESS: (count) => `Đã xuất ${count} tài liệu ra Excel.`,
  REFRESH_SUCCESS: 'Đã làm mới danh sách tài liệu'
};

// 3. COMPONENT DEFINITION
function DocumentList({ documentTypeOptions = [], departmentOptions = [], statusOptions = [], isLoadingOptions = false }) {
  // 3.1. HOOKS
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 3.2. STATE MANAGEMENT
  const [filters, setFilters] = useState({
    search: '', type: '', department: '', status: '',
    date_from: '', date_to: '', include_archived: false,
    search_content: false, exact_match: false, sort: 'updated_at_desc'
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('documentViewMode') || 'card');
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, document: null });
  const [isExporting, setIsExporting] = useState(false);

  // 3.3. SIDE EFFECTS
  useEffect(() => {
    localStorage.setItem('documentViewMode', viewMode);
  }, [viewMode]);

  // 3.4. DATA FETCHING
  const {
    data: documentsResponse,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['documents', pagination.page, pagination.limit, filters],
    queryFn: () => documentService.searchDocuments({ ...filters, page: pagination.page, limit: pagination.limit }),
    keepPreviousData: true,
    staleTime: 30 * 1000,
    onSuccess: (data) => {
      if (data?.data?.pagination) {
        setPagination(prev => ({ ...prev, ...data.data.pagination }));
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Lỗi tải danh sách tài liệu'),
  });

  // 3.5. EVENT HANDLERS & LOGIC
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
  // SỬA LỖI 3: Tách logic sắp xếp ra hàm riêng để code sạch hơn
  const handleSortChange = useCallback((column) => {
    const newSort = filters.sort === `${column}_asc` ? `${column}_desc` : `${column}_asc`;
    handleFilterChange({ sort: newSort });
  }, [filters.sort, handleFilterChange]);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '', type: '', department: '', status: '',
      date_from: '', date_to: '', include_archived: false,
      search_content: false, exact_match: false, sort: 'updated_at_desc'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page) => setPagination(prev => ({ ...prev, page })), []);
  const handlePageSizeChange = useCallback((size) => setPagination({ page: 1, limit: size, total: 0, totalPages: 1 }), []);
  const handleRefresh = useCallback(() => { refetch(); toast.success(MESSAGES.REFRESH_SUCCESS) }, [refetch]);
  const handleViewDocument = useCallback((documentId) => navigate(`/documents/${documentId}`), [navigate]);

  const handleEditDocument = useCallback((document) => {
    if (!documentService.canEditDocument(document, user)) {
      toast.error(MESSAGES.NO_PERMISSION); return;
    }
    setSelectedDocument(document);
    setEditModalOpen(true);
  }, [user]);

  const handleDeleteDocument = useCallback((document) => {
    setConfirmDialog({ isOpen: true, document });
  }, []);

  const confirmDelete = useCallback(async () => {
    const { document } = confirmDialog;
    setConfirmDialog({ isOpen: false, document: null });
    try {
      await documentService.deleteDocument(document.id);
      toast.success(MESSAGES.DELETE_SUCCESS);
      queryClient.invalidateQueries(['documents']);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa tài liệu');
    }
  }, [confirmDialog, queryClient]);

  const handleModalSuccess = useCallback((doc, isEditMode) => {
    toast.success(isEditMode ? MESSAGES.UPDATE_SUCCESS : MESSAGES.CREATE_SUCCESS);
    setCreateModalOpen(false); setEditModalOpen(false); setSelectedDocument(null);
    queryClient.invalidateQueries(['documents']);
  }, [queryClient]);
  
  const handleExportExcel = useCallback(async () => {
    const documentsToExport = documentsResponse?.data?.results || [];
    if (documentsToExport.length === 0) { toast.error('Không có tài liệu nào để xuất'); return; }
    setIsExporting(true);
    try {
      const exportData = documentsToExport.map(doc => ({
        'Mã tài liệu': doc.document_code, 'Tiêu đề': doc.title, 'Loại': getDocumentTypeDisplay(doc.type),
        'Phòng ban': doc.department, 'Trạng thái': getStatusDisplay(doc.status), 'Phiên bản': doc.version,
        'Ngày tạo': new Date(doc.created_at).toLocaleDateString('vi-VN'), 'Tác giả': doc.author_name,
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách tài liệu');
      XLSX.writeFile(wb, `danh-sach-tai-lieu-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(MESSAGES.EXPORT_SUCCESS(exportData.length));
    } catch (err) {
      toast.error('Lỗi khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  }, [documentsResponse]);

  // 3.6. DERIVED DATA
  const documents = documentsResponse?.data?.results || [];
  const currentPagination = documentsResponse?.data?.pagination || pagination;

  // SỬA LỖI 2: Điều kiện hiển thị skeleton chính xác hơn
  const showSkeleton = isLoading && !documentsResponse;

  // 3.7. RENDER LOGIC
  if (showSkeleton) return <div className="py-8"><SkeletonLoader type="card" count={pagination.limit} /></div>;
  if (isError && !documentsResponse) return (
      <div className="text-center py-10"><FiAlertCircle className="mx-auto text-red-500 h-12 w-12 mb-2" /><p className="text-red-600">Lỗi: {error.message}</p><button onClick={handleRefresh} className="btn btn-primary mt-4">Thử lại</button></div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-gray-600">{isFetching && <LoadingSpinner size="sm" noMessage={true} className="inline mr-2" />} Tìm thấy {currentPagination.total || 0} tài liệu.</div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm"><button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng thẻ"><FiGrid size={18} /></button><button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng bảng"><FiList size={18} /></button></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary-outline ${showFilters ? 'bg-gray-100' : ''}`}><FiFilter className="mr-1.5" /> {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</button>
          <button onClick={handleExportExcel} className="btn btn-secondary-outline" disabled={documents.length === 0 || isExporting}><FiExport className="mr-1.5" /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}</button>
          {hasPermission('create_documents') && (<button onClick={() => setCreateModalOpen(true)} className="btn btn-primary"><FiPlus className="mr-1.5" /> Tạo mới</button>)}
          <button onClick={handleRefresh} className="btn-icon" title="Làm mới" disabled={isFetching}><FiRefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-fade-in-down"><SearchFilters filters={filters} onFiltersChange={handleFilterChange} onClearFilters={handleClearFilters} documentTypeOptions={documentTypeOptions} departmentOptions={departmentOptions} statusOptions={statusOptions} isLoadingOptions={isLoadingOptions}/></div>)}

      {/* Content Area */}
      {documents.length === 0 ? <div className="text-center py-12"><FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" /><h3 className="text-xl font-semibold text-gray-700">Không tìm thấy tài liệu</h3><p className="text-gray-500">Vui lòng thử lại với bộ lọc khác.</p></div>
      : (
        <>
          {viewMode === 'card' ? (
            // SỬA LỖI 1: Xóa bỏ các ký tự < > thừa bao quanh {documents.map}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {documents.map(doc => <DocumentCard key={doc.id} document={doc} onViewClick={handleViewDocument} onEditClick={handleEditDocument} onDeleteClick={handleDeleteDocument} />)}
            </div>
          ) : (
            <DocumentTable documents={documents} onViewClick={handleViewDocument} onEditClick={handleEditDocument} onDeleteClick={handleDeleteDocument} onSort={handleSortChange} currentSort={filters.sort} />
          )}
        </>
      )}
      
      {/* Pagination */}
      {currentPagination.totalPages > 1 && documents.length > 0 && (<div className="mt-8"><Pagination currentPage={currentPagination.page} totalPages={currentPagination.totalPages} totalItems={currentPagination.total} pageSize={currentPagination.limit} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} /></div>)}

      {/* Modals & Dialogs */}
      <DocumentFormWrapper isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleModalSuccess} isEditMode={false} />
      <DocumentFormWrapper isOpen={isEditModalOpen} onClose={() => { setEditModalOpen(false); setSelectedDocument(null); }} onSuccess={handleModalSuccess} isEditMode={true} initialDocument={selectedDocument} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title="Xác nhận xóa" message={`Bạn có chắc muốn xóa tài liệu "${confirmDialog.document?.title}"?`} onConfirm={confirmDelete} onCancel={() => setConfirmDialog({ isOpen: false, document: null })} type="danger" />
    </div>
  );
}

export default DocumentList;