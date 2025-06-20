// src/frontend/pages/SearchPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiSearch, FiFileText, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import SearchFilters from '../components/documents/SearchFilters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { documentService } from '../services/documentService';
import { useAuth } from '../contexts/AuthContext';
import DocumentCard from '../components/documents/DocumentCard';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('limit')) || 12);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [filters, setFilters] = useState(() => {
    const initialFilters = {
      search: searchParams.get('q') || '', type: searchParams.get('type') || '',
      department: searchParams.get('department') || '', status: searchParams.get('status') || '',
      security_level: searchParams.get('security_level') || '', priority: searchParams.get('priority') || '',
      date_from: searchParams.get('date_from') || '', date_to: searchParams.get('date_to') || '',
      include_archived: searchParams.get('include_archived') === 'true',
      search_content: searchParams.get('search_content') === 'true',
      exact_match: searchParams.get('exact_match') === 'true',
      sort: searchParams.get('sort') || 'relevance',
    };
    const hasInitialParams = Array.from(searchParams.keys()).some(key => key !== 'page' && key !== 'limit');
    // Mở bộ lọc nếu có tham số trên URL
    if (hasInitialParams) {
        setShowAdvancedFilters(true);
    }
    return initialFilters;
  });

  const { data: docTypesData, isPending: isPendingDocTypes } = useQuery({
    queryKey: ['documentTypesSearch'],
    queryFn: documentService.getDocumentTypes,
    staleTime: 5 * 60 * 1000,
  });

  const { data: departmentsData, isPending: isPendingDepts } = useQuery({
    queryKey: ['departmentsListSearch'],
    queryFn: documentService.getDepartments,
    staleTime: 5 * 60 * 1000,
  });

  const { data: workflowStatesData, isPending: isPendingStatuses } = useQuery({
    queryKey: ['workflowStatesSearch'],
    queryFn: documentService.getWorkflowStates,
    staleTime: 5 * 60 * 1000,
  });

  // *** LỖI ĐÃ SỬA (1): Sửa lại cách map dữ liệu cho "Loại tài liệu" ***
  // Biến `docTypesData` đã là mảng dữ liệu, không cần truy cập `.data.documentTypes`
  const mappedDocumentTypeOptions = useMemo(() => (docTypesData || []).map(dt => ({ value: dt.code, label: dt.name })), [docTypesData]);

  // *** LỖI ĐÃ SỬA (2): Sửa lại cách map dữ liệu cho "Phòng ban" ***
  // Biến `departmentsData` đã là mảng các chuỗi, không cần truy cập `.data.departments`
  const mappedDepartmentOptions = useMemo(() => (departmentsData || []).map(d => ({ value: d, label: d })), [departmentsData]);
  
  // *** LỖI ĐÃ SỬA (3): Sửa lại cách map dữ liệu cho "Trạng thái" ***
  // Biến `workflowStatesData` đã là mảng dữ liệu, không cần truy cập `.data.workflowStates`
  const mappedStatusOptions = useMemo(() => (workflowStatesData || []).map(s => ({ value: s.code, label: s.name })), [workflowStatesData]);
  
  const isLoadingOptions = isPendingDocTypes || isPendingDepts || isPendingStatuses;

  const hasActiveFiltersLogic = (filterObj) => {
    if (!filterObj) return false;
    const { sort, search, ...restFilters } = filterObj;
    return Object.values(restFilters).some(value => value !== '' && value !== false && value !== null && value !== undefined);
  };
  
  const {
    data: searchServiceResponse,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['documents-search-page', currentPage, pageSize, filters],
    queryFn: async () => {
      if (!filters.search && !hasActiveFiltersLogic(filters)) {
        return { data: { results: [], pagination: { total: 0, totalPages: 1, page: 1, limit: pageSize } } };
      }
      const params = {
        page: currentPage, limit: pageSize,
        search: filters.search || undefined, type: filters.type || undefined,
        department: filters.department || undefined, status: filters.status || undefined,
        security_level: filters.security_level || undefined, priority: filters.priority || undefined,
        date_from: filters.date_from || undefined, date_to: filters.date_to || undefined,
        include_archived: filters.include_archived, search_content: filters.search_content,
        exact_match: filters.exact_match, sort: filters.sort,
      };
      return documentService.searchDocuments(params);
    },
    keepPreviousData: true,
    staleTime: 1 * 60 * 1000,
    enabled: !!filters.search || hasActiveFiltersLogic(filters),
  });

  useEffect(() => {
    if (isError) {
      console.error('Search error:', error);
      toast.error(`Lỗi tìm kiếm: ${error?.response?.data?.message || error?.message || 'Không thể kết nối'}`);
    }
  }, [isError, error]);

  useEffect(() => {
    const params = new URLSearchParams();
    let hasRelevantFilter = false;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== false && value !== null && value !== undefined) {
        params.set(key === 'search' ? 'q' : key, value.toString());
        if (key !== 'sort' && key !== 'page' && key !== 'limit') {
            hasRelevantFilter = true;
        }
      }
    });
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (pageSize !== 12) params.set('limit', pageSize.toString());

    const currentSearchString = searchParams.toString();
    const newSearchString = params.toString();

    if (newSearchString !== currentSearchString && (hasRelevantFilter || filters.search)) {
        setSearchParams(params, { replace: true });
    } else if (!hasRelevantFilter && !filters.search && currentSearchString) {
        setSearchParams({}, {replace: true});
    }
  }, [filters, currentPage, pageSize, setSearchParams, searchParams]);

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({...prev, ...newFilters}));
    setCurrentPage(1);
  };
  
  const handleClearFilters = () => {
    setFilters({ search: '', type: '', department: '', status: '', security_level: '', priority: '', date_from: '', date_to: '', include_archived: false, search_content: false, exact_match: false, sort: 'relevance' });
    setCurrentPage(1);
    setPageSize(12);
    setSearchParams({}, {replace: true});
  };

  const handleDocumentCardClick = (documentId) => {
    navigate(`/documents/${documentId}`);
  };
  
  const handleEditDocument = (documentId) => {
    navigate(`/documents/${documentId}/edit`);
  };

  const handlePageChange = (page) => setCurrentPage(page);
  const handlePageSizeChange = (size) => { setPageSize(size); setCurrentPage(1); };

  const documents = searchServiceResponse?.data?.documents || searchServiceResponse?.data?.results || [];
  const paginationInfo = searchServiceResponse?.data?.pagination || { total: 0, totalPages: 1, page: currentPage, limit: pageSize };
  const searchWasPerformed = !!filters.search || hasActiveFiltersLogic(filters);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FiSearch className="text-blue-600" size={28} />
          <h1 className="text-3xl font-bold text-gray-900">Tìm kiếm tài liệu</h1>
        </div>
        <p className="text-gray-600">
          Sử dụng các bộ lọc nâng cao để tìm kiếm tài liệu chính xác trong hệ thống EDMS 1CAR.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="p-5">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            showAdvanced={showAdvancedFilters}
            onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
            documentTypeOptions={mappedDocumentTypeOptions}
            departmentOptions={mappedDepartmentOptions}
            statusOptions={mappedStatusOptions}
            isLoadingOptions={isLoadingOptions}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-5">
          {searchWasPerformed && (
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Kết quả tìm kiếm</h2>
                <div className="text-sm text-gray-600 flex items-center">
                  {isFetching && !isPending ? (
                    <div className="mr-2">
                      <LoadingSpinner size="small" showMessage={false} />
                    </div>
                  ) : null}
                  <span>{`${paginationInfo.total} tài liệu được tìm thấy.`}</span>
                </div>
              </div>
              {documents.length > 0 && paginationInfo.totalPages > 1 && (
                <div className="text-sm text-gray-500">Trang {paginationInfo.page || currentPage} / {paginationInfo.totalPages}</div>
              )}
            </div>
          )}

          {isPending && searchWasPerformed ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" message="Đang tìm kiếm tài liệu..." /></div>
          ) : isError && searchWasPerformed ? (
            <div className="text-center py-16">
              <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-700 mb-2">Lỗi tìm kiếm</h3>
              <p className="text-gray-600 mb-4">{error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'}</p>
              <button onClick={() => refetch()} className="btn btn-primary">Thử lại</button>
            </div>
          ) : !searchWasPerformed && !isFetching ? (
            <div className="text-center py-16 text-gray-500">
              <FiSearch className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">Bắt đầu tìm kiếm</h3>
              <p>Nhập từ khóa vào ô tìm kiếm hoặc sử dụng bộ lọc nâng cao.</p>
            </div>
          ) : documents.length === 0 && searchWasPerformed && !isFetching ? (
            <div className="text-center py-16 text-gray-500">
                <FiFileText className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">Không tìm thấy tài liệu</h3>
                <p>Không có tài liệu nào phù hợp với bộ lọc của bạn.</p>
            </div>
          ) : documents.length > 0 && (
             <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-6">
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} onViewClick={handleDocumentCardClick} onEditClick={handleEditDocument}/>
                ))}
              </div>
              {paginationInfo.totalPages > 1 && (
                <Pagination
                  currentPage={paginationInfo.page} totalPages={paginationInfo.totalPages}
                  totalItems={paginationInfo.total} pageSize={paginationInfo.limit}
                  onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;