// src/backend/utils/helpers.js
const path = require('path')
const fs = require('fs')

// Format bytes to human readable
function formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Generate unique filename
function generateUniqueFilename (originalName) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const ext = path.extname(originalName)
  const name = path.basename(originalName, ext)
  return `${name}-${timestamp}-${random}${ext}`
}

// Ensure directory exists
function ensureDirectoryExists (dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

// Calculate date range for common periods
function getDateRange (period) {
  const now = new Date()
  const ranges = {
    today: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      end: now
    },
    yesterday: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate())
    },
    thisWeek: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()),
      end: now
    },
    lastWeek: {
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    },
    thisMonth: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now
    },
    lastMonth: {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0)
    },
    last30Days: {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: now
    },
    last90Days: {
      start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      end: now
    }
  }
  return ranges[period] || ranges.last30Days
}

// Sanitize filename for safe storage
function sanitizeFilename (filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}

// Parse and validate JSON safely
function safeJsonParse (str, defaultValue = null) {
  try {
    return JSON.parse(str)
  } catch (error) {
    return defaultValue
  }
}

// Create error response
function createErrorResponse (message, code = 'INTERNAL_ERROR', statusCode = 500) {
  return {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  }
}

// Create success response
function createSuccessResponse (data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

// Validate Vietnamese document code format
function validateDocumentCode (code) {
  // Format: C-XX-YYY-ZZZ where XX is type, YYY is department code, ZZZ is sequential number
  const pattern = /^C-[A-Z]{2}-[A-Z]{2,3}-\d{3}$/
  return pattern.test(code)
}

// Generate next document code
function generateNextDocumentCode (type, department, lastNumber = 0) {
  const departmentCodes = {
    'Ban Giám đốc': 'BGD',
    'Phòng Phát triển Nhượng quyền': 'PNQ',
    'Phòng Đào tạo Tiêu chuẩn': 'DTC',
    'Phòng Marketing': 'MKT',
    'Phòng Kỹ thuật QC': 'QC',
    'Phòng Tài chính': 'TC',
    'Phòng Công nghệ Hệ thống': 'CNH',
    'Phòng Pháp lý': 'PL',
    'Bộ phận Tiếp nhận CSKH': 'CS',
    'Bộ phận Kỹ thuật Garage': 'KT',
    'Bộ phận QC Garage': 'QC',
    'Bộ phận Kho/Kế toán Garage': 'KT',
    'Bộ phận Marketing Garage': 'MG',
    'Quản lý Garage': 'QL'
  }
  const deptCode = departmentCodes[department] || 'GEN'
  const nextNumber = String(lastNumber + 1).padStart(3, '0')
  return `C-${type}-${deptCode}-${nextNumber}`
}

module.exports = {
  formatBytes,
  generateUniqueFilename,
  ensureDirectoryExists,
  getDateRange,
  sanitizeFilename,
  safeJsonParse,
  createErrorResponse,
  createSuccessResponse,
  validateDocumentCode,
  generateNextDocumentCode
}
