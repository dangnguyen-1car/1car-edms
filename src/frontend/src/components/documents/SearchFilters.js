/**
 * =================================================================
 * EDMS 1CAR - Search Filters Component
 * Advanced search and filtering based on C-WI-AR-001 requirements
 * Support for 7 document types and 14 departments
 * =================================================================
 */

import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  FiSearch, 
  FiFilter, 
  FiX, 
  FiCalendar,
  FiUser,
  FiTag,
  FiFileText,
  FiRefreshCw
} from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import { documentService } from '../../services/documentService';
import { userService } from '../../services/userService';

function SearchFilters({ filters, onFiltersChange, onClearFilters }) {
  const { user, hasPermission, getAccessibleDepartments } = useAuth();
  const [localFilters, setLocalFilters] = useState(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get document types based on C-TD-MG-005
  const { data: documentTypes } = useQuery(
    'documentTypes',
    documentService.getDocumentTypes,
    {
      staleTime: 30 * 60 * 1000, // 30 minutes
    }
  );

  // Get departments based on user permissions
  const { data: departmentsData } = useQuery(
    'departments',
    documentService.getDepartments,
    {
      staleTime: 30 * 60 * 1000,
    }
  );

  // Get workflow states
  const { data: workflowStates } = useQuery(
    'workflowStates',
    documentService.getWorkflowStates,
    {
      staleTime: 30 * 60 * 1000,
    }
  );

  // Get users for author filter (admin only)
  const { data: usersData } = useQuery(
    'users',
    () => userService.getUsers({ limit: 100 }),
    {
      enabled: hasPermission('view_all_documents'),
      staleTime: 10 * 60 * 1000,
    }
  );

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle date range change
  const handleDateRangeChange = (field, value) => {
    handleFilterChange(field, value);
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      type: '',
      department: '',
      status: '',
      author_id: '',
      date_from: '',
      date_to: ''
    };
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  // Get accessible departments for current user
  const accessibleDepartments = getAccessibleDepartments();
  const departments = departmentsData?.data?.departments || [];
  const filteredDepartments = hasPermission('view_all_documents') 
    ? departments 
    : departments.filter(dept => accessibleDepartments.includes(dept));

  // Check if any advanced filters are active
  const hasAdvancedFilters = localFilters.type || 
                            localFilters.department || 
                            localFilters.status || 
                            localFilters.author_id || 
                            localFilters.date_from || 
                            localFilters.date_to;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Basic Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="form-input pl-10 w-full"
              placeholder="Tìm kiếm theo tiêu đề, mã tài liệu, nội dung..."
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn ${showAdvanced ? 'btn-primary' : 'btn-outline'} flex items-center`}
          >
            <FiFilter className="h-4 w-4 mr-2" />
            Bộ lọc nâng cao
            {hasAdvancedFilters && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                {Object.values(localFilters).filter(v => v && v !== '').length - (localFilters.search ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Clear all filters */}
          {(localFilters.search || hasAdvancedFilters) && (
            <button
              onClick={handleClearAll}
              className="btn btn-outline flex items-center text-red-600 border-red-300 hover:bg-red-50"
            >
              <FiX className="h-4 w-4 mr-2" />
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Document Type Filter */}
            <div>
              <label className="form-label flex items-center">
                <FiFileText className="h-4 w-4 mr-2" />
                Loại tài liệu
              </label>
              <select
                className="form-input"
                value={localFilters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">Tất cả loại</option>
                {documentTypes?.data?.documentTypes?.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.code} - {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="form-label flex items-center">
                <FiTag className="h-4 w-4 mr-2" />
                Phòng ban
              </label>
              <select
                className="form-input"
                value={localFilters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">Tất cả phòng ban</option>
                {filteredDepartments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="form-label flex items-center">
                <FiRefreshCw className="h-4 w-4 mr-2" />
                Trạng thái
              </label>
              <select
                className="form-input"
                value={localFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {workflowStates?.data?.workflowStates?.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Author Filter (Admin only) */}
            {hasPermission('view_all_documents') && (
              <div>
                <label className="form-label flex items-center">
                  <FiUser className="h-4 w-4 mr-2" />
                  Tác giả
                </label>
                <select
                  className="form-input"
                  value={localFilters.author_id}
                  onChange={(e) => handleFilterChange('author_id', e.target.value)}
                >
                  <option value="">Tất cả tác giả</option>
                  {usersData?.data?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date From */}
            <div>
              <label className="form-label flex items-center">
                <FiCalendar className="h-4 w-4 mr-2" />
                Từ ngày
              </label>
              <input
                type="date"
                className="form-input"
                value={localFilters.date_from}
                onChange={(e) => handleDateRangeChange('date_from', e.target.value)}
                max={localFilters.date_to || new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="form-label flex items-center">
                <FiCalendar className="h-4 w-4 mr-2" />
                Đến ngày
              </label>
              <input
                type="date"
                className="form-input"
                value={localFilters.date_to}
                onChange={(e) => handleDateRangeChange('date_to', e.target.value)}
                min={localFilters.date_from}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Quick Filter Buttons */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 mr-2">Bộ lọc nhanh:</span>
              
              {/* My Documents */}
              <button
                onClick={() => handleFilterChange('author_id', user.id.toString())}
                className={`btn btn-sm ${localFilters.author_id === user.id.toString() ? 'btn-primary' : 'btn-outline'}`}
              >
                Tài liệu của tôi
              </button>

              {/* My Department */}
              <button
                onClick={() => handleFilterChange('department', user.department)}
                className={`btn btn-sm ${localFilters.department === user.department ? 'btn-primary' : 'btn-outline'}`}
              >
                Phòng ban của tôi
              </button>

              {/* Draft Documents */}
              <button
                onClick={() => handleFilterChange('status', 'draft')}
                className={`btn btn-sm ${localFilters.status === 'draft' ? 'btn-primary' : 'btn-outline'}`}
              >
                Bản nháp
              </button>

              {/* Published Documents */}
              <button
                onClick={() => handleFilterChange('status', 'published')}
                className={`btn btn-sm ${localFilters.status === 'published' ? 'btn-primary' : 'btn-outline'}`}
              >
                Đã phê duyệt
              </button>

              {/* Recent Documents (Last 7 days) */}
              <button
                onClick={() => {
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  handleFilterChange('date_from', sevenDaysAgo.toISOString().split('T')[0]);
                  handleFilterChange('date_to', new Date().toISOString().split('T')[0]);
                }}
                className={`btn btn-sm ${localFilters.date_from && localFilters.date_to ? 'btn-primary' : 'btn-outline'}`}
              >
                7 ngày qua
              </button>

              {/* This Month */}
              <button
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                  handleFilterChange('date_from', firstDay.toISOString().split('T')[0]);
                  handleFilterChange('date_to', now.toISOString().split('T')[0]);
                }}
                className="btn btn-sm btn-outline"
              >
                Tháng này
              </button>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Bộ lọc đang áp dụng:</span>
                
                {localFilters.type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Loại: {documentTypes?.data?.documentTypes?.find(t => t.code === localFilters.type)?.name}
                    <button
                      onClick={() => handleFilterChange('type', '')}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {localFilters.department && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Phòng ban: {localFilters.department}
                    <button
                      onClick={() => handleFilterChange('department', '')}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-green-400 hover:bg-green-200 hover:text-green-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {localFilters.status && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Trạng thái: {workflowStates?.data?.workflowStates?.find(s => s.code === localFilters.status)?.name}
                    <button
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-yellow-400 hover:bg-yellow-200 hover:text-yellow-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {localFilters.author_id && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Tác giả: {usersData?.data?.find(u => u.id.toString() === localFilters.author_id)?.name || 'N/A'}
                    <button
                      onClick={() => handleFilterChange('author_id', '')}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {(localFilters.date_from || localFilters.date_to) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    Thời gian: {localFilters.date_from || '...'} → {localFilters.date_to || '...'}
                    <button
                      onClick={() => {
                        handleFilterChange('date_from', '');
                        handleFilterChange('date_to', '');
                      }}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Tips */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
        <strong>Mẹo tìm kiếm:</strong>
        <ul className="mt-1 space-y-1">
          <li>• Tìm kiếm theo mã tài liệu: C-PR-VM-001, C-WI-AR-001</li>
          <li>• Tìm kiếm theo tiêu đề: "Quy trình quản lý phiên bản"</li>
          <li>• Sử dụng bộ lọc nâng cao để tìm kiếm chính xác hơn</li>
          <li>• Bộ lọc nhanh giúp tìm kiếm các tài liệu thông dụng</li>
        </ul>
      </div>
    </div>
  );
}

export default SearchFilters;
