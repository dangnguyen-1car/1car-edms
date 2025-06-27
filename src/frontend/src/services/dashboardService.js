// src/frontend/src/services/dashboardService.js
import api from './api';

class DashboardService {
  // Lấy thống kê tài liệu theo trạng thái với hỗ trợ department filter
  async getDocumentStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.department) params.append('department', filters.department);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await api.get(`/documents/stats?${params}`);
      return response.data;
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê tài liệu. Vui lòng thử lại.');
    }
  }

  // Lấy hoạt động gần đây với hỗ trợ department filter cho Manager
  async getRecentActivities(limit = 10, userId = null, department = null) {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit);
      if (userId) params.append('userId', userId);
      if (department) params.append('department', department);

      const response = await api.get(`/audit-logs/recent?${params}`);
      return response.data;
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể tải hoạt động gần đây. Vui lòng thử lại.');
    }
  }

  // Lấy tài liệu cần phê duyệt
  async getPendingApprovals(limit = 10) {
    try {
      const response = await api.get(`/documents/pending-approval?limit=${limit}`);
      return response.data;
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể tải tài liệu cần phê duyệt. Vui lòng thử lại.');
    }
  }

  // Lấy thông báo (mock data cho hiện tại)
  async getNotifications(limit = 10, unreadOnly = false) {
    try {
      // Mock data - sẽ được thay thế bằng API thực tế
      const mockNotifications = [{
        id: 1,
        title: 'Tài liệu mới cần phê duyệt',
        message: 'Có 3 tài liệu mới đang chờ phê duyệt từ phòng Kỹ thuật QC',
        type: 'document_approval',
        is_read: false,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        link: '/documents?status=review'
      }, {
        id: 2,
        title: 'Tài liệu sắp hết hạn rà soát',
        message: 'Quy trình C-PR-KTG-001 sẽ hết hạn rà soát vào ngày 15/06/2025',
        type: 'document_review',
        is_read: false,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        link: '/documents/123'
      }, {
        id: 3,
        title: 'Cập nhật hệ thống',
        message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 ngày 10/06/2025',
        type: 'system_alert',
        is_read: true,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        link: null
      }];

      let filteredNotifications = mockNotifications;
      if (unreadOnly === 'true') {
        filteredNotifications = filteredNotifications.filter(n => !n.is_read);
      }
      const limitedNotifications = filteredNotifications.slice(0, parseInt(limit));
      return {
        success: true,
        data: limitedNotifications
      };
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể tải thông báo. Vui lòng thử lại.');
    }
  }

  // Lấy thống kê hệ thống (chỉ admin)
  async getSystemStats() {
    try {
      // Mock data - sẽ được thay thế bằng API thực tế
      const mockStats = {
        users: {
          totalUsers: 40,
          activeUsers: 38,
          recentActiveUsers: 25
        },
        documents: {
          totalDocuments: 156,
          documentsThisMonth: 12,
          activeAuthors: 15
        },
        system: {
          totalAuditLogs: 1250,
          logsLast24Hours: 45
        },
        departmentActivity: [{
          department: 'Phòng Kỹ thuật QC',
          userCount: 8,
          documentCount: 45
        }, {
          department: 'Phòng Marketing',
          userCount: 6,
          documentCount: 32
        }, {
          department: 'Ban Giám đốc',
          userCount: 4,
          documentCount: 28
        }],
        serverInfo: {
          nodeVersion: 'v18.17.0',
          uptime: 86400,
          memoryUsage: {
            used: 256,
            total: 512
          },
          environment: 'development'
        }
      };

      return {
        success: true,
        data: mockStats
      };
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê hệ thống. Vui lòng thử lại.');
    }
  }

  // Đánh dấu thông báo đã đọc (mock implementation)
  async markNotificationAsRead(notificationId) {
    try {
      // Mock implementation - sẽ được thay thế bằng API thực tế
      // const response = await api.put(`/notifications/${notificationId}/read`);
      return {
        success: true,
        message: 'Đã đánh dấu thông báo đã đọc'
      };
    // eslint-disable-next-line no-unreachable
    } catch (error) {      
      throw new Error(error.response?.data?.message || 'Không thể cập nhật thông báo. Vui lòng thử lại.');
    }
  }

  // =================================================================
  // === BẮT ĐẦU PHẦN ĐÃ SỬA LỖI ====================================
  // =================================================================

  /**
   * Lấy tất cả các số liệu thống kê nhanh cho các thẻ trên cùng của Dashboard.
   * Gọi nhiều API song song và xử lý dữ liệu để cải thiện hiệu suất.
   * @returns {Promise<object>} Một đối tượng chứa các số liệu thống kê.
   */
  async getQuickStats() {
    try {
      // Thực hiện các lệnh gọi API song song để lấy tất cả dữ liệu cần thiết
      const [
        myDocsResponse,
        pendingResponse,
        favoritesResponse, // Sửa lỗi cho favorites
        recentActivitiesResponse,
      ] = await Promise.all([
        // API này cần được kiểm tra ở backend
        api.get('/documents/stats?author=me'),
        // API này cần được kiểm tra ở backend
        api.get('/documents/pending-approval/stats'),
        // Sửa lỗi: Gọi API lấy danh sách và đếm ở frontend
        api.get('/me/favorites'),
        api.get('/audit-logs/recent?limit=100'),
      ]);
      
      // Xử lý logic đếm hoạt động trong ngày ở frontend
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayActivityCount = recentActivitiesResponse.data.data.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= today;
      }).length;

      // Trả về một đối tượng có cấu trúc rõ ràng
      return {
        myDocuments: myDocsResponse.data?.data?.total || 0,
        pendingApprovals: pendingResponse.data?.data?.total || 0,
        // Sửa lỗi: Lấy độ dài của mảng favorites trả về
        favorites: favoritesResponse.data?.data?.length || 0,
        todayActivity: todayActivityCount,
      };

    } catch (error) {      
      return {
        myDocuments: 0,
        pendingApprovals: 0,
        favorites: 0,
        todayActivity: 0,
      };
    }
  }
  
  // =================================================================
  // === KẾT THÚC PHẦN ĐÃ SỬA LỖI =====================================
  // =================================================================
}

export const dashboardService = new DashboardService();