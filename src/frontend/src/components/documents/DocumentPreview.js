// src/frontend/src/components/documents/DocumentPreview.js
import React from 'react';
import { FiFile, FiUser, FiCalendar, FiTag, FiShield, FiClock } from 'react-icons/fi';

function DocumentPreview({ data }) {
  // If no data is provided, don't render anything
  if (!data) return null;

  // --- Helper Functions ---

  /**
   * Formats a date string into a localized date string (Vietnamese locale).
   * @param {string} date - The date string to format.
   * @returns {string} The formatted date string.
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  /**
   * Returns the human-readable label for a given security level.
   * @param {string} level - The security level code (e.g., 'public', 'internal').
   * @returns {string} The corresponding label.
   */
  const getSecurityLevelLabel = (level) => {
    const levels = {
      'public': 'Công khai (P)',
      'internal': 'Nội bộ (I)',
      'confidential': 'Bảo mật (C)',
      'restricted': 'Hạn chế (R)'
    };
    return levels[level] || level;
  };

  /**
   * Returns the human-readable label for a given priority level.
   * @param {string} priority - The priority level code (e.g., 'low', 'normal').
   * @returns {string} The corresponding label.
   */
  const getPriorityLabel = (priority) => {
    const priorities = {
      'low': 'Thấp',
      'normal': 'Bình thường',
      'high': 'Cao',
      'urgent': 'Khẩn cấp'
    };
    return priorities[priority] || priority;
  };

  /**
   * Returns the Tailwind CSS classes for background and text color based on priority level.
   * @param {string} priority - The priority level code.
   * @returns {string} Tailwind CSS classes.
   */
  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-800',
      'normal': 'bg-blue-100 text-blue-800',
      'high': 'bg-yellow-100 text-yellow-800',
      'urgent': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  /**
   * Returns the Tailwind CSS classes for background and text color based on security level.
   * @param {string} level - The security level code.
   * @returns {string} Tailwind CSS classes.
   */
  const getSecurityColor = (level) => {
    const colors = {
      'public': 'bg-green-100 text-green-800',
      'internal': 'bg-blue-100 text-blue-800',
      'confidential': 'bg-yellow-100 text-yellow-800',
      'restricted': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  // --- JSX Rendering ---
  return (
    <div className="space-y-6">
      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Xem trước Tài liệu</h3>
        <p className="text-blue-700 text-sm">
          Vui lòng kiểm tra kỹ thông tin trước khi tạo tài liệu. Sau khi tạo, một số thông tin có thể không thể thay đổi.
        </p>
      </div>

      {/* Basic Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <FiFile className="mr-2" />
          Thông tin cơ bản
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Mã tài liệu</label>
            <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded border">
              {data.document_code || 'Chưa có mã'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Loại tài liệu</label>
            <p className="text-gray-900 px-3 py-2">{data.type || 'Chưa chọn'}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600">Tiêu đề</label>
            <p className="text-gray-900 px-3 py-2 font-medium">{data.title || 'Chưa có tiêu đề'}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600">Mô tả</label>
            <p className="text-gray-900 px-3 py-2">
              {data.description || 'Không có mô tả'}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600">Phạm vi áp dụng</label>
            <p className="text-gray-900 px-3 py-2">
              {data.scope_of_application || 'Chưa xác định'}
            </p>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
          <FiTag className="mr-2" />
          Metadata
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Phòng ban</label>
            <p className="text-gray-900 px-3 py-2">{data.department || 'Chưa chọn'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Độ ưu tiên</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(data.priority)}`}>
              {getPriorityLabel(data.priority)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Mức bảo mật</label>
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getSecurityColor(data.security_level)}`}>
              {getSecurityLevelLabel(data.security_level)}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Chu kỳ rà soát</label>
            <p className="text-gray-900 px-3 py-2 flex items-center">
              <FiClock className="mr-1" size={16} />
              {data.review_cycle ? `${data.review_cycle} tháng` : 'Chưa xác định'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Thời gian lưu trữ</label>
            <p className="text-gray-900 px-3 py-2 flex items-center">
              <FiCalendar className="mr-1" size={16} />
              {data.retention_period ? `${data.retention_period} tháng` : 'Chưa xác định'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Từ khóa</label>
            <p className="text-gray-900 px-3 py-2">
              {data.keywords || 'Không có từ khóa'}
            </p>
          </div>
        </div>

        {/* Recipients */}
        {data.recipients && data.recipients.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">Người nhận</label>
            <div className="flex flex-wrap gap-2">
              {data.recipients.map((recipient, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  <FiUser className="mr-1" size={14} />
                  {recipient}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Information Section */}
      {data.file_info && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <FiFile className="mr-2" />
            File đính kèm
          </h4>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded border">
            <div className="text-2xl">
              {/* Conditional rendering for file icons based on mimetype */}
              {data.file_info.mimetype?.includes('pdf') ? '📄' :
               data.file_info.mimetype?.includes('word') ? '📝' :
               data.file_info.mimetype?.includes('sheet') ? '📊' : ' '}
            </div>
            <div>
              <p className="font-medium text-gray-900">{data.file_info.originalname}</p>
              <p className="text-sm text-gray-500">
                {/* Format file size in MB */}
                {data.file_info.size ? `${(data.file_info.size / 1024 / 1024).toFixed(2)} MB` : 'Kích thước không xác định'} -
                {data.file_info.mimetype || 'Định dạng không xác định'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-md font-semibold text-green-900 mb-2">Tóm tắt</h4>
        <ul className="text-green-700 text-sm space-y-1">
          <li>- Tài liệu sẽ được tạo với trạng thái "Nháp" hoặc "Đang xem xét"</li>
          <li>- Phiên bản ban đầu: 01.00</li>
          <li>- Bạn có thể chỉnh sửa tài liệu sau khi tạo (nếu có quyền)</li>
          {data.file_info && <li>- File đính kèm sẽ được liên kết với tài liệu</li>}
          <li>- Tài liệu sẽ được thông báo đến người nhận (nếu có)</li>
        </ul>
      </div>
    </div>
  );
}

export default DocumentPreview;