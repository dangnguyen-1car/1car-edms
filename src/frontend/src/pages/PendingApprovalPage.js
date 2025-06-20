// src/frontend/src/pages/PendingApprovalPage.js
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiFilter, FiRefreshCw } from 'react-icons/fi';
import { documentService } from '../services/documentService';
import { PageLoader } from '../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

import SearchFilters from '../components/documents/SearchFilters';
import DocumentTable from '../components/documents/DocumentTable';
import Pagination from '../components/common/Pagination';
// *** THAY ĐỔI: Không cần import DocumentApprovalModal ở đây nữa ***
// import DocumentApprovalModal from '../components/documents/DocumentApprovalModal';

function PendingApprovalPage() {
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sortBy: 'updated_at',
    sortOrder: 'desc',
    department: '',
    type: '',
    status: 'review',
    priority: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  
  // *** THAY ĐỔI: Loại bỏ các state quản lý modal không cần thiết ***
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [selectedDocument, setSelectedDocument] = useState(null);

  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => documentService.getDepartments(),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.map(deptName => ({ value: deptName, label: deptName })),
  });

  const { data: docTypesData, isLoading: isLoadingTypes } = useQuery({
    queryKey: ['documentTypes'],
    queryFn: () => documentService.getDocumentTypes(),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.map(type => ({ value: type.code, label: type.name })),
  });
  
  const { data: statusOptionsData, isLoading: isLoadingStatuses } = useQuery({
      queryKey: ['workflowStates'],
      queryFn: () => documentService.getWorkflowStates(),
      staleTime: 5 * 60 * 1000,
      select: (data) => data.map(state => ({ value: state.code, label: state.name })),
  });
  
  const { data: priorityOptions } = useQuery({
      queryKey: ['priorityOptions'],
      queryFn: () => Promise.resolve([
          { value: 'low', label: 'Thấp' },
          { value: 'normal', label: 'Bình thường' },
          { value: 'high', label: 'Cao' },
          { value: 'urgent', label: 'Khẩn cấp' },
      ]),
      staleTime: Infinity,
  });

  const { 
    data: responseData, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
      queryKey: ['pendingApprovals', filters],
      queryFn: () => documentService.getPendingApprovals(filters),
      staleTime: 30 * 1000,
  });

  const { data: statsData } = useQuery({
    queryKey: ['pendingApprovalStats'],
    queryFn: () => documentService.getPendingApprovalStats(),
    staleTime: 60 * 1000,
  });

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      page: 1,
      limit: 10,
      sortBy: 'updated_at',
      sortOrder: 'desc',
      department: '',
      type: '',
      status: 'review',
      priority: '',
    });
  }, []);
  
  const handlePageChange = (page) => setFilters(prev => ({ ...prev, page }));
  const handleSort = (column) => setFilters(prev => ({ ...prev, sortBy: column, sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc' }));
  
  // *** THAY ĐỔI: Toàn bộ logic xử lý action và modal đã được chuyển vào WorkflowActionButtons,
  // nên trang này không cần các hàm này nữa.
  /*
  const handleAction = useCallback((action, doc) => { ... });
  const handleModalClose = useCallback(() => { ... });
  const handleApprovalSuccess = useCallback(() => { ... });
  */

  if (isLoading) return <PageLoader message="Đang tải danh sách chờ duyệt..." />;

  const documents = responseData?.data || [];
  const pagination = responseData?.pagination || {};
  const stats = statsData?.data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
            <FiClock className="mr-3 text-blue-600" />
            Tài liệu chờ duyệt
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Tổng cộng có {stats.total_pending || 0} tài liệu đang chờ bạn xử lý.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="btn btn-outline" disabled={isFetching}>
                <FiRefreshCw className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Làm mới
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary-outline">
                <FiFilter className="mr-2" />
                {showFilters ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
            </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            documentTypeOptions={docTypesData || []}
            departmentOptions={departmentsData || []}
            statusOptions={statusOptionsData || []}
            priorityOptions={priorityOptions || []}
            isLoadingOptions={isLoadingDepts || isLoadingTypes || isLoadingStatuses}
            showSearchInput={false}
            showSecurityLevelOptions={false}
            showAdvanced={true}
            onToggleAdvanced={() => setShowFilters(!showFilters)}
          />
        </div>
      )}
      
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200"><p>Đã xảy ra lỗi: {error.message}</p></div>}

      <DocumentTable
        documents={documents}
        loading={isFetching}
        context="pending-approval"
        // onAction không còn cần thiết nữa
        onSort={handleSort}
        currentSort={`${filters.sortBy}_${filters.sortOrder}`}
      />

      {!isLoading && documents.length > 0 && <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={handlePageChange} totalItems={pagination.total} pageSize={pagination.limit}/>}
      
      {/* Không cần render Modal ở đây nữa */}
    </div>
  );
};

export default PendingApprovalPage;