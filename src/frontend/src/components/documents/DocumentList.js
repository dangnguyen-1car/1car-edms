// src/frontend/src/components/documents/DocumentList.js
/**
 * =================================================================
 * EDMS 1CAR - Document List Component (FINAL & COMPLETE)
 * PHIÊN BẢN HOÀN CHỈNH VÀ ĐÃ SỬA LỖI:
 * - Component này chỉ chịu trách nhiệm hiển thị danh sách và thông báo cho component cha
 * khi có hành động (Tạo mới, Sửa, Xóa...) thông qua các props.
 * - Logic "Tạo mới" và "Sửa" được tách biệt rõ ràng.
 * =================================================================
 */

// 1. IMPORTS
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGrid, FiList, FiFilter, FiDownload as FiExport, FiPlus, FiRefreshCw, FiFileText } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { getDocumentTypeDisplay, getStatusDisplay } from '../../utils/documentUtils';

import LoadingSpinner from '../common/LoadingSpinner';
import Pagination from '../common/Pagination';
import ConfirmDialog from '../common/ConfirmDialog';
import DocumentCard from './DocumentCard';
import DocumentTable from './DocumentTable';
import SearchFilters from './SearchFilters';

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
function DocumentList({ 
  documents, 
  onCreate, 
  onEdit, 
  onDeleteSuccess, 
  documentTypeOptions = [], 
  departmentOptions = [], 
  statusOptions = [], 
  isLoadingOptions = false 
}) {
  // 3.1. HOOKS
  const { user, hasPermission } = useAuth();
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
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, document: null });
  const [isExporting, setIsExporting] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Giả định trạng thái fetching

  // 3.3. SIDE EFFECTS
  useEffect(() => {
    localStorage.setItem('documentViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    setPagination(prev => ({ 
        ...prev, 
        page: 1, // Reset về trang 1 khi danh sách tài liệu thay đổi
        total: documents.length, 
        totalPages: Math.ceil(documents.length / prev.limit) 
    }));
  }, [documents]);

  // 3.4. EVENT HANDLERS & LOGIC
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);
  
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
  
  const handleRefresh = useCallback(() => {
    if (onDeleteSuccess) {
        onDeleteSuccess(); // Gọi hàm refetch từ component cha
        toast.success(MESSAGES.REFRESH_SUCCESS);
    }
  }, [onDeleteSuccess]);

  const handleViewDocument = useCallback((documentId) => navigate(`/documents/${documentId}`), [navigate]);

  const handleEditDocument = useCallback((document) => {
    if (!documentService.canEditDocument(document, user)) {
      toast.error(MESSAGES.NO_PERMISSION); 
      return;
    }
    onEdit(document.id); // Gọi prop onEdit với ID
  }, [user, onEdit]);

  const handleDeleteDocument = useCallback((document) => {
    setConfirmDialog({ isOpen: true, document });
  }, []);

  const confirmDelete = useCallback(async () => {
    const { document } = confirmDialog;
    setConfirmDialog({ isOpen: false, document: null });
    try {
      await documentService.deleteDocument(document.id);
      toast.success(MESSAGES.DELETE_SUCCESS);
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa tài liệu');
    }
  }, [confirmDialog, onDeleteSuccess]);
  
  const handleExportExcel = useCallback(async () => {
    const documentsToExport = documents || [];
    if (documentsToExport.length === 0) { 
      toast.error('Không có tài liệu nào để xuất'); 
      return; 
    }
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
  }, [documents]);

  // 3.5. DERIVED DATA (Client-side filtering and sorting)
  const filteredAndSortedDocuments = documents
    .filter(doc => {
      const lowerSearch = filters.search.toLowerCase();
      return (
        (filters.search === '' || doc.title.toLowerCase().includes(lowerSearch) || doc.document_code.toLowerCase().includes(lowerSearch)) &&
        (filters.type === '' || doc.type === filters.type) &&
        (filters.department === '' || doc.department === filters.department) &&
        (filters.status === '' || doc.status === filters.status)
      );
    })
    .sort((a, b) => {
        const [key, direction] = filters.sort.split('_');
        const valA = a[key] || '';
        const valB = b[key] || '';
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

  const paginatedDocuments = filteredAndSortedDocuments.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  );

  const currentPagination = {
      ...pagination,
      total: filteredAndSortedDocuments.length,
      totalPages: Math.ceil(filteredAndSortedDocuments.length / pagination.limit),
  };

  // 3.6. RENDER LOGIC
  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="text-gray-600">{isFetching && <LoadingSpinner size="sm" noMessage={true} className="inline mr-2" />} Tìm thấy {currentPagination.total || 0} tài liệu.</div>
          <div className="flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
              <button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng thẻ"><FiGrid size={18} /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`} title="Xem dạng bảng"><FiList size={18} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className={`btn btn-secondary-outline ${showFilters ? 'bg-gray-100' : ''}`}><FiFilter className="mr-1.5" /> {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</button>
          <button onClick={handleExportExcel} className="btn btn-secondary-outline" disabled={paginatedDocuments.length === 0 || isExporting}><FiExport className="mr-1.5" /> {isExporting ? 'Đang xuất...' : 'Xuất Excel'}</button>
          {hasPermission('create_documents') && (
            <button onClick={onCreate} className="btn btn-primary">
                <FiPlus className="mr-1.5" /> Tạo mới
            </button>
          )}
          <button onClick={handleRefresh} className="btn-icon" title="Làm mới" disabled={isFetching}>
              <FiRefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-fade-in-down">
            <SearchFilters 
                filters={filters} 
                onFiltersChange={handleFilterChange} 
                onClearFilters={handleClearFilters} 
                documentTypeOptions={documentTypeOptions} 
                departmentOptions={departmentOptions} 
                statusOptions={statusOptions} 
                isLoadingOptions={isLoadingOptions}
            />
        </div>
      )}

      {/* Content Area */}
      {paginatedDocuments.length === 0 ? (
        <div className="text-center py-12">
            <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Không tìm thấy tài liệu</h3>
            <p className="text-gray-500">Vui lòng thử lại với bộ lọc khác.</p>
        </div>
      ) : (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedDocuments.map(doc => 
                <DocumentCard 
                  key={doc.id} 
                  document={doc} 
                  onViewClick={() => handleViewDocument(doc.id)} 
                  onEditClick={() => handleEditDocument(doc)} 
                  onDeleteClick={() => handleDeleteDocument(doc)} 
                />
              )}
            </div>
          ) : (
            <DocumentTable 
              documents={paginatedDocuments} 
              onViewClick={(docId) => handleViewDocument(docId)} 
              onEditClick={(doc) => handleEditDocument(doc)} 
              onDeleteClick={(doc) => handleDeleteDocument(doc)} 
              onSort={handleSortChange} 
              currentSort={filters.sort} 
            />
          )}
        </>
      )}
      
      {/* Pagination */}
      {currentPagination.totalPages > 1 && paginatedDocuments.length > 0 && (
        <div className="mt-8">
            <Pagination 
                currentPage={currentPagination.page} 
                totalPages={currentPagination.totalPages} 
                totalItems={currentPagination.total} 
                pageSize={currentPagination.limit} 
                onPageChange={handlePageChange} 
                onPageSizeChange={handlePageSizeChange} 
            />
        </div>
      )}

      {/* Modals & Dialogs */}
      <ConfirmDialog 
        isOpen={confirmDialog.isOpen} 
        title="Xác nhận xóa" 
        message={`Bạn có chắc muốn xóa tài liệu "${confirmDialog.document?.title}"?`} 
        onConfirm={confirmDelete} 
        onCancel={() => setConfirmDialog({ isOpen: false, document: null })} 
        type="danger" 
      />
    </div>
  );
}

export default DocumentList;