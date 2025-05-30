// src/backend/routes/users.js
/**
EDMS 1CAR - User Routes (Refactored and Optimized with auditMiddleware)
Sử dụng auditMiddleware và các wrapper autoAudit/auditCRUD để tối đa hóa tính nhất quán.
*/

const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const { authenticateToken, requirePermission } = require('../middleware/auth');
// Import thêm autoAudit để sử dụng
const { auditMiddleware, auditCRUD, setAuditDetails, autoAudit } = require('../middleware/auditMiddleware');

// Áp dụng audit middleware cho tất cả routes
router.use(auditMiddleware);

/**
GET /api/users - List all users with advanced filtering
ĐÃ SỬA: Sử dụng autoAudit để tự động hóa việc ghi log.
*/
router.get('/',
  authenticateToken,
  requirePermission('viewusers'),
  // Sử dụng autoAudit để tự động ghi log thay vì setAuditDetails thủ công
  autoAudit(
    'USERS_LISTED',
    'user',
    (req, res, data) => null, // Không có resourceId cụ thể cho hành động liệt kê
    (req, res, data) => ({
      filters: req.query,
      resultCount: data.data.length,
      totalUsers: data.pagination.total
    })
  ),
  async (req, res, next) => {
    try {
      const filters = {
        department: req.query.department,
        role: req.query.role,
        is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await UserService.getAllUsers(filters);

      // Không cần gọi setAuditDetails ở đây nữa

      res.json({
        success: true,
        data: result.data.map(user => user.toJSON()),
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/users/:id - Get user by ID
*/
router.get('/:id',
  authenticateToken,
  requirePermission('viewusers'),
  auditCRUD.read('user'),
  async (req, res, next) => {
    try {
      const user = await UserService.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }

      res.json({
        success: true,
        data: user.toJSON(),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/users - Create new user
*/
router.post('/',
  authenticateToken,
  requirePermission('manageusers'),
  auditCRUD.create('user'),
  async (req, res, next) => {
    try {
      const userData = req.body;
      const user = await UserService.createUser(userData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user.toJSON(),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
PUT /api/users/:id - Update user
*/
router.put('/:id',
  authenticateToken,
  requirePermission('manageusers'),
  auditCRUD.update('user'),
  async (req, res, next) => {
    try {
      const updateData = req.body;
      const user = await UserService.updateUser(req.params.id, updateData, req.user.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId: req.requestId
        });
      }

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user.toJSON(),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/users/:id/reset-password - Reset user password
*/
router.post('/:id/reset-password',
  authenticateToken,
  requirePermission('manageusers'),
  async (req, res, next) => {
    try {
      const { newPassword } = req.body;
      const result = await UserService.resetPassword(req.params.id, newPassword, req.user.id);

      setAuditDetails(res, 'USER_PASSWORD_RESET', 'user', req.params.id, {
        resetBy: req.user.id,
        targetUserId: req.params.id
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/users/:id/deactivate - Deactivate user
*/
router.post('/:id/deactivate',
  authenticateToken,
  requirePermission('manageusers'),
  async (req, res, next) => {
    try {
      const result = await UserService.deactivateUser(req.params.id, req.user.id);

      setAuditDetails(res, 'USER_DEACTIVATED', 'user', req.params.id, {
        deactivatedBy: req.user.id,
        reason: req.body.reason || 'Manual deactivation'
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/users/:id/activate - Activate user
*/
router.post('/:id/activate',
  authenticateToken,
  requirePermission('manageusers'),
  async (req, res, next) => {
    try {
      const result = await UserService.activateUser(req.params.id, req.user.id);

      setAuditDetails(res, 'USER_ACTIVATED', 'user', req.params.id, {
        activatedBy: req.user.id,
        reason: req.body.reason || 'Manual activation'
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
POST /api/users/:id/unlock - Unlock user account
*/
router.post('/:id/unlock',
  authenticateToken,
  requirePermission('manageusers'),
  async (req, res, next) => {
    try {
      const result = await UserService.unlockAccount(req.params.id, req.user.id);

      setAuditDetails(res, 'USER_ACCOUNT_UNLOCKED', 'user', req.params.id, {
        unlockedBy: req.user.id,
        reason: req.body.reason || 'Manual unlock'
      });

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/users/:id/stats - Get user statistics
*/
router.get('/:id/stats',
  authenticateToken,
  requirePermission('viewusers'),
  async (req, res, next) => {
    try {
      const stats = await UserService.getUserStats(req.params.id);

      setAuditDetails(res, 'USER_STATS_VIEWED', 'user', req.params.id, {
        viewedBy: req.user.id,
        statsType: 'individual'
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/users/stats/departments - Get department statistics
*/
router.get('/stats/departments',
  authenticateToken,
  requirePermission('viewusers'),
  async (req, res, next) => {
    try {
      const stats = await UserService.getDepartmentStats();

      setAuditDetails(res, 'DEPARTMENT_STATS_VIEWED', 'system', null, {
        viewedBy: req.user.id,
        statsType: 'departments'
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/users/stats/system - Get system statistics
*/
router.get('/stats/system',
  authenticateToken,
  requirePermission('viewusers'),
  async (req, res, next) => {
    try {
      const stats = await UserService.getSystemStats();

      setAuditDetails(res, 'SYSTEM_STATS_VIEWED', 'system', null, {
        viewedBy: req.user.id,
        statsType: 'system'
      });

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
GET /api/users/locked - Get locked users
*/
router.get('/locked',
  authenticateToken,
  requirePermission('manageusers'),
  async (req, res, next) => {
    try {
      const lockedUsers = await UserService.getLockedUsers();

      setAuditDetails(res, 'LOCKED_USERS_VIEWED', 'user', null, {
        lockedUsersCount: lockedUsers.length,
        viewedBy: req.user.id
      });

      res.json({
        success: true,
        data: lockedUsers,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;