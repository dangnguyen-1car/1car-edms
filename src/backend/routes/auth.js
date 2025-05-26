/**
 * =================================================================
 * EDMS 1CAR - Authentication Routes (Fixed 401 Error)
 * Handle authentication endpoints with proper token validation
 * Based on C-PR-MG-003, C-FM-MG-004, and C-PL-MG-005
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
const { loggerUtils } = require('../utils/logger');

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      throw createError('Email và mật khẩu là bắt buộc', 400, 'MISSING_CREDENTIALS');
    }

    // Get client context
    const context = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    // Perform login
    const result = await AuthService.login(email, password, context);

    // Return success response
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
        tokens: result.tokens
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const accessToken = req.token;
    const user = req.user;
    
    const context = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    const result = await AuthService.logout(accessToken, user, context);

    res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Token refresh endpoint
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw createError('Refresh token là bắt buộc', 400, 'MISSING_REFRESH_TOKEN');
    }

    const context = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    const result = await AuthService.refreshToken(refreshToken, context);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        tokens: result.tokens
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/verify-token
 * Token verification endpoint
 */
router.post('/verify-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      throw createError('Token là bắt buộc', 400, 'MISSING_TOKEN');
    }

    // Use the auth middleware to verify token
    const { verifyAccessToken } = require('../config/jwt');
    const decoded = verifyAccessToken(token);
    
    // Get user data
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user || !user.is_active) {
      throw createError('Token không hợp lệ hoặc user không tồn tại', 401, 'INVALID_TOKEN');
    }

    res.status(200).json({
      success: true,
      message: 'Token hợp lệ',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role,
          is_active: user.is_active,
          last_login: user.last_login
        }
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile - FIXED
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const result = await AuthService.getProfile(userId);

    res.status(200).json({
      success: true,
      message: 'Lấy thông tin profile thành công',
      user: result.user, // Direct user object, not nested in data
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.id;
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;
    delete updateData.is_active;

    const result = await AuthService.updateProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: {
        user: result.user
      },
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, password } = req.body;
    
    if (!current_password || !password) {
      throw createError('Mật khẩu hiện tại và mật khẩu mới là bắt buộc', 400, 'MISSING_PASSWORDS');
    }

    const context = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    const result = await AuthService.changePassword(userId, current_password, password, context);

    res.status(200).json({
      success: true,
      message: result.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
