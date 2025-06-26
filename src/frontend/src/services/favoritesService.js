// src/frontend/src/services/favoritesService.js
import api from './api';

export const favoritesService = {
    /**
     * Lấy danh sách tài liệu yêu thích
     */
    async getFavorites(params = {}) {
        const response = await api.get('/me/favorites', { params });
        return response.data;
    },

    /**
     * Thêm tài liệu vào yêu thích
     */
    async addToFavorites(documentId) {
        const response = await api.post(`/documents/${documentId}/favorite`);
        return response.data;
    },

    /**
     * Xóa tài liệu khỏi yêu thích
     */
    async removeFromFavorites(documentId) {
        const response = await api.delete(`/documents/${documentId}/favorite`);
        return response.data;
    },

    /**
     * Kiểm tra tài liệu có trong yêu thích không
     */
    async checkIsFavorite(documentId) {
        const response = await api.get(`/documents/${documentId}/favorite`);
        return response.data;
    },

    /**
     * Lấy thống kê yêu thích
     */
    async getFavoritesStats() {
        const response = await api.get('/me/favorites/stats');
        return response.data;
    },

    /**
     * Lấy tài liệu gần đây
     */
    async getRecentDocuments(limit = 5) {
        const response = await api.get('/me/recent-documents', {
            params: { limit }
        });
        return response.data;
    },

    /**
     * Lấy thống kê tài liệu gần đây
     */
    async getRecentDocumentsStats() {
        const response = await api.get('/me/recent-documents/stats');
        return response.data;
    },

    /**
     * Xóa lịch sử xem tài liệu
     */
    async clearRecentHistory() {
        const response = await api.delete('/me/recent-documents');
        return response.data;
    }
};