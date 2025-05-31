// src/pages/SearchPage.js

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { FiSearch, FiFileText, FiAlertCircle, FiUser, FiCalendar, FiDownload } from 'react-icons/fi';
import SearchFilters from '../components/documents/SearchFilters';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { documentAPI } from '../api/documentApi';
import { useAuth } from '../contexts/AuthContext';
// Giả sử bạn có một thư viện toast, ví dụ: react-toastify
// import { toast } from 'react-toastify';

// Helper functions (định nghĩa ở ngoài hoặc đầu component)
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

const getStatusBadgeColor = (status) => {
  const colors = {
    'draft': 'bg-yellow-100 text-yellow-800',
    'review': 'bg-blue-100 text-blue-800',
    'published': 'bg-green-100 text-green-800',
    'archived': 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getStatusDisplay = (status) => {
  const statuses = {
    'draft': 'Bản nháp',
    'review': 'Đang xem xét',
    'published': 'Đã phê duyệt',
    'archived': 'Đã lưu trữ'
  };
  return statuses[status] || status;
};

// Kiểm tra có filter nào được áp dụng không
const hasActiveFilters = (filterObj) => {
  if (!filterObj) return false;
  return Object.values(filterObj).some(value =>
    value !== '' && value !== false && value !== null && value !== undefined
  );
};

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasPermission, canAccessDepartment } = useAuth();

  // State cho filters và phân trang
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(parseInt(searchParams.get('limit')) || 20);
  const [filters, setFilters] = useState(() => { // Khởi tạo filters từ URL params
    return {
      search: searchParams.get('q') || '',
      type: searchParams.get('type') || '',
      department: searchParams.get('department') || '',
      status: searchParams.get('status') || '',
      security_level: searchParams.get('security_level') || '',
      priority: searchParams.get('priority') || '',
      date_from: searchParams.get('date_from') || '',
      date_to: searchParams.get('date_to') || '',
      include_archived: searchParams.get('include_archived') === 'true',
      search_content: searchParams.get('search_content') === 'true',
      exact_match: searchParams.get('exact_match') === 'true',
    };
  });

  // Sử dụng useQuery để fetch dữ liệu
  const {
    data: searchData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['documents-search', currentPage, pageSize, filters], // Query key
    async () => {
      // Chỉ gọi API khi có ít nhất một filter được áp dụng (kiểm tra lại ở đây để an toàn)
      if (!hasActiveFilters(filters)) {
        return { data: { documents: [], pagination: { total: 0, totalPages: 1 } } };
      }

      // Chuẩn bị params cho API
      const params = {
        page: currentPage,
        limit: pageSize,
        ...filters
      };

      // Loại bỏ các giá trị rỗng hoặc false (trừ khi filter đó là boolean và false có ý nghĩa)
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined ||
            (typeof params[key] === 'boolean' && params[key] === false && 
             !['include_archived', 'search_content', 'exact_match'].includes(key))) {
          delete params[key];
        }
      });
      
      const response = await documentAPI.getDocuments(params);
      return response;
    },
    {
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000, // 2 phút
      enabled: hasActiveFilters(filters), // Chỉ fetch khi có filter (đã định nghĩa hasActiveFilters ở trên)
      onError: (err) => {
        console.error('Search error:', err);
        // toast.error(`Lỗi tìm kiếm: ${err.message || 'Không thể kết nối tới server'}`);
      }
    }
  );

  // Cập nhật URL params khi filters hoặc pagination thay đổi
  useEffect(() => {
    const params = new URLSearchParams();

    // Thêm filters vào URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== false && value !== null && value !== undefined) {
        params.set(key === 'search' ? 'q' : key, value.toString());
      }
    });

    // Thêm pagination vào URL
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (pageSize !== 20) params.set('limit', pageSize.toString());

    // Chỉ setSearchParams nếu params thực sự thay đổi để tránh vòng lặp vô hạn
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, currentPage, pageSize, setSearchParams, searchParams]);


  // Xử lý thay đổi filters
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset về trang đầu khi filter thay đổi
  };

  // Xử lý clear filters
  const handleClearFilters = () => {
    const clearedFilters = {
      search: '', type: '', department: '', status: '',
      security_level: '', priority: '', date_from: '', date_to: '',
      include_archived: false, search_content: false, exact_match: false,
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    setPageSize(20); // Reset pageSize về mặc định
  };

  // Kiểm tra quyền xem document
  const canViewDocument = (document) => {
    if (!user || !document) return false; // Kiểm tra user và document tồn tại
    if (hasPermission('view_all_documents')) return true;
    if (document.author_id === user.id) return true;
    if (canAccessDepartment(document.department)) return true;
    // Giả định user.department là một string và document.recipients là một mảng các string
    if (document.recipients && Array.isArray(document.recipients) && document.recipients.includes(user.department)) return true;
    return false;
  };

  // Xử lý click vào document
  const handleDocumentClick = (document) => {
    if (!canViewDocument(document)) {
      // toast.error('Bạn không có quyền xem tài liệu này.'); // Sử dụng toast thay vì alert
      console.warn('Attempted to view document without permission:', document.id);
      return;
    }

    // Ghi log audit (nếu cần)
    // documentAPI.logDocumentAccess(document.id, 'VIEW_FROM_SEARCH');

    navigate(`/documents/${document.id}`, {
      state: {
        fromSearch: true,
        searchFilters: filters, // Truyền filters hiện tại
        returnUrl: `${window.location.pathname}${window.location.search}` // URL để quay lại
      }
    });
  };

  // Xử lý thay đổi trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Xử lý thay đổi kích thước trang
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1); // Reset về trang đầu khi pageSize thay đổi
  };


  // Lấy dữ liệu từ response
  const documents = searchData?.data?.documents || [];
  const paginationInfo = searchData?.data?.pagination || { total: 0, totalPages: 1 };
  const searchWasPerformed = hasActiveFilters(filters); // Kiểm tra xem có thực hiện search không dựa trên filters hiện tại

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FiSearch className="text-blue-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900">Tìm kiếm tài liệu</h1>
        </div>
        <p className="text-gray-600">
          Tìm kiếm tài liệu trong hệ thống EDMS 1CAR với các bộ lọc nâng cao
        </p>
      </div>

      {/* Search Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            showAdvanced={true} // Luôn hiển thị bộ lọc nâng cao, hoặc thêm state để quản lý
            // onToggleAdvanced={() => { /* thêm logic nếu cần */ }}
          />
        </div>
      </div>

      {/* Search Results */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {/* Results Header */}
          {searchWasPerformed && ( // Chỉ hiển thị header kết quả nếu đã thực hiện search
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Kết quả tìm kiếm
                </h2>
                <p className="text-sm text-gray-600">
                  {isLoading || isFetching ? 'Đang cập nhật kết quả...' : `${paginationInfo.total} tài liệu được tìm thấy`}
                </p>
              </div>
              
              {documents.length > 0 && paginationInfo.totalPages > 1 && (
                <div className="text-sm text-gray-500">
                  Trang {currentPage} / {paginationInfo.totalPages}
                </div>
              )}
            </div>
          )}

          {/* Loading State (chỉ khi searchWasPerformed) */}
          {(isLoading || isFetching) && searchWasPerformed && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Đang tìm kiếm tài liệu...</span>
            </div>
          )}

          {/* Error State (chỉ khi searchWasPerformed) */}
          {isError && searchWasPerformed && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Lỗi tìm kiếm</h3>
                <p className="text-gray-600 mb-4">
                  {error?.message || 'Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại.'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* No Search Performed (chưa có filter nào được áp dụng) */}
          {!searchWasPerformed && !isLoading && (
            <div className="text-center py-12">
              <FiSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bắt đầu tìm kiếm
              </h3>
              <p className="text-gray-600">
                Nhập từ khóa hoặc sử dụng bộ lọc để tìm kiếm tài liệu.
              </p>
            </div>
          )}

          {/* No Results */}
          {searchWasPerformed && !isLoading && !isFetching && documents.length === 0 && !isError && (
            <div className="text-center py-12">
              <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy tài liệu
              </h3>
              <p className="text-gray-600 mb-4">
                Không có tài liệu nào phù hợp với tiêu chí tìm kiếm của bạn.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Gợi ý:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Kiểm tra lại từ khóa tìm kiếm.</li>
                  <li>Thử sử dụng từ khóa khác hoặc tổng quát hơn.</li>
                  <li>Xóa bớt một số bộ lọc.</li>
                  <li>Bật tùy chọn "Bao gồm tài liệu đã lưu trữ" nếu có.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Results Grid */}
          {documents.length > 0 && !isLoading && ( // Không hiển thị grid nếu đang loading
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {documents.map((document) => (
                  // Sử dụng DocumentCard component đã được tạo (nếu có)
                  // Hoặc giữ lại cấu trúc card như hiện tại
                  <div
                    key={document.id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleDocumentClick(document)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 hover:text-blue-600" title={document.title}>
                            {document.title}
                          </h3>
                          <p className="text-sm text-gray-500 truncate">
                            {document.document_code} • {getDocumentTypeDisplay(document.type)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusBadgeColor(document.status)}`}>
                          {getStatusDisplay(document.status)}
                        </span>
                      </div>

                      {document.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={document.description}>
                          {document.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 truncate">
                          <div className="flex items-center gap-1" title={`Tác giả: ${document.author_name || 'N/A'}`}>
                            <FiUser size={14} />
                            <span className="truncate max-w-[80px]">{document.author_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1" title={`Ngày tạo: ${new Date(document.created_at).toLocaleDateString('vi-VN')}`}>
                            <FiCalendar size={14} />
                            <span>{new Date(document.created_at).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Ngăn sự kiện click của card cha
                            documentAPI.downloadDocument(document.id, document.title); // Truyền title để có tên file tốt hơn
                          }}
                          className="p-1.5 text-gray-500 hover:text-purple-600 transition-colors rounded hover:bg-purple-50"
                          title="Tải xuống"
                        >
                          <FiDownload size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {paginationInfo.totalPages > 1 && (
                 <Pagination
                    currentPage={currentPage}
                    totalPages={paginationInfo.totalPages}
                    totalItems={paginationInfo.total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
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