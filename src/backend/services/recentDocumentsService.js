// src/backend/services/recentDocumentsService.js
const { dbManager } = require('../config/database')
const { createError } = require('../middleware/errorHandler')

class RecentDocumentsService {
  /**
     * Ghi lại việc xem tài liệu (fire-and-forget)
     */
  async recordDocumentView (userId, documentId) {
    try {
      // Sử dụng setImmediate để thực hiện bất đồng bộ
      setImmediate(async () => {
        try {
          await dbManager.run(
            'INSERT INTO user_recent_views (user_id, document_id, viewed_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [userId, documentId]
          )
          // Giữ chỉ 50 bản ghi gần nhất cho mỗi user để tránh database phình to
          await this.cleanupOldViews(userId)
        } catch (error) {
          console.error('Error recording document view:', error)
          // Không throw error vì đây là fire-and-forget operation
        }
      })
    } catch (error) {
      console.error('Error in recordDocumentView:', error)
      // Không throw error vì đây là fire-and-forget operation
    }
  }

  /**
     * Dọn dẹp các bản ghi cũ
     */
  async cleanupOldViews (userId) {
    try {
      await dbManager.run(`
                DELETE FROM user_recent_views
                WHERE user_id = ?
                AND id NOT IN (
                    SELECT id FROM user_recent_views
                    WHERE user_id = ?
                    ORDER BY viewed_at DESC
                    LIMIT 50
                )
            `, [userId, userId])
    } catch (error) {
      console.error('Error cleaning up old views:', error)
    }
  }

  /**
     * Lấy danh sách tài liệu đã xem gần đây
     */
  async getRecentDocuments (userId, limit = 5) {
    try {
      const recentDocs = await dbManager.all(`
                SELECT DISTINCT
                    d.id,
                    d.document_code,
                    d.title,
                    d.description,
                    d.type,
                    d.department,
                    d.status,
                    d.version,
                    d.priority,
                    d.security_level,
                    d.created_at,
                    d.updated_at,
                    u_author.name as author_name,
                    u_author.department as author_department,
                    rv.viewed_at as last_viewed_at
                FROM user_recent_views rv
                JOIN documents d ON rv.document_id = d.id
                LEFT JOIN users u_author ON d.author_id = u_author.id
                WHERE rv.user_id = ?
                ORDER BY rv.viewed_at DESC
                LIMIT ?
            `, [userId, limit])

      return {
        success: true,
        data: recentDocs
      }
    } catch (error) {
      console.error('Error in getRecentDocuments:', error)
      throw createError('Không thể lấy danh sách tài liệu gần đây', 500, 'FETCH_RECENT_DOCS_FAILED')
    }
  }

  /**
     * Lấy thống kê tài liệu gần đây
     */
  async getRecentDocumentsStats (userId) {
    try {
      const stats = await dbManager.get(`
                SELECT
                    COUNT(DISTINCT rv.document_id) as total_viewed,
                    COUNT(CASE WHEN rv.viewed_at > datetime('now', '-1 day') THEN 1 END) as viewed_today,
                    COUNT(CASE WHEN rv.viewed_at > datetime('now', '-7 days') THEN 1 END) as viewed_this_week,
                    MAX(rv.viewed_at) as last_activity
                FROM user_recent_views rv
                WHERE rv.user_id = ?
            `, [userId])

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('Error in getRecentDocumentsStats:', error)
      throw createError('Không thể lấy thống kê tài liệu gần đây', 500, 'FETCH_RECENT_STATS_FAILED')
    }
  }

  /**
     * Xóa lịch sử xem tài liệu
     */
  async clearRecentHistory (userId) {
    try {
      await dbManager.run(
        'DELETE FROM user_recent_views WHERE user_id = ?',
        [userId]
      )
      return {
        success: true,
        message: 'Đã xóa lịch sử xem tài liệu'
      }
    } catch (error) {
      console.error('Error in clearRecentHistory:', error)
      throw createError('Không thể xóa lịch sử xem tài liệu', 500, 'CLEAR_RECENT_HISTORY_FAILED')
    }
  }
}

module.exports = new RecentDocumentsService()
