// src/frontend/src/components/documents/SearchFilters.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiFilter, FiX, FiCalendar, FiLoader } from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner'; // Import LoadingSpinner

function SearchFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  showAdvanced = false,
  onToggleAdvanced,
  documentTypeOptions = [], // [{ value: 'PL', label: 'Chính sách' }, ...]
  departmentOptions = [],   // [{ value: 'Ban Giám đốc', label: 'Ban Giám đốc' }, ...]
  statusOptions = [],       // [{ value: 'draft', label: 'Bản nháp' }, ...]
  securityLevelOptions = [],// [{ value: 'internal', label: 'Nội bộ' }, ...]
  priorityOptions = [],     // [{ value: 'normal', label: 'Bình thường' }, ...]
  isLoadingOptions = false, // Cờ để biết options có đang được tải không
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const debounceTimeoutRef = useRef(null);

  // Sync local filters với props khi props thay đổi từ bên ngoài
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Debounced function để gọi onFiltersChange
  const debouncedFiltersChange = useCallback((newFilters) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onFiltersChange(newFilters);
    }, 500);
  }, [onFiltersChange]);

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (name, value) => {
    const newFilters = { ...localFilters, [name]: value };
    setLocalFilters(newFilters);

    if (name === 'search') {
      debouncedFiltersChange(newFilters);
    } else {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      onFiltersChange(newFilters);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    onFiltersChange(localFilters);
  };

  const handleClearAll = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    const clearedFilters = {
      search: '', type: '', department: '', status: '',
      security_level: '', priority: '', date_from: '', date_to: '',
      include_archived: false, search_content: false, exact_match: false,
      sort: filters.sort || 'relevance'
    };
    setLocalFilters(clearedFilters);
    if(onClearFilters) onClearFilters();
    else onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.entries(localFilters).some(([key, value]) => {
    if (key === 'sort') return false;
    return value !== '' && value !== false && value !== null && value !== undefined;
  });

  const renderOptions = (optionsArray, defaultOptionLabel = "Tất cả") => {
    const hasDefaultAll = optionsArray.some(opt => opt.value === '');
    const finalOptions = hasDefaultAll ? optionsArray : [{value: '', label: defaultOptionLabel}, ...optionsArray];

    return finalOptions.map(opt => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow relative">
          <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            name="search"
            placeholder="Tìm theo tiêu đề, mã, từ khóa..."
            value={localFilters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="form-input w-full pl-10 pr-8 py-2.5"
          />
          {localFilters.search && (
            <button
              type="button"
              onClick={() => handleInputChange('search', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              aria-label="Xóa tìm kiếm"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-3 flex-shrink-0">
            <button
            type="button"
            onClick={onToggleAdvanced}
            className={`btn ${showAdvanced ? 'btn-secondary-outline' : 'btn-outline'} flex items-center`}
            >
            <FiFilter size={16} className="mr-1.5" />
            {showAdvanced ? 'Ẩn lọc' : 'Bộ lọc'}
            </button>

            {hasActiveFilters && (
            <button
                type="button"
                onClick={handleClearAll}
                className="btn btn-danger-outline flex items-center"
            >
                <FiX size={16} className="mr-1.5" />
                Xóa lọc
            </button>
            )}
            <button type="submit" className="btn btn-primary flex items-center" disabled={isLoadingOptions}>
                <FiSearch size={16} className="mr-1.5" /> Tìm
            </button>
        </div>
      </form>

      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
          {isLoadingOptions ? (
            <div className="flex justify-center items-center py-4">
              <LoadingSpinner size="sm" message="Đang tải tùy chọn lọc..." />
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-800 mb-3">Bộ lọc nâng cao</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <div>
                  <label htmlFor="filter-type" className="form-label">Loại tài liệu</label>
                  <select id="filter-type" name="type" value={localFilters.type || ''} onChange={(e) => handleInputChange('type', e.target.value)} className="form-select" disabled={isLoadingOptions || documentTypeOptions.length === 0}>
                    {renderOptions(documentTypeOptions, "Tất cả loại tài liệu")}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-department" className="form-label">Phòng ban</label>
                  <select id="filter-department" name="department" value={localFilters.department || ''} onChange={(e) => handleInputChange('department', e.target.value)} className="form-select" disabled={isLoadingOptions || departmentOptions.length === 0}>
                     {renderOptions(departmentOptions, "Tất cả phòng ban")}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-status" className="form-label">Trạng thái</label>
                  <select id="filter-status" name="status" value={localFilters.status || ''} onChange={(e) => handleInputChange('status', e.target.value)} className="form-select" disabled={isLoadingOptions || statusOptions.length === 0}>
                    {renderOptions(statusOptions, "Tất cả trạng thái")}
                  </select>
                </div>
                {securityLevelOptions.length > 0 && (
                  <div>
                    <label htmlFor="filter-security" className="form-label">Mức bảo mật</label>
                    <select id="filter-security" name="security_level" value={localFilters.security_level || ''} onChange={(e) => handleInputChange('security_level', e.target.value)} className="form-select" disabled={isLoadingOptions}>
                      {renderOptions(securityLevelOptions, "Tất cả mức bảo mật")}
                    </select>
                  </div>
                )}
                {priorityOptions.length > 0 && (
                  <div>
                    <label htmlFor="filter-priority" className="form-label">Mức ưu tiên</label>
                    <select id="filter-priority" name="priority" value={localFilters.priority || ''} onChange={(e) => handleInputChange('priority', e.target.value)} className="form-select" disabled={isLoadingOptions}>
                       {renderOptions(priorityOptions, "Tất cả mức ưu tiên")}
                    </select>
                  </div>
                )}
                 <div>
                  <label htmlFor="filter-sort" className="form-label">Sắp xếp theo</label>
                  <select id="filter-sort" name="sort" value={localFilters.sort || 'relevance'} onChange={(e) => handleInputChange('sort', e.target.value)} className="form-select" disabled={isLoadingOptions}>
                    <option value="relevance">Liên quan nhất</option>
                    <option value="updated_at_desc">Ngày cập nhật (Mới nhất)</option>
                    <option value="updated_at_asc">Ngày cập nhật (Cũ nhất)</option>
                    <option value="created_at_desc">Ngày tạo (Mới nhất)</option>
                    <option value="created_at_asc">Ngày tạo (Cũ nhất)</option>
                    <option value="title_asc">Tiêu đề (A-Z)</option>
                    <option value="title_desc">Tiêu đề (Z-A)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-gray-200 mt-3">
                <div>
                  <label htmlFor="filter-date-from" className="form-label">Ngày cập nhật từ</label>
                  <div className="relative"><FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input id="filter-date-from" type="date" name="date_from" value={localFilters.date_from || ''} onChange={(e) => handleInputChange('date_from', e.target.value)} className="form-input pl-10"/></div>
                </div>
                <div>
                  <label htmlFor="filter-date-to" className="form-label">Ngày cập nhật đến</label>
                  <div className="relative"><FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input id="filter-date-to" type="date" name="date_to" value={localFilters.date_to || ''} onChange={(e) => handleInputChange('date_to', e.target.value)} min={localFilters.date_from || ''} className="form-input pl-10"/></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-3 border-t border-gray-200 mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="include_archived" checked={localFilters.include_archived || false} onChange={(e) => handleInputChange('include_archived', e.target.checked)} className="form-checkbox"/>
                  <span className="text-sm text-gray-700">Bao gồm tài liệu lưu trữ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="search_content" checked={localFilters.search_content || false} onChange={(e) => handleInputChange('search_content', e.target.checked)} className="form-checkbox"/>
                  <span className="text-sm text-gray-700">Tìm trong nội dung file</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="exact_match" checked={localFilters.exact_match || false} onChange={(e) => handleInputChange('exact_match', e.target.checked)} className="form-checkbox"/>
                  <span className="text-sm text-gray-700">Tìm kiếm chính xác cụm từ</span>
                </label>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-600 font-medium">Đang lọc bởi:</span>
                {Object.entries(localFilters).map(([key, value]) => {
                  if (key === 'sort' || !value && typeof value !== 'boolean') return null;

                  let displayValue = String(value);
                  let displayKey = key;

                  const findLabel = (options, val) => options.find(o => o.value === val)?.label || val;

                  switch (key) {
                    case 'type': displayKey = 'Loại'; displayValue = findLabel(documentTypeOptions, value); break;
                    case 'department': displayKey = 'P.Ban'; displayValue = findLabel(departmentOptions, value); break;
                    case 'status': displayKey = 'T.Thái'; displayValue = findLabel(statusOptions, value); break;
                    case 'security_level': displayKey = 'B.Mật'; displayValue = findLabel(securityLevelOptions, value); break;
                    case 'priority': displayKey = 'Ư.Tiên'; displayValue = findLabel(priorityOptions, value); break;
                    case 'date_from': displayKey = 'Từ ngày'; displayValue = new Date(value + 'T00:00:00').toLocaleDateString('vi-VN'); break;
                    case 'date_to': displayKey = 'Đến ngày'; displayValue = new Date(value + 'T00:00:00').toLocaleDateString('vi-VN'); break;
                    case 'include_archived': if(!value) return null; displayKey = ''; displayValue = 'Gồm Lưu trữ'; break;
                    case 'search_content': if(!value) return null; displayKey = ''; displayValue = 'Tìm nội dung'; break;
                    case 'exact_match': if(!value) return null; displayKey = ''; displayValue = 'Khớp chính xác'; break;
                    default: displayKey = ''; break;
                  }
                  if (key === 'search' && value) displayKey = 'Từ khóa';


                  return (
                    <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full">
                      {displayKey && <strong className="mr-0.5">{displayKey}:</strong>}
                      {displayValue}
                      <button onClick={() => handleInputChange(key, typeof value === 'boolean' ? false : '')} className="ml-1 hover:text-red-600" aria-label={`Xóa bộ lọc ${displayKey}`}>
                        <FiX size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilters;