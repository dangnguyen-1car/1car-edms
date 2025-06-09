// src/backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { auditMiddleware, setAuditDetails } = require('../middleware/auditMiddleware');
const { dbManager } = require('../config/database');

router.use(auditMiddleware);

/**
 * GET /api/notifications
 * Lấy thông báo cho người dùng
 */
router.get('/',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { limit = 10, unreadOnly = false } = req.query;
      
      // Mock data for now - có thể implement database table sau
      const mockNotifications = [
        {
          id: 1,
          title: 'Tài liệu mới cần phê duyệt',
          message: 'Có 3 tài liệu mới đang chờ phê duyệt từ phòng Kỹ thuật QC',
          type: 'document_approval',
          is_read: false,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          link: '/documents?status=review'
        },
        {
          id: 2,
          title: 'Tài liệu sắp hết hạn rà soát',
          message: 'Quy trình C-PR-KTG-001 sẽ hết hạn rà soát vào ngày 15/06/2025',
          type: 'document_review',
          is_read: false,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
          link: '/documents/123'
        },
        {
          id: 3,
          title: 'Cập nhật hệ thống',
          message: 'Hệ thống sẽ bảo trì từ 22:00 - 23:00 ngày 10/06/2025',
          type: 'system_alert',
          is_read: true,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          link: null
        }
      ];

      // Filter based on user role and department
      let filteredNotifications = mockNotifications;
      
      if (req.user.role === 'user') {
        // User chỉ nhận thông báo liên quan đến mình
        filteredNotifications = mockNotifications.filter(n => 
          n.type !== 'system_alert' || req.user.role === 'admin'
        );
      }

      if (unreadOnly === 'true') {
        filteredNotifications = filteredNotifications.filter(n => !n.is_read);
      }

      const limitedNotifications = filteredNotifications.slice(0, parseInt(limit));

      setAuditDetails(res, 'NOTIFICATIONS_VIEWED', 'system', null, {
        userRole: req.user.role,
        notificationsCount: limitedNotifications.length,
        unreadOnly: unreadOnly === 'true'
      });

      res.json({
        success: true,
        data: limitedNotifications,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/notifications/:id/read
 * Đánh dấu thông báo đã đọc
 */
router.patch('/:id/read',
  authenticateToken,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // Mock implementation - trong thực tế sẽ update database
      setAuditDetails(res, 'NOTIFICATION_MARKED_READ', 'notification', parseInt(id), {
        userId: req.user.id
      });

      res.json({
        success: true,
        message: 'Đã đánh dấu thông báo đã đọc',
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
