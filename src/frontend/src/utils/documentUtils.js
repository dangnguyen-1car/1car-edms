// src/frontend/src/utils/documentUtils.js
/**
 * =================================================================
 * EDMS 1CAR - Document Utility Functions (FINAL & COMPLETE)
 * Fully synchronized with the backend.
 * `value` is the department code (e.g., 'MG'), `label` is the full name.
 * =================================================================
 */

// --- Department Options (Synchronized with Backend) ---
export const departmentOptions = [
  { value: 'MG', label: 'Ban Giám đốc' },
  { value: 'FR', label: 'Phòng Phát triển Nhượng quyền' },
  { value: 'TR', label: 'Phòng Đào tạo Tiêu chuẩn' },
  { value: 'MK', label: 'Phòng Marketing' },
  { value: 'QC', label: 'Phòng Kỹ thuật QC' },
  { value: 'FI', label: 'Phòng Tài chính' },
  { value: 'IT', label: 'Phòng Công nghệ Hệ thống' },
  { value: 'LG', label: 'Phòng Pháp lý' },
  { value: 'CS', label: 'Bộ phận Tiếp nhận CSKH' },
  { value: 'TE', label: 'Bộ phận Kỹ thuật Garage' },
  { value: 'QG', label: 'Bộ phận QC Garage' },
  { value: 'WH', label: 'Bộ phận Kho/Kế toán Garage' },
  { value: 'AS', label: 'Bộ phận Marketing Garage' },
  { value: 'GM', label: 'Quản lý Garage' },
];

// --- Document Type Options ---
export const documentTypeOptions = [
    { value: 'PL', label: 'Chính sách' },
    { value: 'PR', label: 'Quy trình' },
    { value: 'WI', label: 'Hướng dẫn' },
    { value: 'FM', label: 'Biểu mẫu' },
    { value: 'TD', label: 'Tài liệu Kỹ thuật' },
    { value: 'TR', label: 'Tài liệu Đào tạo' },
    { value: 'RC', label: 'Hồ sơ' }
];

// --- Document Type Helpers ---

/**
 * Get display text for document type
 * @param {string} type - Document type code
 * @returns {string} - Display text for document type
 */
export const getDocumentTypeDisplay = (type) => {
  const types = {
    'PL': 'Chính sách',
    'PR': 'Quy trình',
    'WI': 'Hướng dẫn',
    'FM': 'Biểu mẫu',
    'TD': 'Tài liệu K.thuật',
    'TR': 'Tài liệu Đ.tạo',
    'RC': 'Hồ sơ'
  };
  return types[type] || 'Không xác định';
};

/**
 * Get CSS classes for document type badge
 * @param {string} type - Document type code
 * @returns {string} - CSS classes for type badge
 */
export const getTypeBadgeColor = (type) => {
  const colors = {
    'PL': 'bg-purple-100 text-purple-800 border-purple-200',
    'PR': 'bg-blue-100 text-blue-800 border-blue-200',
    'WI': 'bg-green-100 text-green-800 border-green-200',
    'FM': 'bg-orange-100 text-orange-800 border-orange-200',
    'TD': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'TR': 'bg-pink-100 text-pink-800 border-pink-200',
    'RC': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

/**
 * Get document icon based on type
 * @param {string} type - Document type code
 * @returns {string} - Icon class name
 */
export const getDocumentTypeIcon = (type) => {
  const icons = {
    'PL': 'FiShield',
    'PR': 'FiGitBranch',
    'WI': 'FiBookOpen',
    'FM': 'FiFileText',
    'TD': 'FiTool',
    'TR': 'FiGraduationCap',
    'RC': 'FiArchive'
  };
  return icons[type] || 'FiFile';
};

// --- Document Status Helpers ---

/**
 * Get display text for document status
 * @param {string} status - Document status code
 * @returns {string} - Display text for document status
 */
export const getStatusDisplay = (status) => {
  const statuses = {
    'draft': 'Bản nháp',
    'review': 'Đang xem xét',
    'published': 'Đã phê duyệt',
    'archived': 'Đã lưu trữ'
  };
  return statuses[status] || 'Không xác định';
};

/**
 * Get CSS classes for status badge
 * @param {string} status - Document status code
 * @returns {string} - CSS classes for status badge
 */
export const getStatusBadgeColor = (status) => {
  const colors = {
    'draft': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'review': 'bg-blue-100 text-blue-800 border-blue-200',
    'published': 'bg-green-100 text-green-800 border-green-200',
    'archived': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// --- Document Code Helpers ---

/**
 * Format document code for display
 * @param {string} code - Document code
 * @returns {string} - Formatted document code
 */
export const formatDocumentCode = (code) => {
  if (!code) return 'N/A';
  return code.toUpperCase();
};

/**
 * Validate document code format
 * @param {string} code - Document code to validate
 * @returns {boolean} - Whether the code is valid
 */
export const isValidDocumentCode = (code) => {
  if (!code) return false;
  return /^C-[A-Z]{2,3}-[A-Z]{2,6}-\d{3}$/.test(code);
};

// --- Priority Helpers ---

/**
 * Get priority display text
 * @param {string} priority - Priority code
 * @returns {string} - Display text for priority
 */
export const getPriorityDisplay = (priority) => {
  const priorities = {
    'low': 'Thấp',
    'normal': 'Bình thường',
    'high': 'Cao',
    'urgent': 'Khẩn cấp'
  };
  return priorities[priority] || 'Bình thường';
};

/**
 * Get priority badge color
 * @param {string} priority - Priority code
 * @returns {string} - CSS classes for priority badge
 */
export const getPriorityBadgeColor = (priority) => {
  const colors = {
    'low': 'bg-gray-100 text-gray-800 border-gray-200',
    'normal': 'bg-blue-100 text-blue-800 border-blue-200',
    'high': 'bg-orange-100 text-orange-800 border-orange-200',
    'urgent': 'bg-red-100 text-red-800 border-red-200'
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

// --- Security Level Helpers ---

/**
 * Get security level display text
 * @param {string} level - Security level code
 * @returns {string} - Display text for security level
 */
export const getSecurityLevelDisplay = (level) => {
  const levels = {
    'public': 'Công khai (P)',
    'internal': 'Nội bộ (I)',
    'confidential': 'Bảo mật (C)',
    'restricted': 'Hạn chế (R)'
  };
  return levels[level] || 'Nội bộ (I)';
};