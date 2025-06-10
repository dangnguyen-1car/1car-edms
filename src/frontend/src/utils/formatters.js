// src/utils/formatters.js
/**
 * =================================================================
 * EDMS 1CAR - Formatter Utilities
 * A collection of utility functions for formatting various data types.
 * Grouped by category for better organization and maintainability.
 * =================================================================
 */

// --- Internal Function Implementations ---

/**
 * Capitalize first letter of each word.
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
const capitalizeWords = (text) => {
    if (!text) return '';
    return text.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Truncate text with ellipsis.
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Format phone number to Vietnamese format.
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('84')) {
        const localPart = cleaned.substring(2);
        return `+84 (0) ${localPart.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    if (cleaned.length === 9) {
        return `0${cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}`;
    }
    return phone; // Return original if it doesn't match common formats
};

/**
 * Format date to Vietnamese locale.
 * @param {string|Date} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    const defaultOptions = { year: 'numeric', month: 'long', day: 'numeric', ...options };
    return dateObj.toLocaleDateString('vi-VN', defaultOptions);
};

/**
 * Format date and time to Vietnamese locale.
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted datetime string
 */
const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    return dateObj.toLocaleString('vi-VN', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

/**
 * Format relative time (e.g., "5 phút trước").
 * @param {string|Date} date - Date to format
 * @returns {string} - Relative time string
 */
const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} tháng trước`;
    return `${Math.floor(diffInSeconds / 31536000)} năm trước`;
};

/**
 * Format duration in human readable format (e.g., "1h 30m 15s").
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    if (seconds < 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.round(seconds % 60);
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
    return parts.join(' ');
};

/**
 * Format number with Vietnamese locale.
 * @param {number} number - Number to format
 * @returns {string} - Formatted number
 */
const formatNumber = (number) => {
    if (number === null || number === undefined) return 'N/A';
    return number.toLocaleString('vi-VN');
};

/**
 * Format currency in VND.
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

/**
 * Format file size in human readable format.
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format percentage.
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage
 */
const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format document code for display.
 * @param {string} code - Document code
 * @returns {string} - Formatted document code
 */
const formatDocumentCode = (code) => {
    if (!code) return 'N/A';
    return code.toUpperCase();
};

/**
 * Format document code according to 1CAR standards.
 * @param {string} type - Document type (PL, PR, WI, etc.)
 * @param {string} department - Department code
 * @param {string} sequence - Sequence number
 * @returns {string} Formatted document code
 */
const formatDocumentCodeStandard = (type, department, sequence) => {
    if (!type || !department || !sequence) return 'N/A';
    const formattedSequence = sequence.toString().padStart(3, '0');
    return `C-${type}-${department}-${formattedSequence}`;
};

/**
 * Format version number.
 * @param {string} version - Version string
 * @returns {string} - Formatted version
 */
const formatVersion = (version) => {
    if (!version) return '1.0';
    return version;
};

/**
 * Format version number according to 1CAR standards (XX.YY).
 * @param {number} major - Major version number
 * @param {number} minor - Minor version number
 * @returns {string} Formatted version
 */
const formatVersionStandard = (major, minor) => {
    if (typeof major !== 'number' || typeof minor !== 'number') return '01.00';
    const formattedMajor = major.toString().padStart(2, '0');
    const formattedMinor = minor.toString().padStart(2, '0');
    return `${formattedMajor}.${formattedMinor}`;
};

/**
 * Parse version string (XX.YY) to major and minor numbers.
 * @param {string} version - Version string
 * @returns {Object} Object with major and minor properties
 */
const parseVersion = (version) => {
    if (!version || typeof version !== 'string') return { major: 1, minor: 0 };
    const parts = version.split('.');
    const major = parseInt(parts[0], 10) || 1;
    const minor = parseInt(parts[1], 10) || 0;
    return { major, minor };
};

/**
 * Format document status for display.
 * @param {string} status - Document status
 * @returns {Object} Status display info
 */
const formatDocumentStatus = (status) => {
    const statusMap = {
        'draft': { label: 'Bản nháp', color: 'yellow', description: 'Tài liệu đang được soạn thảo' },
        'review': { label: 'Đang xem xét', color: 'blue', description: 'Tài liệu đang chờ được xem xét' },
        'published': { label: 'Đã ban hành', color: 'green', description: 'Tài liệu đã được phê duyệt và có hiệu lực' },
        'archived': { label: 'Đã lưu trữ', color: 'gray', description: 'Tài liệu đã được lưu trữ' },
        'disposed': { label: 'Đã hủy', color: 'red', description: 'Tài liệu đã được hủy' }
    };
    return statusMap[status] || {
        label: status || 'Không xác định', color: 'gray', description: 'Trạng thái không xác định'
    };
};


// --- Exported Formatter Groups ---

/**
 * @namespace text
 * @description Functions for formatting and manipulating strings.
 */
export const text = {
    capitalizeWords,
    truncateText,
    formatPhoneNumber,
};

/**
 * @namespace dateTime
 * @description Functions for formatting dates, times, and durations.
 */
export const dateTime = {
    formatDate,
    formatDateTime,
    formatRelativeTime,
    formatDuration,
};

/**
 * @namespace numeric
 * @description Functions for formatting numbers, currency, and file sizes.
 */
export const numeric = {
    formatNumber,
    formatCurrency,
    formatFileSize,
    formatPercentage,
};

/**
 * @namespace domain
 * @description Domain-specific formatters for the EDMS 1CAR application.
 */
export const domain = {
    formatDocumentCode,
    formatDocumentCodeStandard,
    formatVersion,
    formatVersionStandard,
    parseVersion,
    formatDocumentStatus,
};

// --- Default export for convenience ---
const formatters = {
    ...text,
    ...dateTime,
    ...numeric,
    ...domain,
};

export default formatters;