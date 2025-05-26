/**
 * =================================================================
 * EDMS 1CAR - Users Routes (Fixed)
 * Handle user management endpoints
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');

// Mock user service
const UserService = {
  async getUsers(params) {
    const mockUsers = [
      {
        id: 1,
        email: 'admin@1car.vn',
        name: 'System Administrator',
        department: 'Ban Giám đốc',
        role: 'admin',
        is_active: 1,
        created_at: '2025-05-24T00:00:00Z'
      }
    ];

    return {
      success: true,
      data: mockUsers,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 20,
        total: mockUsers.length,
        totalPages: 1
      }
    };
  },

  async getUser(id) {
    return {
      success: true,
      data: {
        id: parseInt(id),
        email: 'admin@1car.vn',
        name: 'System Administrator',
        department: 'Ban Giám đốc',
        role: 'admin',
        is_active: 1,
        created_at: '2025-05-24T00:00:00Z'
      }
    };
  }
};

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticateToken, requirePermission('manage_users'), async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      department = '',
      role = '',
      active_only = true
    } = req.query;

    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
      department,
      role,
      active_only: active_only === 'true'
    };

    const result = await UserService.getUsers(params);

    res.status(200).json({
      success: true,
      message: 'Lấy danh sách người dùng thành công',
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile unless they're admin
    if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
      throw createError('Không có quyền truy cập', 403, 'ACCESS_DENIED');
    }

    const result = await UserService.getUser(id);

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin người dùng thành công',
      data: result.data,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/departments/list
 * Get departments list
 */
router.get('/departments/list', authenticateToken, async (req, res, next) => {
  try {
    const departments = [
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
      'Quản lý Garage'
    ];

    res.status(200).json({
      success: true,
      data: {
        departments
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/roles/list
 * Get roles list
 */
router.get('/roles/list', authenticateToken, async (req, res, next) => {
  try {
    const roles = [
      { code: 'admin', name: 'Quản trị viên' },
      { code: 'user', name: 'Người dùng' }
    ];

    res.status(200).json({
      success: true,
      data: {
        roles
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
