// src/backend/routes/auth.js
/**
 * =================================================================
 * EDMS 1CAR - Authentication Routes (Fixed 401 Error & updateProfile call)
 * Handle authentication endpoints with proper token validation
 * Based on C-PR-MG-003, C-FM-MG-004, and C-PL-MG-005
 * =================================================================
 */

const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { authenticateToken } = require('../middleware/auth');
const { createError } = require('../middleware/errorHandler');
// const { loggerUtils } = require('../utils/logger'); // loggerUtils không được sử dụng trực tiếp ở đây

/**
 * POST /api/auth/login
 * User login endpoint
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw createError('Email và mật khẩu là bắt buộc', 400, 'MISSING_CREDENTIALS');
    }

    const context = {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    const result = await AuthService.login(email, password, context);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { // Giữ cấu trúc data để frontend không bị ảnh hưởng nếu đang dùng result.data.user
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
    const user = req.user; // user từ authenticateToken middleware
    
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

    const { verifyAccessToken } = require('../config/jwt');
    const decoded = verifyAccessToken(token);
    
    const User = require('../models/User'); // Import User model
    const user = await User.findById(decoded.id);
    
    if (!user || !user.is_active) {
      throw createError('Token không hợp lệ hoặc user không tồn tại', 401, 'INVALID_TOKEN');
    }

    res.status(200).json({
      success: true,
      message: 'Token hợp lệ',
      data: { // Giữ cấu trúc data để frontend không bị ảnh hưởng nếu đang dùng result.data.user
        user: user.toJSON() // Sử dụng toJSON để làm sạch thông tin user
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
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await AuthService.getProfile(userId); // AuthService.getProfile đã trả về { success: true, user: ... }

    res.status(200).json({
      success: result.success,
      message: 'Lấy thông tin profile thành công',
      user: result.user, // result.user đã là đối tượng user được làm sạch
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
    
    // Không cần xóa các trường nhạy cảm ở đây nữa nếu AuthService.updateProfile đã xử lý.
    // Tuy nhiên, để an toàn, có thể giữ lại việc xóa các trường không muốn client tự ý thay đổi.
    delete updateData.id;
    delete updateData.email;
    delete updateData.password_hash; // Đảm bảo không cho cập nhật password_hash
    delete updateData.password; // Càng không cho gửi password dạng plain text
    delete updateData.role;
    delete updateData.is_active;
    // Thêm các trường không được phép cập nhật qua profile ở đây nếu cần
    delete updateData.created_at;
    delete updateData.updated_at;
    delete updateData.last_login;
    delete updateData.created_by;
    delete updateData.failed_login_attempts;
    delete updateData.locked_until;


    const context = { // ++ THÊM CONTEXT
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId
    };

    // ++ GỌI AuthService.updateProfile VỚI CONTEXT
    const result = await AuthService.updateProfile(userId, updateData, context);

    res.status(200).json({
      success: true, // Nên lấy từ result.success
      message: result.message, // Nên lấy từ result.message
      user: result.user, // ++ SỬA ĐỂ TRẢ VỀ user TRỰC TIẾP
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
    const { current_password, password } = req.body; // Sửa tên biến từ currentPassword sang current_password cho khớp với frontend
    
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