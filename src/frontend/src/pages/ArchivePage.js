// src/frontend/src/pages/ArchivePage.js
/**
 * =================================================================
 * EDMS 1CAR - Archive Page (Admin Only - ESLint Hooks Fixed & isError defined)
 * Archived documents management interface
 * =================================================================
 */

// Imports
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FiArchive, FiRotateCcw, FiAlertCircle, FiSearch, FiFilter, FiFileText, FiCalendar, FiUser, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
// Layout sẽ được áp dụng bởi ProtectedRoute trong App.js
// import Layout from '../components/layout/Layout'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { documentService } from '../services/documentService';

// Main ArchivePage Component
function ArchivePage() {
  // === ALL HOOKS MUST BE CALLED AT THE TOP LEVEL ===
  const { isAuthenticated, isLoading: isLoadingAuth, user: currentUser, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    department: '',
    date_from: '', // Sẽ filter theo archived_at từ backend nếu có
    date_to: ''
  });

  const { data: docTypesData, isLoading: isLoadingDocTypes } = useQuery(
    'documentTypesForArchiveFilter',
    documentService.getDocumentTypes,
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery(
    'departmentsForArchiveFilter',
    documentService.getDepartments,
    { staleTime: 5 * 60 * 1000 }
  );

  const documentTypeOptions = docTypesData?.data?.documentTypes || [];
  const departmentOptions = departmentsData?.data?.departments || [];

  const canFetchArchived = isAuthenticated && !isLoadingAuth && (hasPermission('manage_archive') || currentUser?.role === 'admin');
  // SỬA Ở ĐÂY: Thêm isError vào destructuring
  const { data: documentsData, isLoading: isLoadingDocuments, isFetching, error, isError, refetch } = useQuery(
    ['archived-documents', currentPage, pageSize, filters],
    async () => {
      const params = {
        page: currentPage,
        limit: pageSize,
        status: 'archived', 
        search: filters.search || undefined,
        type: filters.type || undefined,
        department: filters.department || undefined,
        // Backend searchDocuments cần hỗ trợ filter theo khoảng ngày lưu trữ (archived_at_from, archived_at_to)
        // date_from: filters.date_from || undefined, 
        // date_to: filters.date_to || undefined,
      };
      // Xóa các params undefined để không gửi lên server
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
      return documentService.searchDocuments(params);
    },
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      enabled: canFetchArchived, 
      onError: (err) => {
        console.error("Error fetching archived documents:", err);
        toast.error(err.response?.data?.message || err.message || "Lỗi tải tài liệu lưu trữ.");
      }
    }
  );

  const restoreDocumentMutation = useMutation(
    ({ documentId, newStatus }) => documentService.updateDocumentStatus(documentId, newStatus, 'Khôi phục từ lưu trữ bởi Admin'),
    {
      onSuccess: (data, variables) => {
        toast.success('Khôi phục tài liệu thành công! Tài liệu đã được chuyển về trạng thái "Bản nháp".');
        queryClient.invalidateQueries('archived-documents');
        queryClient.invalidateQueries('documents'); 
      },
      onError: (err) => { 
        toast.error(err.response?.data?.message || err.message || 'Đã xảy ra lỗi khi khôi phục.');
      }
    }
  );

  // === EARLY RETURNS AFTER ALL HOOKS ARE CALLED ===
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="Đang kiểm tra xác thực..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canFetchArchived) { 
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <FiAlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền</h2>
          <p className="text-gray-600">Bạn không có quyền quản lý tài liệu lưu trữ.</p>
        </div>
      </div>
    );
  }
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({ search: '', type: '', department: '', date_from: '', date_to: '' });
    setCurrentPage(1);
  };

  const handleRestoreDocument = (document) => {
    if (window.confirm(`Bạn có chắc chắn muốn khôi phục tài liệu "${document.title}" (Mã: ${document.document_code}) về trạng thái "Bản nháp"?`)) {
      restoreDocumentMutation.mutate({ documentId: document.id, newStatus: 'draft' });
    }
  };

  const getDocumentTypeDisplay = (typeCode) => documentTypeOptions.find(t => t.code === typeCode)?.name || typeCode;

  const archivedDocuments = documentsData?.data?.documents || [];
  const pagination = documentsData?.data?.pagination || { total: 0, totalPages: 1, page: currentPage, limit: pageSize };

  return (
    // Layout sẽ được áp dụng bởi ProtectedRoute trong App.js
    <div>
      <div className="max-w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
                <FiArchive className="mr-3 text-blue-600" />
                Tài liệu Lưu trữ
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Xem và khôi phục các tài liệu đã được lưu trữ trong hệ thống.
              </p>
            </div>
            <button onClick={() => refetch()} className="btn btn-outline btn-sm flex-shrink-0" disabled={isLoadingDocuments || isFetching}>
                <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Làm mới
            </button>
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
              <div>
                <label className="form-label">Tìm kiếm (Tiêu đề, Mã)</label>
                <input type="text" placeholder="Nhập từ khóa..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Loại tài liệu</label>
                <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="form-select" disabled={isLoadingDocTypes}>
                  <option value="">{isLoadingDocTypes ? "Đang tải..." : "Tất cả loại"}</option>
                  {documentTypeOptions.map(opt => <option key={opt.code} value={opt.code}>{opt.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Phòng ban</label>
                <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} className="form-select" disabled={isLoadingDepts}>
                  <option value="">{isLoadingDepts ? "Đang tải..." : "Tất cả phòng ban"}</option>
                  {departmentOptions.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Lưu trữ từ ngày</label>
                <input type="date" value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} className="form-input"/>
              </div>
              <div>
                <label className="form-label">Lưu trữ đến ngày</label>
                <input type="date" value={filters.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} className="form-input"/>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <button onClick={handleClearFilters} className="btn btn-secondary-outline btn-sm">
                    <FiFilter className="mr-1.5" /> Xóa bộ lọc
                </button>
                <p className="text-sm text-gray-600">
                    {isFetching ? 'Đang tìm...' : `${pagination.total} kết quả.`}
                </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {isLoadingDocuments && !documentsData ? (
              <div className="flex justify-center py-12"><LoadingSpinner size="large" message="Đang tải tài liệu lưu trữ..." /></div>
            ) : isError && !documentsData ? ( // SỬ DỤNG isError đã khai báo
                 <div className="text-center py-10 text-red-600">
                    <FiAlertCircle className="mx-auto h-10 w-10 mb-2"/>
                    <p>Lỗi tải tài liệu: {error?.message || 'Không rõ lỗi'}</p>
                </div>
            ) : archivedDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FiArchive className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Không có tài liệu lưu trữ nào</h3>
                <p className="text-sm text-gray-500">Thử điều chỉnh bộ lọc hoặc kiểm tra lại sau.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr><th>Tài liệu</th><th>Loại</th><th>Phòng ban</th><th>Phiên bản</th><th>T.Giả</th><th>Ngày lưu trữ</th><th className="text-center">H.Động</th></tr>
                  </thead>
                  <tbody className="table-body">
                    {archivedDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <p className="font-medium text-gray-900 truncate max-w-xs" title={doc.title}>{doc.title}</p>
                          <p className="text-xs text-gray-500">{doc.document_code}</p>
                        </td>
                        <td><span className="badge bg-slate-100 text-slate-700">{getDocumentTypeDisplay(doc.type)}</span></td>
                        <td className="whitespace-nowrap">{doc.department}</td>
                        <td className="font-mono">{doc.version}</td>
                        <td className="whitespace-nowrap">{doc.author_name || 'N/A'}</td>
                        <td className="whitespace-nowrap">{doc.archived_at ? new Date(doc.archived_at).toLocaleDateString('vi-VN') : 'N/A'}</td>
                        <td className="text-center">
                          <button onClick={() => handleRestoreDocument(doc)}
                                  className="btn-icon text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-md"
                                  title="Khôi phục tài liệu"
                                  disabled={restoreDocumentMutation.isLoading && restoreDocumentMutation.variables?.documentId === doc.id}>
                            {restoreDocumentMutation.isLoading && restoreDocumentMutation.variables?.documentId === doc.id ? <LoadingSpinner size="sm" noMessage={true}/> : <FiRotateCcw size={16} />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {pagination.totalPages > 1 && !isLoadingDocuments && archivedDocuments.length > 0 &&(
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1);}}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchivePage;