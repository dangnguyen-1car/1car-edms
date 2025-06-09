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
      console.error('Error fetching document stats:', error);
      throw new Error('Không thể tải thống kê tài liệu');
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
      console.error('Error fetching recent activities:', error);
      throw new Error('Không thể tải hoạt động gần đây');
    }
  }

  // Lấy tài liệu cần phê duyệt
  async getPendingApprovals(limit = 10) {
    try {
      const response = await api.get(`/documents/pending-approval?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      throw new Error('Không thể tải tài liệu cần phê duyệt');
    }
  }

  // Lấy thông báo (mock data cho hiện tại)
  async getNotifications(limit = 10, unreadOnly = false) {
    try {
      // Mock data - sẽ được thay thế bằng API thực tế
      const mockNotifications = [
        {
          id: 1,
          title: 'Tài liệu mới cần phê duyệt',
          message: 'Có 3 tài liệu mới đang chờ phê duyệt từ phòng Kỹ thuật QC',
          type: 'document_approval',
          is_read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          link: '/documents?status=review'
        },
        {
          id: 2,
          title: 'Tài liệu sắp hết hạn rà soát',
          message: 'Quy trình C-PR-KTG-001 sẽ hết hạn rà soát vào ngày 15/06/2025',
          type: 'document_review',
          is_read: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          link: '/documents/123'
        },
        {
          id: 3,
          title: 'Cập nhật hệ thống',
          message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 ngày 10/06/2025',
          type: 'system_alert',
          is_read: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          link: null
        }
      ];

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
      console.error('Error fetching notifications:', error);
      throw new Error('Không thể tải thông báo');
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
        departmentActivity: [
          { department: 'Phòng Kỹ thuật QC', userCount: 8, documentCount: 45 },
          { department: 'Phòng Marketing', userCount: 6, documentCount: 32 },
          { department: 'Ban Giám đốc', userCount: 4, documentCount: 28 }
        ],
        serverInfo: {
          nodeVersion: 'v18.17.0',
          uptime: 86400,
          memoryUsage: { used: 256, total: 512 },
          environment: 'development'
        }
      };

      return {
        success: true,
        data: mockStats
      };
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw new Error('Không thể tải thống kê hệ thống');
    }
  }

  // Đánh dấu thông báo đã đọc (mock implementation)
  async markNotificationAsRead(notificationId) {
    try {
      // Mock implementation - sẽ được thay thế bằng API thực tế
      return {
        success: true,
        message: 'Đã đánh dấu thông báo đã đọc'
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Không thể cập nhật thông báo');
    }
  }
}

export const dashboardService = new DashboardService();
