// src/backend/routes/favorites.js
const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const favoritesService = require('../services/favoritesService')
const recentDocumentsService = require('../services/recentDocumentsService')

/**
 * @route GET /api/me/favorites
 * @desc Lấy danh sách tài liệu yêu thích của người dùng hiện tại
 * @access Private
 */
router.get('/favorites', authenticateToken, async (req, res, next) => {
  try {
    const { page, limit, sortBy, sortOrder } = req.query
    const result = await favoritesService.getUserFavorites(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy,
      sortOrder
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/me/favorites/stats
 * @desc Lấy thống kê tài liệu yêu thích
 * @access Private
 */
router.get('/favorites/stats', authenticateToken, async (req, res, next) => {
  try {
    const result = await favoritesService.getFavoritesStats(req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/me/recent-documents
 * @desc Lấy danh sách tài liệu đã xem gần đây
 * @access Private
 */
router.get('/recent-documents', authenticateToken, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5
    const result = await recentDocumentsService.getRecentDocuments(req.user.id, limit)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route GET /api/me/recent-documents/stats
 * @desc Lấy thống kê tài liệu gần đây
 * @access Private
 */
router.get('/recent-documents/stats', authenticateToken, async (req, res, next) => {
  try {
    const result = await recentDocumentsService.getRecentDocumentsStats(req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @route DELETE /api/me/recent-documents
 * @desc Xóa lịch sử xem tài liệu
 * @access Private
 */
router.delete('/recent-documents', authenticateToken, async (req, res, next) => {
  try {
    const result = await recentDocumentsService.clearRecentHistory(req.user.id)
    res.json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router
