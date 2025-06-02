// src/frontend/src/services/userService.js
/**
 * =================================================================
 * EDMS 1CAR - User Service
 * API calls for user operations
 * =================================================================
 */

import api from './api';

export const userService = {
  // Get all users
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Get user by ID
  async getUser(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Create new user
  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  },

  // Update user
  async updateUser(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  // Activate user
  async activateUser(id) {
    const response = await api.post(`/users/${id}/activate`);
    return response.data;
  },

  // Deactivate user
  async deactivateUser(id) {
    const response = await api.post(`/users/${id}/deactivate`);
    return response.data;
  },

  // Get users by department
  async getUsersByDepartment(department, activeOnly = true) {
    const response = await api.get(`/users/by-department/${department}`, {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  // Get users by role
  async getUsersByRole(role, activeOnly = true) {
    const response = await api.get(`/users/by-role/${role}`, {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  // Get user statistics
  async getUserStatistics() {
    const response = await api.get('/users/statistics');
    return response.data;
  },

  // Get user activity
  async getUserActivity(id, limit = 50) {
    const response = await api.get(`/users/${id}/activity`, {
      params: { limit }
    });
    return response.data;
  },

  // Reset user password
  async resetUserPassword(id, newPassword) {
    const response = await api.post(`/users/${id}/reset-password`, {
      new_password: newPassword
    });
    return response.data;
  },

  // Get departments list
  // SỬA ĐỔI: Gọi đến endpoint của documents service
  async getDepartments() {
    const response = await api.get('/documents/departments'); // Thay đổi từ '/users/departments/list'
    return response.data; // API /documents/departments trả về { success: true, data: { departments: [...] } }
                          // Axios trả về response.data là object này.
  },

  // Get roles list
  async getRoles() {
    const response = await api.get('/users/roles/list');
    return response.data;
  }
};