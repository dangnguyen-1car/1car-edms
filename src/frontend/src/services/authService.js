// src/frontend/src/services/authService.js
/**
 * =================================================================
 * EDMS 1CAR - Authentication Service (Unified Error Handling)
 * API calls for authentication operations
 * =================================================================
 */
import api from './api';

export const authService = {
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.');
    }
  },

  async logout(accessToken) {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error(error.response?.data?.message || 'Lỗi đăng xuất. Vui lòng thử lại.');
    }
  },

  async refreshToken(refreshToken) {
    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new Error(error.response?.data?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
  },

  async verifyToken(token) {
    try {
      const response = await api.post('/auth/verify-token', { token });
      return response.data;
    } catch (error) {
      console.error('Verify token error:', error);
      // Return a structured error response instead of throwing
      return {
        success: false,
        message: error.response?.data?.message || 'Token verification failed'
      };
    }
  },

  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      // Return structured error response
      return {
        success: false,
        message: error.response?.data?.message || 'Không thể tải thông tin người dùng. Vui lòng thử lại.'
      };
    }
  },

  async updateProfile(updateData) {
    try {
      const response = await api.put('/auth/profile', updateData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật thông tin người dùng. Vui lòng thử lại.');
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw new Error(error.response?.data?.message || 'Không thể thay đổi mật khẩu. Vui lòng kiểm tra mật khẩu hiện tại và thử lại.');
    }
  }
};