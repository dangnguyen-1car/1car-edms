// src/backend/middleware/permissionMiddleware.js
/**

=================================================================

EDMS 1CAR - Permission Middleware

Factory function để tạo middleware kiểm tra quyền

Based on C-PL-MG-005 requirements

=================================================================
*/

const PermissionService = require('../services/permissionService');
const { createError } = require('./errorHandler');

/**

Factory function tạo middleware kiểm tra quyền

@param {string} action - Hành động cần kiểm tra (ví dụ: EDIT_DOCUMENT, VIEW_DOCUMENT)

@param {string} resourceType - Loại tài nguyên (ví dụ: document, user)

@returns {Function} - Middleware function
*/
const checkPermission = (action, resourceType) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      // Kiểm tra user đã được xác thực
      if (!user) {
        return next(createError('Xác thực không hợp lệ', 401, 'UNAUTHENTICATED'));
      }

      // Lấy resourceId từ params (có thể là id, documentId, userId, v.v.)
      const resourceId = req.params.id || req.params.documentId || req.params.userId || null;

      // Tạo context từ request
      const context = {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionID
      };

      // Kiểm tra quyền thông qua PermissionService
      const permissionResult = await PermissionService.checkPermission(
        user.id,
        action,
        resourceType,
        resourceId,
        context
      );

      if (permissionResult.allowed) {
        // Cho phép tiếp tục
        return next();
      } else {
        // Từ chối quyền truy cập
        return next(createError(
          `Từ chối truy cập: ${permissionResult.reason}`,
          403,
          'PERMISSION_DENIED'
        ));
      }
    } catch (error) {
      // Lỗi hệ thống trong quá trình kiểm tra quyền
      return next(createError(
        `Lỗi kiểm tra quyền: ${error.message}`,
        500,
        'PERMISSION_CHECK_ERROR'
      ));
    }
  };
};

/**

Middleware kiểm tra quyền admin

@returns {Function} - Middleware function
*/
const requireAdmin = () => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(createError('Xác thực không hợp lệ', 401, 'UNAUTHENTICATED'));
    }

    if (user.role !== 'admin') {
      return next(createError('Yêu cầu quyền quản trị viên', 403, 'ADMIN_REQUIRED'));
    }

    next();
  };
};

/**

Middleware kiểm tra quyền truy cập tài nguyên của chính mình

@param {string} paramName - Tên parameter chứa ID (mặc định: 'id')

@returns {Function} - Middleware function
*/
const requireSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return next(createError('Xác thực không hợp lệ', 401, 'UNAUTHENTICATED'));
    }

    const targetUserId = req.params[paramName];

    // Admin có thể truy cập mọi tài nguyên
    if (user.role === 'admin') {
      return next();
    }

    // User chỉ có thể truy cập tài nguyên của chính mình
    if (user.id.toString() === targetUserId) {
      return next();
    }

    return next(createError(
      'Bạn chỉ có thể truy cập tài nguyên của chính mình',
      403,
      'SELF_ACCESS_ONLY'
    ));
  };
};

/**

Middleware kiểm tra quyền theo phòng ban

@param {string} resourceType - Loại tài nguyên

@returns {Function} - Middleware function
*/
const requireSameDepartment = (resourceType = 'document') => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return next(createError('Xác thực không hợp lệ', 401, 'UNAUTHENTICATED'));
      }

      // Admin có quyền truy cập mọi phòng ban
      if (user.role === 'admin') {
        return next();
      }

      const resourceId = req.params.id || req.params.documentId;

      if (!resourceId) {
        return next(createError('Không tìm thấy ID tài nguyên', 400, 'MISSING_RESOURCE_ID'));
      }

      // Kiểm tra phòng ban của tài nguyên (cần implement logic cụ thể cho từng loại tài nguyên)
      // Ví dụ cho document:
      if (resourceType === 'document') {
        const Document = require('../models/Document');
        const document = await Document.findById(resourceId);

        if (!document) {
          return next(createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND'));
        }

        if (document.department !== user.department) {
          return next(createError(
            'Bạn chỉ có thể truy cập tài liệu trong phòng ban của mình',
            403,
            'DEPARTMENT_ACCESS_ONLY'
          ));
        }
      }

      next();
    } catch (error) {
      return next(createError(
        `Lỗi kiểm tra quyền phòng ban: ${error.message}`,
        500,
        'DEPARTMENT_CHECK_ERROR'
      ));
    }
  };
};

module.exports = {
  checkPermission,
  requireAdmin,
  requireSelfOrAdmin,
  requireSameDepartment
};