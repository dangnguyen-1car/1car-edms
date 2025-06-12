// src/frontend/src/services/userService.js
/**
 * =================================================================
 * EDMS 1CAR - User Service (Unified Error Handling)
 * API calls for user operations
 * =================================================================
 */
import api from './api';

export const userService = {
  // =================================================================
  // CRUD Operations for Users
  // =================================================================

  // Get all users
  async getUsers(params = {}) {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách người dùng. Vui lòng thử lại.');
    }
  },

  // Get user by ID
  async getUser(id) {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Không tìm thấy người dùng.');
      }
      throw new Error(error.response?.data?.message || 'Không thể tải thông tin người dùng. Vui lòng thử lại.');
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(error.response?.data?.message || 'Không thể tạo người dùng mới. Vui lòng thử lại.');
    }
  },

  // Update user
  async updateUser(id, userData) {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể cập nhật thông tin người dùng. Vui lòng thử lại.');
    }
  },

  // =================================================================
  // User Status & Management
  // =================================================================

  // Activate user
  async activateUser(id) {
    try {
      const response = await api.post(`/users/${id}/activate`);
      return response.data;
    } catch (error) {
      console.error(`Error activating user ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể kích hoạt người dùng. Vui lòng thử lại.');
    }
  },

  // Deactivate user
  async deactivateUser(id) {
    try {
      const response = await api.post(`/users/${id}/deactivate`);
      return response.data;
    } catch (error) {
      console.error(`Error deactivating user ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể vô hiệu hóa người dùng. Vui lòng thử lại.');
    }
  },

  // Reset user password
  async resetUserPassword(id, newPassword) {
    try {
      const response = await api.post(`/users/${id}/reset-password`, {
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error(`Error resetting password for user ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    }
  },

  // =================================================================
  // User Filtering & Statistics
  // =================================================================

  // Get users by department
  async getUsersByDepartment(department, activeOnly = true) {
    try {
      const response = await api.get(`/users/by-department/${department}`, {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching users by department ${department}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách người dùng theo phòng ban. Vui lòng thử lại.');
    }
  },

  // Get users by role
  async getUsersByRole(role, activeOnly = true) {
    try {
      const response = await api.get(`/users/by-role/${role}`, {
        params: { active_only: activeOnly }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching users by role ${role}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách người dùng theo vai trò. Vui lòng thử lại.');
    }
  },

  // Get user statistics
  async getUserStatistics() {
    try {
      const response = await api.get('/users/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê người dùng. Vui lòng thử lại.');
    }
  },

  // Get user activity
  async getUserActivity(id, limit = 50) {
    try {
      const response = await api.get(`/users/${id}/activity`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching user activity for ${id}:`, error);
      throw new Error(error.response?.data?.message || 'Không thể tải hoạt động của người dùng. Vui lòng thử lại.');
    }
  },

  // =================================================================
  // Helper / Metadata Endpoints
  // =================================================================

  // Get departments list
  async getDepartments() {
    try {
      const response = await api.get('/documents/departments'); // Thay đổi từ '/users/departments/list'
      return response.data; // API /documents/departments trả về { success: true, data: { departments: [...] } }
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách phòng ban. Vui lòng thử lại.');
    }
  },

  // Get roles list
  async getRoles() {
    try {
      const response = await api.get('/users/roles/list');
      return response.data;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách vai trò. Vui lòng thử lại.');
    }
  }
};