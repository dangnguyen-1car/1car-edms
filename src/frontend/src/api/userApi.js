// src/frontend/src/api/userApi.js - User API Service
/**
 * =================================================================
 * EDMS 1CAR - User API Service
 * =================================================================
 */
import api from '../services/api';

export const userAPI = {
  // =================================================================
  // == USER MANAGEMENT APIs (CRUD and administrative actions)
  // =================================================================
  /**
   * Lấy danh sách users với filters và pagination.
   * @param {Object} params - Query parameters.
   * @param {number} [params.page=1] - Trang hiện tại.
   * @param {number} [params.limit=10] - Số lượng items per page.
   * @param {string} [params.search=''] - Từ khóa tìm kiếm (theo tên, email).
   * @param {string} [params.department] - Lọc theo phòng ban.
   * @param {string} [params.role] - Lọc theo vai trò.
   * @param {boolean} [params.isActive] - Lọc theo trạng thái active (true/false).
   * @returns {Promise<object>} Response chứa danh sách users.
   */
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  /**
   * Lấy thông tin chi tiết một user theo ID.
   * @param {number} id - ID của user.
   * @returns {Promise<object>} Response chứa thông tin user.
   */
  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  /**
   * Tạo user mới.
   * @param {Object} userData - Dữ liệu user.
   * @param {string} userData.email - Email của user.
   * @param {string} userData.name - Họ tên user.
   * @param {string} [userData.department] - Phòng ban của user.
   * @param {string} [userData.role] - Vai trò của user.
   * @param {string} [userData.position] - Chức vụ của user.
   * @param {string} [userData.phone] - Số điện thoại của user.
   * @returns {Promise<object>} Response kết quả tạo user.
   */
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  /**
   * Cập nhật thông tin user.
   * @param {number} id - ID của user.
   * @param {Object} userData - Dữ liệu cập nhật.
   * @returns {Promise<object>} Response kết quả cập nhật.
   */
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  /**
   * Xóa user (soft delete).
   * @param {number} id - ID của user.
   * @returns {Promise<object>} Response kết quả xóa.
   */
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  /**
   * Kích hoạt/vô hiệu hóa user.
   * @param {number} id - ID của user.
   * @param {boolean} isActive - Trạng thái active (true để kích hoạt, false để vô hiệu hóa).
   * @returns {Promise<object>} Response kết quả.
   */
  toggleUserStatus: async (id, isActive) => {
    const response = await api.patch(`/users/${id}/status`, { isActive });
    return response.data;
  },
  /**
   * Reset mật khẩu user.
   * @param {number} id - ID của user.
   * @returns {Promise<object>} Response kết quả reset password.
   */
  resetUserPassword: async (id) => {
    const response = await api.post(`/users/${id}/reset-password`);
    return response.data;
  },
  /**
   * Unlock user account (ví dụ: sau khi bị khóa do nhập sai mật khẩu nhiều lần).
   * @param {number} id - ID của user.
   * @returns {Promise<object>} Response kết quả unlock.
   */
  unlockUserAccount: async (id) => {
    const response = await api.post(`/users/${id}/unlock`);
    return response.data;
  },

  // =================================================================
  // == USER PROFILE APIs (Actions performed by current logged-in user on their own profile)
  // =================================================================
  /**
   * Lấy thông tin profile của user hiện tại.
   * @returns {Promise<object>} Response chứa thông tin profile.
   */
  getCurrentUserProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  /**
   * Cập nhật profile của user hiện tại.
   * @param {Object} profileData - Dữ liệu profile cần cập nhật.
   * @returns {Promise<object>} Response kết quả cập nhật.
   */
  updateCurrentUserProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },
  /**
   * Thay đổi mật khẩu của user hiện tại.
   * @param {Object} passwordData - Dữ liệu mật khẩu.
   * @param {string} passwordData.currentPassword - Mật khẩu hiện tại.
   * @param {string} passwordData.newPassword - Mật khẩu mới.
   * @param {string} passwordData.confirmPassword - Xác nhận mật khẩu mới.
   * @returns {Promise<object>} Response kết quả thay đổi mật khẩu.
   */
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },

  // =================================================================
  // == USER ACTIVITY & STATISTICS APIs
  // =================================================================
  /**
   * Lấy hoạt động (audit logs) của một user.
   * @param {number} id - ID của user.
   * @param {Object} [params={}] - Query parameters (ví dụ: page, limit, filter by action/resource_type).
   * @returns {Promise<object>} Response chứa hoạt động user.
   */
  getUserActivity: async (id, params = {}) => {
    const response = await api.get(`/users/${id}/activity`, { params });
    return response.data;
  },
  /**
   * Lấy thống kê liên quan đến một user (ví dụ: số tài liệu đã tạo, đã phê duyệt).
   * @param {number} id - ID của user.
   * @returns {Promise<object>} Response chứa thống kê user.
   */
  getUserStatistics: async (id) => {
    const response = await api.get(`/users/${id}/statistics`);
    return response.data;
  },
  /**
   * Lấy danh sách tài liệu mà user đã tạo hoặc liên quan.
   * @param {number} id - ID của user.
   * @param {Object} [params={}] - Query parameters (ví dụ: status, type, page, limit).
   * @returns {Promise<object>} Response chứa danh sách tài liệu.
   */
  getUserDocuments: async (id, params = {}) => {
    const response = await api.get(`/users/${id}/documents`, { params });
    return response.data;
  },

  // =================================================================
  // == UTILITY APIs (General lookup and search functionalities)
  // =================================================================
  /**
   * Kiểm tra xem một email đã tồn tại trong hệ thống hay chưa.
   * @param {string} email - Email cần kiểm tra.
   * @returns {Promise<object>} Response kết quả kiểm tra (ví dụ: { exists: true/false }).
   */
  checkEmailExists: async (email) => {
    const response = await api.post('/users/check-email', { email });
    return response.data;
  },
  /**
   * Lấy danh sách các vai trò (roles) có sẵn trong hệ thống.
   * @returns {Promise<object>} Response chứa danh sách roles.
   */
  getRoles: async () => {
    const response = await api.get('/users/roles');
    return response.data;
  },
  /**
   * Lấy danh sách các phòng ban (departments) có sẵn trong hệ thống.
   * @returns {Promise<object>} Response chứa danh sách departments.
   */
  getDepartments: async () => {
    // Lưu ý: Endpoint này có thể được trùng lặp với documentAPI.getDepartments.
    // Tùy thuộc vào thiết kế backend, có thể chỉ cần một endpoint chung.
    const response = await api.get('/users/departments');
    return response.data;
  },
  /**
   * Lấy danh sách users theo phòng ban cụ thể.
   * @param {string} department - Tên department (đã được encodeURIComponent).
   * @returns {Promise<object>} Response chứa danh sách users.
   */
  getUsersByDepartment: async (department) => {
    const response = await api.get(`/users/by-department/${encodeURIComponent(department)}`);
    return response.data;
  },
  /**
   * Tìm kiếm users theo query string (ví dụ: tên, email).
   * @param {string} query - Từ khóa tìm kiếm.
   * @param {number} [limit=10] - Giới hạn số lượng kết quả.
   * @returns {Promise<object>} Response chứa kết quả tìm kiếm.
   */
  searchUsers: async (query, limit = 10) => {
    const response = await api.get('/users/search', {
      params: { q: query, limit }
    });
    return response.data;
  }
};

export default userAPI;
