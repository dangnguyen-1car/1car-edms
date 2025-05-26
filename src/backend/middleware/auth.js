/**
 * =================================================================
 * EDMS 1CAR - Authentication Middleware (Fixed 401 Error)
 * JWT token validation middleware
 * Based on C-PR-MG-003 access control procedures
 * =================================================================
 */

const { verifyAccessToken } = require('../config/jwt');
const { createError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Middleware to authenticate JWT tokens
 */
async function authenticateToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Access token không được cung cấp', 401, 'MISSING_TOKEN');
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (tokenError) {
      if (tokenError.message.includes('expired')) {
        throw createError('Token đã hết hạn', 401, 'TOKEN_EXPIRED');
      } else if (tokenError.message.includes('invalid')) {
        throw createError('Token không hợp lệ', 401, 'INVALID_TOKEN');
      } else {
        throw createError('Xác thực token thất bại', 401, 'TOKEN_VERIFICATION_FAILED');
      }
    }

    // Get user from database
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw createError('Người dùng không tồn tại', 401, 'USER_NOT_FOUND');
    }

    if (!user.is_active) {
      throw createError('Tài khoản đã bị vô hiệu hóa', 401, 'ACCOUNT_INACTIVE');
    }

    // Add user and token to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      role: user.role,
      is_active: user.is_active
    };
    req.token = token;
    req.tokenPayload = decoded;

    next();

  } catch (error) {
    // Log authentication failure
    console.error('Authentication failed:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    });

    next(error);
  }
}

/**
 * Middleware to check if user has specific permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError('Chưa xác thực', 401, 'NOT_AUTHENTICATED');
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Define permission mappings based on C-FM-MG-004
      const userPermissions = {
        'view_documents': true,
        'create_documents': true,
        'edit_own_documents': true,
        'upload_files': true,
        'view_own_department': true
      };

      const adminPermissions = {
        ...userPermissions,
        'manage_users': true,
        'view_all_documents': true,
        'manage_system': true,
        'view_audit_logs': true,
        'manage_archive': true
      };

      const permissions = req.user.role === 'admin' ? adminPermissions : userPermissions;

      if (!permissions[permission]) {
        throw createError('Không có quyền truy cập', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      next();

    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user can access specific department
 */
function requireDepartmentAccess(department) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError('Chưa xác thực', 401, 'NOT_AUTHENTICATED');
      }

      // Admin can access all departments
      if (req.user.role === 'admin') {
        return next();
      }

      // Users can only access their own department
      if (req.user.department !== department) {
        throw createError('Không có quyền truy cập phòng ban này', 403, 'DEPARTMENT_ACCESS_DENIED');
      }

      next();

    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.id);
        
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            department: user.department,
            role: user.role,
            is_active: user.is_active
          };
          req.token = token;
          req.tokenPayload = decoded;
        }
      } catch (tokenError) {
        // Ignore token errors for optional auth
        console.warn('Optional auth token verification failed:', tokenError.message);
      }
    }

    next();

  } catch (error) {
    // Don't fail for optional auth
    next();
  }
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireDepartmentAccess,
  optionalAuth
};
