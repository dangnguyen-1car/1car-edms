// src/backend/services/favoritesService.js
const { dbManager } = require('../config/database')
const { createError } = require('../middleware/errorHandler')

class FavoritesService {
  /**
     * Thêm tài liệu vào danh sách yêu thích
     */
  async addToFavorites (userId, documentId) {
    try {
      // Kiểm tra tài liệu có tồn tại không
      const document = await dbManager.get(
        'SELECT id, title FROM documents WHERE id = ?',
        [documentId]
      )

      if (!document) {
        throw createError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND')
      }

      // Thêm vào favorites (IGNORE để tránh lỗi duplicate)
      await dbManager.run(
        'INSERT OR IGNORE INTO user_document_favorites (user_id, document_id) VALUES (?, ?)',
        [userId, documentId]
      )

      return {
        success: true,
        message: 'Đã thêm tài liệu vào danh sách yêu thích',
        data: { documentId, documentTitle: document.title }
      }
    } catch (error) {
      console.error('Error in addToFavorites:', error)
      if (error.statusCode) throw error
      throw createError('Không thể thêm tài liệu vào yêu thích', 500, 'ADD_FAVORITE_FAILED')
    }
  }

  /**
     * Xóa tài liệu khỏi danh sách yêu thích
     */
  async removeFromFavorites (userId, documentId) {
    try {
      const result = await dbManager.run(
        'DELETE FROM user_document_favorites WHERE user_id = ? AND document_id = ?',
        [userId, documentId]
      )

      if (result.changes === 0) {
        throw createError('Tài liệu không có trong danh sách yêu thích', 404, 'FAVORITE_NOT_FOUND')
      }

      return {
        success: true,
        message: 'Đã xóa tài liệu khỏi danh sách yêu thích',
        data: { documentId }
      }
    } catch (error) {
      console.error('Error in removeFromFavorites:', error)
      if (error.statusCode) throw error
      throw createError('Không thể xóa tài liệu khỏi yêu thích', 500, 'REMOVE_FAVORITE_FAILED')
    }
  }

  /**
     * Lấy danh sách tài liệu yêu thích của người dùng
     */
  async getUserFavorites (userId, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = options
      const offset = (page - 1) * limit

      const validSortColumns = ['created_at', 'title', 'document_code', 'updated_at']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
      const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC'

      // Lấy danh sách favorites với thông tin tài liệu
      const favorites = await dbManager.all(`
                SELECT
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
                    f.created_at as favorited_at
                FROM user_document_favorites f
                JOIN documents d ON f.document_id = d.id
                LEFT JOIN users u_author ON d.author_id = u_author.id
                WHERE f.user_id = ?
                ORDER BY ${sortColumn === 'created_at' ? 'f.created_at' : 'd.' + sortColumn} ${sortDirection}
                LIMIT ? OFFSET ?
            `, [userId, limit, offset])

      // Đếm tổng số favorites
      const countResult = await dbManager.get(
        'SELECT COUNT(*) as count FROM user_document_favorites WHERE user_id = ?',
        [userId]
      )
      const total = countResult.count

      return {
        success: true,
        data: favorites,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    } catch (error) {
      console.error('Error in getUserFavorites:', error)
      throw createError('Không thể lấy danh sách tài liệu yêu thích', 500, 'FETCH_FAVORITES_FAILED')
    }
  }

  /**
     * Kiểm tra tài liệu có trong danh sách yêu thích không
     */
  async isFavorite (userId, documentId) {
    try {
      const result = await dbManager.get(
        'SELECT id FROM user_document_favorites WHERE user_id = ? AND document_id = ?',
        [userId, documentId]
      )
      return !!result
    } catch (error) {
      console.error('Error in isFavorite:', error)
      return false
    }
  }

  /**
     * Lấy thống kê favorites
     */
  async getFavoritesStats (userId) {
    try {
      const stats = await dbManager.get(`
                SELECT
                    COUNT(*) as total_favorites,
                    COUNT(CASE WHEN d.status = 'published' THEN 1 END) as published_count,
                    COUNT(CASE WHEN d.status = 'draft' THEN 1 END) as draft_count,
                    COUNT(CASE WHEN f.created_at > datetime('now', '-7 days') THEN 1 END) as recent_favorites
                FROM user_document_favorites f
                JOIN documents d ON f.document_id = d.id
                WHERE f.user_id = ?
            `, [userId])

      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('Error in getFavoritesStats:', error)
      throw createError('Không thể lấy thống kê yêu thích', 500, 'FETCH_FAVORITES_STATS_FAILED')
    }
  }
}

module.exports = new FavoritesService()
