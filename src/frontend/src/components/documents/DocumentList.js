// src/frontend/src/components/documents/DocumentList.js
/** * =================================================================
 * EDMS 1CAR - Document List Component (REVISED to use documentService)
 * =================================================================
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  FiFileText, FiEye, FiEdit, FiDownload, FiUser, FiCalendar,
  FiTag, FiSearch, FiFilter, FiRefreshCw, FiAlertCircle, FiPlus
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import LoadingSpinner from '../common/LoadingSpinner';
import SkeletonLoader from '../common/SkeletonLoader';
import Pagination from '../common/Pagination';
import DocumentCard from './DocumentCard';
import SearchFilters from './SearchFilters';
import CreateDocumentModal from './CreateDocumentModal';

function DocumentList({ onDocumentSelect }) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Fetch options for SearchFilters and CreateDocumentModal
  const { data: docTypesData, isLoading: isLoadingDocTypes } = useQuery(
    'documentTypes',
    documentService.getDocumentTypes,
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery(
    'departmentsList',
    documentService.getDepartments,
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: workflowStatesData, isLoading: isLoadingStatuses } = useQuery(
    'workflowStates',
    documentService.getWorkflowStates,
    { staleTime: 5 * 60 * 1000 }
  );

  const mappedDocumentTypeOptions = docTypesData?.data?.documentTypes.map(dt => ({ value: dt.code, label: dt.name })) || [];
  const mappedDepartmentOptions = departmentsData?.data?.departments.map(d => ({ value: d, label: d })) || [];
  const mappedStatusOptions = workflowStatesData?.data?.workflowStates.map(s => ({ value: s.code, label: s.name })) || [];
  const isLoadingOptions = isLoadingDocTypes || isLoadingDepts || isLoadingStatuses;

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

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({...prev, ...newFilters}));
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

  const handleDocumentCreated = () => {
    setShowCreateModal(false);
    toast.success("Tài liệu đã được tạo thành công!");
    queryClient.invalidateQueries('documents');
  };

  const handleViewDocument = (documentId) => {
    toast.info(`Xem chi tiết tài liệu ID: ${documentId} (chưa triển khai navigation)`);
    if(onDocumentSelect) onDocumentSelect(documentId);
  };

  const handleEditDocument = (documentId) => {
    toast.info(`Chỉnh sửa tài liệu ID: ${documentId} (chưa triển khai navigation)`);
  };

  const documents = documentsResponse?.data?.documents || [];
  const pagination = documentsResponse?.data?.pagination || { total: 0, totalPages: 1, page: currentPage, limit: pageSize };

  if (isLoading && !documentsResponse) {
    return <div className="py-8"><SkeletonLoader type="card" count={6} /></div>;
  }

  if (isError && !documentsResponse) {
    return (
      <div className="text-center py-10">
        <FiAlertCircle className="mx-auto text-red-500 h-12 w-12 mb-2" />
        <p className="text-red-600">Lỗi tải danh sách tài liệu: {error.message}</p>
        <button onClick={handleRefresh} className="btn btn-primary mt-4">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <p className="text-gray-600">
            {isFetching && !isLoading ? <LoadingSpinner size="sm" noMessage={true} className="inline mr-2" /> : null}
            Tìm thấy {pagination.total || 0} tài liệu.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn-secondary-outline ${showFilters ? 'bg-gray-100' : ''}`}
            >
                <FiFilter className="mr-1.5" /> {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
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

      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            showAdvanced={true} // Luôn hiển thị nội dung bộ lọc nâng cao khi showFilters là true
            onToggleAdvanced={() => setShowFilters(!showFilters)} // Vẫn giữ toggle này nếu cần
            documentTypeOptions={mappedDocumentTypeOptions}
            departmentOptions={mappedDepartmentOptions}
            statusOptions={mappedStatusOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </div>
      )}

      {isLoading && !documents.length ? (
          <div className="py-8"><SkeletonLoader type="card" count={pageSize} /></div>
      ) : !isLoading && documents.length === 0 && !isFetching ? (
        <div className="text-center py-12">
          <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Không tìm thấy tài liệu</h3>
          <p className="text-gray-500">Vui lòng thử lại với bộ lọc khác hoặc tạo tài liệu mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onViewClick={handleViewDocument}
              onEditClick={handleEditDocument}
            />
          ))}
        </div>
      )}

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

      {showCreateModal && (
        <CreateDocumentModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleDocumentCreated}
            documentTypeOptions={mappedDocumentTypeOptions} // Truyền options đã map
            departmentOptions={mappedDepartmentOptions}   // Truyền options đã map
            isLoadingOptions={isLoadingOptions}
        />
      )}
    </div>
  );
}

export default DocumentList;