// src/components/documents/SearchFilters.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiSearch, FiFilter, FiX, FiCalendar } from 'react-icons/fi';

function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  showAdvanced = false, 
  onToggleAdvanced 
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const debounceTimeoutRef = useRef(null);

  // Danh sách các lựa chọn theo chuẩn EDMS 1CAR
  const documentTypes = [
    { code: '', name: 'Tất cả loại tài liệu' },
    { code: 'PL', name: 'Chính sách' },
    { code: 'PR', name: 'Quy trình' },
    { code: 'WI', name: 'Hướng dẫn' },
    { code: 'FM', name: 'Biểu mẫu' },
    { code: 'TD', name: 'Tài liệu kỹ thuật' },
    { code: 'TR', name: 'Tài liệu đào tạo' },
    { code: 'RC', name: 'Hồ sơ' },
  ];

  const departments = [
    '',
    'Ban Giám đốc',
    'Phòng Phát triển Nhượng quyền',
    'Phòng Đào tạo Tiêu chuẩn',
    'Phòng Marketing',
    'Phòng Kỹ thuật QC',
    'Phòng Tài chính',
    'Phòng Công nghệ Hệ thống',
    'Phòng Pháp lý',
    'Bộ phận Tiếp nhận CSKH',
    'Bộ phận Kỹ thuật Garage',
    'Bộ phận QC Garage',
    'Bộ phận Kho/Kế toán Garage',
    'Bộ phận Marketing Garage',
    'Quản lý Garage',
  ];

  const statuses = [
    { code: '', name: 'Tất cả trạng thái' },
    { code: 'draft', name: 'Bản nháp' },
    { code: 'review', name: 'Đang xem xét' },
    { code: 'published', name: 'Đã phê duyệt' },
    { code: 'archived', name: 'Đã lưu trữ' },
  ];

  const securityLevels = [
    { code: '', name: 'Tất cả mức bảo mật' },
    { code: 'public', name: 'Công khai (P)' },
    { code: 'internal', name: 'Nội bộ (I)' },
    { code: 'confidential', name: 'Bảo mật (C)' },
    { code: 'restricted', name: 'Hạn chế (R)' },
  ];

  const priorities = [
    { code: '', name: 'Tất cả mức ưu tiên' },
    { code: 'low', name: 'Thấp' },
    { code: 'normal', name: 'Bình thường' },
    { code: 'high', name: 'Cao' },
    { code: 'urgent', name: 'Khẩn cấp' },
  ];

  // Sync local filters với props khi props thay đổi
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
    }, 300); // 300ms debounce delay
  }, [onFiltersChange]);

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Handle input changes với debounce cho search, immediate cho các field khác
  const handleInputChange = (name, value) => {
    const newFilters = { ...localFilters, [name]: value };
    setLocalFilters(newFilters);
    
    // Chỉ debounce cho search field, các field khác thì immediate
    if (name === 'search') {
      debouncedFiltersChange(newFilters);
    } else {
      // Clear debounce timeout nếu có
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      onFiltersChange(newFilters);
    }
  };

  // Handle search submit (khi nhấn Enter)
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    
    // Clear debounce timeout và gọi ngay lập tức
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    onFiltersChange(localFilters);
  };

  // Clear all filters
  const handleClearAll = () => {
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    
    const clearedFilters = {
      search: '',
      type: '',
      department: '',
      status: '',
      security_level: '',
      priority: '',
      date_from: '',
      date_to: '',
      include_archived: false,
      search_content: false,
      exact_match: false,
    };
    
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== '' && value !== false
  );

  return (
    <div className="space-y-4">
      {/* Basic Search */}
      <form onSubmit={handleSearchSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề, mã tài liệu, nội dung..."
            value={localFilters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {localFilters.search && (
            <button
              type="button"
              onClick={() => handleInputChange('search', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX size={16} />
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={onToggleAdvanced}
          className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 ${
            showAdvanced 
              ? 'bg-blue-50 border-blue-300 text-blue-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <FiFilter size={16} />
          Bộ lọc
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <FiX size={16} />
            Xóa lọc
          </button>
        )}
      </form>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900 mb-3">Bộ lọc nâng cao</h3>
          
          {/* Row 1: Type, Department, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại tài liệu
              </label>
              <select
                value={localFilters.type || ''}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {documentTypes.map(type => (
                  <option key={type.code} value={type.code}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phòng ban
              </label>
              <select
                value={localFilters.department || ''}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả phòng ban</option>
                {departments.filter(dept => dept).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                value={localFilters.status || ''}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(status => (
                  <option key={status.code} value={status.code}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Security Level, Priority, Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức bảo mật
              </label>
              <select
                value={localFilters.security_level || ''}
                onChange={(e) => handleInputChange('security_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {securityLevels.map(level => (
                  <option key={level.code} value={level.code}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mức ưu tiên
              </label>
              <select
                value={localFilters.priority || ''}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorities.map(priority => (
                  <option key={priority.code} value={priority.code}>
                    {priority.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={localFilters.date_from || ''}
                  onChange={(e) => handleInputChange('date_from', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="date"
                  value={localFilters.date_to || ''}
                  onChange={(e) => handleInputChange('date_to', e.target.value)}
                  min={localFilters.date_from || ''}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Additional Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localFilters.include_archived || false}
                onChange={(e) => handleInputChange('include_archived', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Bao gồm tài liệu đã lưu trữ</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localFilters.search_content || false}
                onChange={(e) => handleInputChange('search_content', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tìm kiếm trong nội dung</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={localFilters.exact_match || false}
                onChange={(e) => handleInputChange('exact_match', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Tìm kiếm chính xác</span>
            </label>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="border-t border-gray-200 pt-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Bộ lọc đang áp dụng:</span>
                {Object.entries(localFilters).map(([key, value]) => {
                  if (!value || value === false) return null;
                  
                  let displayValue = value;
                  if (key === 'type') {
                    displayValue = documentTypes.find(t => t.code === value)?.name || value;
                  } else if (key === 'status') {
                    displayValue = statuses.find(s => s.code === value)?.name || value;
                  } else if (key === 'security_level') {
                    displayValue = securityLevels.find(l => l.code === value)?.name || value;
                  } else if (key === 'priority') {
                    displayValue = priorities.find(p => p.code === value)?.name || value;
                  } else if (key === 'date_from') {
                    displayValue = `Từ: ${new Date(value).toLocaleDateString('vi-VN')}`;
                  } else if (key === 'date_to') {
                    displayValue = `Đến: ${new Date(value).toLocaleDateString('vi-VN')}`;
                  } else if (typeof value === 'boolean') {
                    displayValue = key === 'include_archived' ? 'Bao gồm lưu trữ' :
                                  key === 'search_content' ? 'Tìm nội dung' :
                                  key === 'exact_match' ? 'Tìm chính xác' : key;
                  }

                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {displayValue}
                      <button
                        onClick={() => handleInputChange(key, key === 'include_archived' || key === 'search_content' || key === 'exact_match' ? false : '')}
                        className="hover:text-blue-600"
                      >
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
