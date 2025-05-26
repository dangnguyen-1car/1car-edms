/**
 * =================================================================
 * EDMS 1CAR - Authentication Service (Fixed Import Error)
 * Business logic for authentication and authorization
 * Based on C-PL-MG-005 permission policy and C-FM-MG-004 role matrix
 * =================================================================
 */

const bcrypt = require('bcrypt');
const { generateTokenPair, verifyRefreshToken, revokeToken, revokeAllUserTokens } = require('../config/jwt');
const User = require('../models/User');
// FIXED: Import createAuditLog correctly from logger
const { createAuditLog } = require('../utils/logger');
const { createError } = require('../middleware/errorHandler');

class AuthService {
    /**
     * User login with email and password
     */
    static async login(email, password, context = {}) {
        try {
            // Find user by email
            const user = await User.findByEmail(email);
            
            if (!user) {
                // Log failed login attempt
                await createAuditLog({
                    user_id: null,
                    action: 'LOGIN_FAILED',
                    resource_type: 'auth',
                    details: {
                        email: email,
                        reason: 'User not found',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
            }

            // Check if user is active
            if (!user.is_active) {
                await createAuditLog({
                    user_id: user.id,
                    action: 'LOGIN_FAILED',
                    resource_type: 'auth',
                    details: {
                        email: email,
                        reason: 'User account inactive',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Tài khoản đã bị vô hiệu hóa', 401, 'ACCOUNT_INACTIVE');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                await createAuditLog({
                    user_id: user.id,
                    action: 'LOGIN_FAILED',
                    resource_type: 'auth',
                    details: {
                        email: email,
                        reason: 'Invalid password',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
            }

            // Generate token pair
            const tokens = generateTokenPair(user);

            // Update last login
            await user.updateLastLogin();

            // Log successful login
            await createAuditLog({
                user_id: user.id,
                action: 'LOGIN_SUCCESS',
                resource_type: 'auth',
                details: {
                    email: email,
                    department: user.department,
                    role: user.role,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Đăng nhập thành công',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    department: user.department,
                    role: user.role,
                    is_active: user.is_active,
                    last_login: user.last_login,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    created_by: user.created_by
                },
                tokens: tokens
            };

        } catch (error) {
            // Log error but don't expose internal details
            console.error('AuthService.login error:', error);
            throw error;
        }
    }

    /**
     * User logout
     */
    static async logout(accessToken, user, context = {}) {
        try {
            // Revoke the access token
            revokeToken(accessToken);

            // Log logout
            await createAuditLog({
                user_id: user.id,
                action: 'LOGOUT',
                resource_type: 'auth',
                details: {
                    email: user.email,
                    department: user.department,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Đăng xuất thành công'
            };

        } catch (error) {
            console.error('AuthService.logout error:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshToken(refreshToken, context = {}) {
        try {
            // Verify refresh token
            const decoded = verifyRefreshToken(refreshToken);

            // Get current user data
            const user = await User.findById(decoded.id);
            
            if (!user) {
                throw createError('Người dùng không tồn tại', 401, 'USER_NOT_FOUND');
            }

            if (!user.is_active) {
                throw createError('Tài khoản đã bị vô hiệu hóa', 401, 'ACCOUNT_INACTIVE');
            }

            // Generate new access token (keep same refresh token)
            const newTokens = {
                accessToken: generateTokenPair(user).accessToken,
                refreshToken: refreshToken,
                expiresIn: '24h',
                tokenType: 'Bearer'
            };

            // Log token refresh
            await createAuditLog({
                user_id: user.id,
                action: 'TOKEN_REFRESHED',
                resource_type: 'auth',
                details: {
                    email: user.email,
                    ip: context.ip
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Token đã được làm mới',
                tokens: newTokens
            };

        } catch (error) {
            console.error('AuthService.refreshToken error:', error);
            
            if (error.message === 'Refresh token expired') {
                throw createError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401, 'REFRESH_TOKEN_EXPIRED');
            }
            
            throw createError('Token không hợp lệ', 401, 'INVALID_REFRESH_TOKEN');
        }
    }

    /**
     * Change user password
     */
    static async changePassword(userId, currentPassword, newPassword, context = {}) {
        try {
            // Get user
            const user = await User.findById(userId);
            
            if (!user) {
                throw createError('Người dùng không tồn tại', 404, 'USER_NOT_FOUND');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            
            if (!isValidPassword) {
                await createAuditLog({
                    user_id: userId,
                    action: 'PASSWORD_CHANGE_FAILED',
                    resource_type: 'auth',
                    details: {
                        reason: 'Invalid current password',
                        ip: context.ip
                    },
                    ip_address: context.ip,
                    user_agent: context.userAgent
                });

                throw createError('Mật khẩu hiện tại không đúng', 400, 'INVALID_CURRENT_PASSWORD');
            }

            // Validate new password
            if (newPassword.length < 6) {
                throw createError('Mật khẩu mới phải có ít nhất 6 ký tự', 400, 'PASSWORD_TOO_SHORT');
            }

            // Check if new password is different from current
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw createError('Mật khẩu mới phải khác mật khẩu hiện tại', 400, 'SAME_PASSWORD');
            }

            // Update password
            await user.updatePassword(newPassword, userId);

            // Revoke all existing tokens for security
            revokeAllUserTokens(userId);

            // Log password change
            await createAuditLog({
                user_id: userId,
                action: 'PASSWORD_CHANGED',
                resource_type: 'auth',
                details: {
                    email: user.email,
                    ip: context.ip,
                    tokensRevoked: true
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Mật khẩu đã được thay đổi thành công. Vui lòng đăng nhập lại.'
            };

        } catch (error) {
            console.error('AuthService.changePassword error:', error);
            throw error;
        }
    }

    /**
     * Get current user profile
     */
    static async getProfile(userId) {
        try {
            const user = await User.findById(userId);
            
            if (!user) {
                throw createError('Người dùng không tồn tại', 404, 'USER_NOT_FOUND');
            }

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    department: user.department,
                    role: user.role,
                    is_active: user.is_active,
                    last_login: user.last_login,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            };

        } catch (error) {
            console.error('AuthService.getProfile error:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
