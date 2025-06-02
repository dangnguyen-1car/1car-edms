// src/backend/services/searchService.js

/**
 * =================================================================
 * EDMS 1CAR - Search Service
 * Full-text search and advanced document filtering
 * Based on C-WI-AR-001 and search requirements
 * =================================================================
 */

const { dbManager } = require('../config/database');
const { logError, appLogger } = require('../utils/logger');
const AuditService = require('./auditService'); 
const PermissionService = require('./permissionService'); 

class SearchService {
  static get SORT_OPTIONS() {
    return {
      'relevance': 'bm25(fts) DESC', // Sử dụng alias 'fts'
      'date_desc': 'd.updated_at DESC',
      'date_asc': 'd.updated_at ASC',
      'title_asc': 'LOWER(d.title) ASC', 
      'title_desc': 'LOWER(d.title) DESC',
      'code_asc': 'd.document_code ASC',
      'code_desc': 'd.document_code DESC'
    };
  }

  static sanitizeFTSQuery(query) {
    const cleanedQuery = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s\-\.]/gu, ' ') 
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleanedQuery) return '';
    const terms = cleanedQuery.split(' ').filter(term => term.length > 0);
    if (terms.length === 0) return '';
    return terms.map(term => `"${term}"*`).join(' AND ');
  }

  static async searchDocuments(query, filters = {}, page = 1, limit = 20, userId, requestContext = {}) {
    const startTime = Date.now();
    try {
      const {
        type, department, status, author_id, date_from, date_to,
        keywords, security_level, include_archived = false, sort = 'relevance' 
      } = filters;

      let effectiveSort = sort;
      const sanitizedQuery = query && query.trim() ? this.sanitizeFTSQuery(query.trim()) : '';
      
      // Nếu không có query và sort là 'relevance', chuyển sang sort mặc định khác (ví dụ: theo ngày cập nhật)
      // để tránh lỗi khi bm25(fts) không có ý nghĩa nhiều nếu không có từ khóa tìm kiếm.
      if (!sanitizedQuery && effectiveSort === 'relevance') {
        effectiveSort = 'date_desc'; // Hoặc một giá trị mặc định khác phù hợp
        appLogger.info(`SearchService: No query term provided for relevance sort. Defaulting to sort by: ${effectiveSort}`);
      }
      
      const sortClause = this.SORT_OPTIONS[effectiveSort] || this.SORT_OPTIONS['date_desc'];
      
      let ftsJoinClause = ''; 
      let whereConditions = [];
      let params = [];
      const needsFTSJoin = sanitizedQuery || effectiveSort === 'relevance';


      if (needsFTSJoin) {
        ftsJoinClause = 'INNER JOIN documents_fts fts ON d.id = fts.rowid';
      }

      if (sanitizedQuery && needsFTSJoin) { 
        whereConditions.push('fts.documents_fts MATCH ?'); 
        params.push(sanitizedQuery);
      }

      // Add filter conditions
      if (type) { whereConditions.push('d.type = ?'); params.push(type); }
      if (department) { whereConditions.push('d.department = ?'); params.push(department); }
      if (status) { whereConditions.push('d.status = ?'); params.push(status); }
      if (author_id) { whereConditions.push('d.author_id = ?'); params.push(author_id); }
      if (date_from) { whereConditions.push('d.updated_at >= ?'); params.push(date_from); }
      if (date_to) { whereConditions.push('d.updated_at <= ?'); params.push(date_to); }
      if (security_level) { whereConditions.push('d.security_level = ?'); params.push(security_level); }
      if (keywords && keywords.trim()) {
        const keywordTerms = keywords.trim().toLowerCase().split(',').map(k => k.trim()).filter(k => k);
        if (keywordTerms.length > 0) {
          const keywordConditions = keywordTerms.map(() => 'LOWER(d.keywords) LIKE ?').join(' OR ');
          whereConditions.push(`(${keywordConditions})`);
          keywordTerms.forEach(term => params.push(`%${term}%`));
        }
      }
      if (!include_archived) {
        whereConditions.push("d.status NOT IN ('archived', 'disposed')");
      }
      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      const allMatchingIdsQuery = `SELECT DISTINCT d.id FROM documents d ${needsFTSJoin ? ftsJoinClause : ''} ${whereClause}`;
      const allMatchingDocsRaw = await dbManager.all(allMatchingIdsQuery, params);
      const allMatchingIds = allMatchingDocsRaw.map(doc => doc.id);

      let accessibleDocIds = [];
      if (userId && allMatchingIds.length > 0) {
        for (const docId of allMatchingIds) {
          const permCheck = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', docId, requestContext);
          if (permCheck.allowed) accessibleDocIds.push(docId);
        }
      } else if (!userId && allMatchingIds.length > 0) {
         for (const docId of allMatchingIds) {
            const doc = await dbManager.get('SELECT security_level FROM documents WHERE id = ?', [docId]);
            if (doc && doc.security_level === 'public') accessibleDocIds.push(docId);
          }
      }

      const totalAccessible = accessibleDocIds.length;
      if (totalAccessible === 0) {
        await AuditService.log({
            action: 'DOCUMENT_SEARCHED', userId, resourceType: 'document',
            details: { query, filters, resultsCount: 0, totalResultsAccessible: 0, page: parseInt(page), limit: parseInt(limit) },
            ipAddress: requestContext.ipAddress, userAgent: requestContext.userAgent, sessionId: requestContext.sessionId
        });
        return {
          success: true, data: { results: [], query, filters, pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 },
          searchMetadata: { searchTime: Date.now() - startTime, hasQuery: !!sanitizedQuery, sortBy: effectiveSort }
        }};
      }

      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;
      
      let selectExtraSQL = "";
      // Chỉ SELECT relevance_score nếu thực sự có FTS join và có query (vì bm25 không có query không hữu ích lắm)
      if (needsFTSJoin && sanitizedQuery) { 
        selectExtraSQL = ", bm25(fts) as relevance_score"; 
      }
      
      const paginatedResultsQuery = `
        SELECT DISTINCT
          d.*, u.name as author_name, u.email as author_email, u.department as author_department
          ${selectExtraSQL}
        FROM documents d
        LEFT JOIN users u ON d.author_id = u.id
        ${needsFTSJoin ? ftsJoinClause : ''}
        ${whereClause ? (whereClause + ` AND d.id IN (${accessibleDocIds.map(() => '?').join(',')})`) : `WHERE d.id IN (${accessibleDocIds.map(() => '?').join(',')})`}
        ORDER BY ${sortClause} 
        LIMIT ? OFFSET ?
      `;
      
      let finalParamsForPagination = whereClause 
        ? [...params, ...accessibleDocIds, limitNum, offset]
        : [...accessibleDocIds, limitNum, offset];
      
      const results = await dbManager.all(paginatedResultsQuery, finalParamsForPagination);
      const totalPages = Math.ceil(totalAccessible / limitNum);

      await AuditService.log({
        action: 'DOCUMENT_SEARCHED', userId, resourceType: 'document',
        details: { query, filters, resultsCount: results.length, totalResultsAccessible: totalAccessible, page: pageNum, limit: limitNum },
        ipAddress: requestContext.ipAddress, userAgent: requestContext.userAgent, sessionId: requestContext.sessionId
      });

      return {
        success: true, data: { results, query, filters, pagination: {
            page: pageNum, limit: limitNum, total: totalAccessible, totalPages,
            hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1
          }, searchMetadata: { searchTime: Date.now() - startTime, hasQuery: !!sanitizedQuery, sortBy: effectiveSort }
        }};
    } catch (error) {
      logError(error, null, { operation: 'SearchService.searchDocuments', query, filters, userId });
      throw error; 
    }
  }

  // ... (các hàm getSearchSuggestions, reindexDocument, rebuildFullTextSearchIndex, getSearchFilters và helperGet...Label giữ nguyên)
  static async getSearchSuggestions(query, userId, limit = 10, requestContext = {}) {
    try {
      if (!query || query.trim().length < 2) {
        return { success: true, data: { suggestions: [], query, count: 0 } };
      }
      const sanitizedQuery = query.trim().toLowerCase();
      const ftsSuggestQuery = `%${sanitizedQuery}%`;
      const ftsPrefixQuery = sanitizedQuery.split(' ').filter(t=>t).map(t => `"${t}"*`).join(' AND ');

      let suggestions = [];
      if (ftsPrefixQuery) {
        const ftsSuggestions = await dbManager.all(`
            SELECT fts.title as suggestion, 'title_fts' as type, d.id as document_id
            FROM documents_fts fts
            JOIN documents d ON fts.rowid = d.id
            WHERE fts.documents_fts MATCH ? AND d.status NOT IN ('archived', 'disposed')
            ORDER BY bm25(fts) DESC 
            LIMIT ?
        `, [ftsPrefixQuery, limit * 2]);

        for (const sug of ftsSuggestions) {
          let canView = false;
          if (userId) {
            const permCheck = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', sug.document_id, requestContext);
            canView = permCheck.allowed;
          } else {
            const doc = await dbManager.get('SELECT security_level FROM documents WHERE id = ?', [sug.document_id]);
            canView = doc && doc.security_level === 'public';
          }
          if(canView) suggestions.push({ suggestion: sug.suggestion, type: sug.type });
          if (suggestions.length >= limit) break;
        }
      }

      if (suggestions.length < limit) {
        const codeSuggestionsRaw = await dbManager.all(`
            SELECT d.document_code as suggestion, 'code' as type, d.id as document_id
            FROM documents d
            WHERE LOWER(d.document_code) LIKE ? AND d.status NOT IN ('archived', 'disposed')
            ORDER BY d.document_code ASC
            LIMIT ?
        `, [ftsSuggestQuery, limit - suggestions.length]);
        for (const sug of codeSuggestionsRaw) {
            let canView = false;
            if (userId) {
                const permCheck = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', sug.document_id, requestContext);
                canView = permCheck.allowed;
            } else {
                const doc = await dbManager.get('SELECT security_level FROM documents WHERE id = ?', [sug.document_id]);
                canView = doc && doc.security_level === 'public';
            }
            if(canView) suggestions.push({ suggestion: sug.suggestion, type: sug.type });
            if (suggestions.length >= limit) break;
        }
      }
      const uniqueSuggestions = Array.from(new Set(suggestions.map(s => s.suggestion)))
                                   .map(value => suggestions.find(s => s.suggestion === value))
                                   .slice(0, limit);
      return { success: true, data: { suggestions: uniqueSuggestions, query, count: uniqueSuggestions.length }};
    } catch (error) {
      logError(error, null, { operation: 'SearchService.getSearchSuggestions', query, userId });
      throw error;
    }
  }

  static async reindexDocument(documentId, requestContext = {}) {
    try {
      const document = await dbManager.get(
        'SELECT id, document_code, title, description, keywords FROM documents WHERE id = ?',
        [documentId]
      );
      if (!document) throw new Error('Document not found for reindexing.');
      await dbManager.run(`
        INSERT OR REPLACE INTO documents_fts (rowid, document_code, title, description, keywords)
        VALUES (?, ?, ?, ?, ?);
      `, [document.id, document.document_code || '', document.title || '', document.description || '', document.keywords || '']);
      appLogger.info('Document reindexed in FTS', { documentId, documentCode: document.document_code });
      await AuditService.log({
        action: 'SYSTEM_MAINTENANCE', userId: requestContext.userId || null, resourceType: 'system', resourceId: documentId,
        details: { operation: 'fts_reindex_document', documentId },
        ipAddress: requestContext.ipAddress, userAgent: requestContext.userAgent, sessionId: requestContext.sessionId
      });
      return { success: true, message: 'Document reindexed successfully in FTS.' };
    } catch (error) {
      logError(error, null, { operation: 'SearchService.reindexDocument', documentId });
      throw error;
    }
  }

  static async rebuildFullTextSearchIndex(requestContext = {}) {
    try {
      appLogger.info('Starting FTS index rebuild...');
      await dbManager.run('DELETE FROM documents_fts;');
      const result = await dbManager.run(`
        INSERT INTO documents_fts (rowid, document_code, title, description, keywords)
        SELECT id, document_code, title, description, keywords FROM documents WHERE status NOT IN ('archived', 'disposed');
      `);
      appLogger.info(`FTS index rebuild completed. ${result.changes} documents indexed.`);
      await AuditService.log({
        action: 'SYSTEM_MAINTENANCE', userId: requestContext.userId || null, resourceType: 'system',
        details: { operation: 'fts_rebuild_all', documentsIndexed: result.changes },
        ipAddress: requestContext.ipAddress, userAgent: requestContext.userAgent, sessionId: requestContext.sessionId
      });
      return { success: true, message: `FTS index rebuilt successfully. ${result.changes} documents indexed.` };
    } catch (error) {
      logError(error, null, { operation: 'SearchService.rebuildFullTextSearchIndex' });
      throw error;
    }
  }

  static async getSearchFilters(userId, requestContext = {}) {
    try {
      const [docTypes, departments, statuses, securityLevels, dateRanges] = await Promise.all([
        dbManager.all("SELECT DISTINCT type FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY type"),
        dbManager.all("SELECT DISTINCT department FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY department"),
        dbManager.all("SELECT DISTINCT status FROM documents WHERE status NOT IN ('disposed') ORDER BY status"),
        dbManager.all("SELECT DISTINCT security_level FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY security_level"),
        dbManager.get("SELECT MIN(created_at) as min_date, MAX(updated_at) as max_date FROM documents  WHERE status NOT IN ('archived', 'disposed')")
      ]);
      return {
        success: true, data: {
          documentTypes: docTypes.map(dt => ({ value: dt.type, label: this.helperGetDocumentTypeLabel(dt.type) })),
          departments: departments.map(d => ({ value: d.department, label: d.department })),
          statuses: statuses.map(s => ({ value: s.status, label: this.helperGetStatusLabel(s.status) })),
          securityLevels: securityLevels.map(sl => ({ value: sl.security_level, label: this.helperGetSecurityLevelLabel(sl.security_level) })),
          dateRanges: { minDate: dateRanges.min_date, maxDate: dateRanges.max_date },
          sortOptions: Object.entries(this.SORT_OPTIONS).map(([value, _]) => ({ value, label: this.helperGetSortLabel(value) }))
        }};
    } catch (error) {
      logError(error, null, { operation: 'SearchService.getSearchFilters', userId });
      throw error;
    }
  }

  static helperGetDocumentTypeLabel(type) {
    const labels = { PL: 'Chính sách', PR: 'Quy trình', WI: 'Hướng dẫn', FM: 'Biểu mẫu', TD: 'Tài liệu kỹ thuật', TR: 'Tài liệu đào tạo', RC: 'Hồ sơ' };
    return labels[type] || type;
  }
  static helperGetStatusLabel(status) {
    const labels = { draft: 'Bản nháp', review: 'Đang xem xét', published: 'Đã phê duyệt', archived: 'Đã lưu trữ', disposed: 'Đã hủy' };
    return labels[status] || status;
  }
  static helperGetSecurityLevelLabel(level) {
    const labels = { public: 'Công khai', internal: 'Nội bộ', confidential: 'Bảo mật', restricted: 'Hạn chế'};
    return labels[level] || level;
  }
  static helperGetSortLabel(sortKey) {
    const labels = {
      relevance: 'Liên quan nhất', date_desc: 'Ngày cập nhật (Mới nhất)', date_asc: 'Ngày cập nhật (Cũ nhất)',
      title_asc: 'Tiêu đề (A-Z)', title_desc: 'Tiêu đề (Z-A)', code_asc: 'Mã tài liệu (A-Z)', code_desc: 'Mã tài liệu (Z-A)',
    };
    return labels[sortKey] || sortKey;
  }
}

module.exports = SearchService;