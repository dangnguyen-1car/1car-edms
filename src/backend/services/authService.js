// src/backend/services/authService.js
/**
 * =================================================================
 * EDMS 1CAR - Authentication Service (Fixed Import Error & Added updateProfile)
 * Business logic for authentication and authorization
 * Based on C-PL-MG-005 permission policy and C-FM-MG-004 role matrix
 * =================================================================
 */

const bcrypt = require('bcrypt');
const { generateTokenPair, verifyRefreshToken, revokeToken, revokeAllUserTokens } = require('../config/jwt');
const User = require('../models/User');
const { createAuditLog, logError } = require('../utils/logger'); // Thêm logError
const { createError } = require('../middleware/errorHandler');
const UserService = require('./userService'); // ++ IMPORT UserService

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
            // Log error nhưng không expose chi tiết nội bộ ra ngoài trực tiếp qua error message
            // logError đã được gọi trong các hàm con như User.findByEmail
            // Ở đây có thể log thêm context của AuthService nếu cần.
            // Ví dụ: logError(error, null, { operation: 'AuthService.login', email });
            // Quan trọng là throw error để error handler chung xử lý.
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
            logError(error, null, { operation: 'AuthService.logout', userId: user?.id });
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
                expiresIn: '24h', // Nên lấy từ config
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
            // logError(error, null, { operation: 'AuthService.refreshToken' });
            if (error.message && error.message.includes('Refresh token expired')) { // Sửa lỗi chính tả
                throw createError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401, 'REFRESH_TOKEN_EXPIRED');
            }
             if (error.message && error.message.includes('Token verification failed')) {
                throw createError('Token làm mới không hợp lệ.', 401, 'INVALID_REFRESH_TOKEN');
            }
            throw error; // Ném lỗi gốc nếu không phải lỗi cụ thể trên
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
            if (newPassword.length < 6) { // Nên lấy minLength từ config
                throw createError('Mật khẩu mới phải có ít nhất 6 ký tự', 400, 'PASSWORD_TOO_SHORT');
            }

            // Check if new password is different from current
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw createError('Mật khẩu mới phải khác mật khẩu hiện tại', 400, 'SAME_PASSWORD');
            }

            // Update password (User model nên có hàm updatePassword)
            await user.updatePassword(newPassword, userId); // Giả sử User model có hàm này

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
            logError(error, null, { operation: 'AuthService.changePassword', userId });
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
            // Trả về đối tượng user đã được làm sạch bởi toJSON() của User model
            return {
                success: true,
                user: user.toJSON() 
            };

        } catch (error) {
            logError(error, null, { operation: 'AuthService.getProfile', userId });
            throw error;
        }
    }

    // ++ PHƯƠNG THỨC MỚI ĐỂ CẬP NHẬT PROFILE
    /**
     * Update user profile information
     * @param {number} userId - ID of the user to update
     * @param {Object} updateData - Data to update (e.g., name, position, phone)
     * @param {Object} context - Request context for audit logging
     * @returns {Promise<Object>} - Result of the update operation
     */
    static async updateProfile(userId, updateData, context = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw createError('Người dùng không tồn tại để cập nhật profile.', 404, 'USER_NOT_FOUND');
            }

            // Chỉ cho phép cập nhật một số trường nhất định
            const allowedFieldsToUpdate = ['name', 'position', 'phone'];
            const dataToActuallyUpdate = {};
            let fieldsUpdatedCount = 0;

            for (const field of allowedFieldsToUpdate) {
                if (updateData.hasOwnProperty(field) && updateData[field] !== user[field]) {
                    dataToActuallyUpdate[field] = updateData[field];
                    fieldsUpdatedCount++;
                }
            }

            if (fieldsUpdatedCount === 0) {
                return {
                    success: true,
                    message: 'Không có thông tin nào cần cập nhật.',
                    user: user.toJSON() // Trả về user hiện tại nếu không có gì thay đổi
                };
            }
            
            // Gọi UserService.updateUser để thực hiện cập nhật
            // updatedBy là chính user đó (userId)
            const updatedUserInstance = await UserService.updateUser(userId, dataToActuallyUpdate, userId);

            if (!updatedUserInstance) {
                throw createError('Không thể cập nhật profile người dùng.', 500, 'PROFILE_UPDATE_FAILED');
            }

            // Log audit (UserService.updateUser đã log USER_UPDATED, nhưng bạn có thể muốn log PROFILE_UPDATED riêng)
            await createAuditLog({
                user_id: userId,
                action: 'USER_PROFILE_UPDATED', // Action cụ thể hơn
                resource_type: 'user',
                resource_id: userId,
                details: {
                    updatedFields: Object.keys(dataToActuallyUpdate),
                    oldValues: allowedFieldsToUpdate.reduce((acc, field) => {
                        if (dataToActuallyUpdate.hasOwnProperty(field)) acc[field] = user[field];
                        return acc;
                    }, {}),
                    newValues: dataToActuallyUpdate
                },
                ip_address: context.ip,
                user_agent: context.userAgent
            });

            return {
                success: true,
                message: 'Profile đã được cập nhật thành công.',
                user: updatedUserInstance.toJSON() // Trả về user đã cập nhật
            };

        } catch (error) {
            logError(error, null, { operation: 'AuthService.updateProfile', userId, updateData });
            throw error;
        }
    }
}

module.exports = AuthService;