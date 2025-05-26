/**
 * =================================================================
 * EDMS 1CAR - Authentication Service (Fixed 401 Error)
 * API calls for authentication operations
 * =================================================================
 */

import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async logout(accessToken) {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // FIXED: verifyToken method to handle response properly
  async verifyToken(token) {
    try {
      const response = await api.post('/auth/verify-token', { token });
      return response.data;
    } catch (error) {
      // Return a structured error response instead of throwing
      return {
        success: false,
        message: error.response?.data?.message || 'Token verification failed'
      };
    }
  },

  // FIXED: getProfile method to handle authentication properly
  async getProfile() {
    try {
      const response = await api.get('/auth/profile');
      return response.data;
    } catch (error) {
      // Return structured error response
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get profile'
      };
    }
  },

  async updateProfile(updateData) {
    const response = await api.put('/auth/profile', updateData);
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      password: newPassword
    });
    return response.data;
  }
};
