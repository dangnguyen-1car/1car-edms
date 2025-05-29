// src/backend/routes/users.js - Updated with AuditService integration
const express = require('express');
const router = express.Router();
const UserService = require('../services/userService');
const AuditService = require('../services/auditService');
const { authenticateToken, requirePermission } = require('../middleware/auth');

// GET /api/users - List all users with advanced filtering
router.get('/', authenticateToken, requirePermission('viewusers'), async (req, res, next) => {
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
    
    await AuditService.log({
      action: 'USERS_LISTED',
      userId: req.user.id,
      resourceType: 'user',
      details: { 
        filters, 
        resultCount: result.data.length,
        totalUsers: result.pagination.total
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      data: result.data.map(user => user.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticateToken, requirePermission('viewusers'), async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await AuditService.log({
      action: 'USER_VIEWED',
      userId: req.user.id,
      resourceType: 'user',
      resourceId: req.params.id,
      details: {
        viewedUserEmail: user.email,
        viewedUserDepartment: user.department
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create new user
router.post('/', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await UserService.createUser(userData, req.user.id);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const updateData = req.body;
    const user = await UserService.updateUser(req.params.id, updateData, req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/reset-password - Reset user password
router.post('/:id/reset-password', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const result = await UserService.resetPassword(req.params.id, newPassword, req.user.id);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/deactivate - Deactivate user
router.post('/:id/deactivate', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const result = await UserService.deactivateUser(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/activate - Activate user
router.post('/:id/activate', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const result = await UserService.activateUser(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/unlock - Unlock user account
router.post('/:id/unlock', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const result = await UserService.unlockAccount(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats', authenticateToken, requirePermission('viewusers'), async (req, res, next) => {
  try {
    const stats = await UserService.getUserStats(req.params.id);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/stats/departments - Get department statistics
router.get('/stats/departments', authenticateToken, requirePermission('viewusers'), async (req, res, next) => {
  try {
    const stats = await UserService.getDepartmentStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/stats/system - Get system statistics
router.get('/stats/system', authenticateToken, requirePermission('viewusers'), async (req, res, next) => {
  try {
    const stats = await UserService.getSystemStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/locked - Get locked users
router.get('/locked', authenticateToken, requirePermission('manageusers'), async (req, res, next) => {
  try {
    const lockedUsers = await UserService.getLockedUsers();
    
    await AuditService.log({
      action: 'LOCKED_USERS_VIEWED',
      userId: req.user.id,
      resourceType: 'user',
      details: { lockedUsersCount: lockedUsers.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });
    
    res.json({
      success: true,
      data: lockedUsers
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
