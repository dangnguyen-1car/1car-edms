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
const AuditService = require('./auditService'); // Đảm bảo AuditService được import đúng cách
const PermissionService = require('./permissionService'); // Đảm bảo PermissionService được import đúng cách
// Import hằng số từ Model nếu có, ví dụ:
// const { VALID_RESOURCE_TYPES } = require('../models/AuditLog'); // Giả sử VALID_RESOURCE_TYPES ở đây

class SearchService {
  /**
   * Valid search result sort options
   */
  static get SORT_OPTIONS() {
    return {
      'relevance': 'bm25(documents_fts) DESC', // Sắp xếp theo độ liên quan FTS
      'date_desc': 'd.updated_at DESC',
      'date_asc': 'd.updated_at ASC',
      'title_asc': 'LOWER(d.title) ASC', // Sắp xếp không phân biệt chữ hoa/thường
      'title_desc': 'LOWER(d.title) DESC',
      'code_asc': 'd.document_code ASC',
      'code_desc': 'd.document_code DESC'
    };
  }

  /**
   * Sanitize FTS query to prevent injection and improve search
   * @private
   */
  static sanitizeFTSQuery(query) {
    // Loại bỏ các ký tự đặc biệt của FTS có thể gây lỗi hoặc injection
    // Chỉ giữ lại chữ và số, dấu cách, dấu gạch ngang, dấu chấm.
    // Chuyển thành chữ thường để tìm kiếm không phân biệt chữ hoa/thường.
    const cleanedQuery = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s\-\.]/gu, ' ') // Giữ lại ký tự Unicode (hỗ trợ tiếng Việt)
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedQuery) {
      return '';
    }

    // Tạo FTS query: tìm các thuật ngữ riêng lẻ (OR) hoặc tất cả (AND)
    // Ví dụ: "thuật ngữ một" "thuật ngữ hai" -> tìm các tài liệu chứa "thuật ngữ một" VÀ "thuật ngữ hai"
    // Thêm dấu * để tìm kiếm khớp một phần (prefix search)
    const terms = cleanedQuery.split(' ').filter(term => term.length > 0);
    if (terms.length === 0) {
      return '';
    }
    // Mặc định là tìm tất cả các từ (AND)
    return terms.map(term => `"${term}"*`).join(' AND ');
  }

  /**
   * Search documents with full-text search and advanced filtering
   */
  static async searchDocuments(query, filters = {}, page = 1, limit = 20, userId, requestContext = {}) {
    const startTime = Date.now();
    try {
      const {
        type,
        department,
        status,
        author_id,
        date_from,
        date_to,
        keywords, // Lọc theo keywords cụ thể từ metadata
        security_level,
        include_archived = false,
        sort = 'relevance' // Mặc định sắp xếp theo relevancy
      } = filters;

      // Validate sort option
      const sortClause = this.SORT_OPTIONS[sort] || this.SORT_OPTIONS['relevance'];

      let ftsMatchClause = '';
      let whereConditions = [];
      let params = [];

      // Build FTS query if search term provided
      const sanitizedQuery = query && query.trim() ? this.sanitizeFTSQuery(query.trim()) : '';
      if (sanitizedQuery) {
        ftsMatchClause = 'INNER JOIN documents_fts fts ON d.id = fts.rowid';
        whereConditions.push('fts.documents_fts MATCH ?');
        params.push(sanitizedQuery);
      }

      // Add filter conditions
      if (type) {
        whereConditions.push('d.type = ?');
        params.push(type);
      }
      if (department) {
        whereConditions.push('d.department = ?');
        params.push(department);
      }
      if (status) {
        whereConditions.push('d.status = ?');
        params.push(status);
      }
      if (author_id) {
        whereConditions.push('d.author_id = ?');
        params.push(author_id);
      }
      if (date_from) {
        whereConditions.push('d.updated_at >= ?'); // Hoặc d.created_at tùy yêu cầu
        params.push(date_from);
      }
      if (date_to) {
        whereConditions.push('d.updated_at <= ?'); // Hoặc d.created_at tùy yêu cầu
        params.push(date_to);
      }
      if (security_level) {
        whereConditions.push('d.security_level = ?');
        params.push(security_level);
      }
      if (keywords && keywords.trim()) {
        // Tìm kiếm keywords trong trường d.keywords
        const keywordTerms = keywords.trim().toLowerCase().split(',').map(k => k.trim()).filter(k => k);
        if (keywordTerms.length > 0) {
          const keywordConditions = keywordTerms.map(() => 'LOWER(d.keywords) LIKE ?').join(' OR ');
          whereConditions.push(`(${keywordConditions})`);
          keywordTerms.forEach(term => params.push(`%${term}%`));
        }
      }

      // Include archived documents filter
      if (!include_archived) {
        whereConditions.push("d.status NOT IN ('archived', 'disposed')");
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count for pagination (chỉ những tài liệu người dùng có quyền xem)
      // Đây là phần phức tạp, cần tối ưu.
      // Cách 1: Lấy tất cả ID khớp điều kiện, sau đó lọc quyền -> chậm nếu kết quả lớn
      // Cách 2: Tích hợp điều kiện quyền vào truy vấn (phức tạp hơn)

      // Tạm thời lấy tất cả ID rồi lọc quyền
      const allMatchingIdsQuery = `
        SELECT DISTINCT d.id
        FROM documents d
        ${ftsMatchClause}
        ${whereClause}
      `;
      const allMatchingDocsRaw = await dbManager.all(allMatchingIdsQuery, params);
      const allMatchingIds = allMatchingDocsRaw.map(doc => doc.id);

      let accessibleDocIds = [];
      if (userId && allMatchingIds.length > 0) {
        // Lọc quyền cho tất cả tài liệu tìm thấy
        for (const docId of allMatchingIds) {
          const permCheck = await PermissionService.checkPermission(
            userId, 'VIEW_DOCUMENT', 'document', docId, requestContext
          );
          if (permCheck.allowed) {
            accessibleDocIds.push(docId);
          }
        }
      } else if (!userId && allMatchingIds.length > 0) { // Trường hợp không có userId (ví dụ: guest tìm public docs)
         // Với guest, cần có logic riêng để chỉ lấy public documents
         // Hoặc PermissionService.checkPermission có thể xử lý userId = null cho guest
         // Tạm thời coi như guest không tìm được gì nếu không có logic đặc biệt
        accessibleDocIds = []; // Hoặc lọc các document public
      }


      const totalAccessible = accessibleDocIds.length;
      if (totalAccessible === 0) {
        return {
          success: true,
          data: {
            results: [],
            query,
            filters,
            pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 },
            searchMetadata: { searchTime: Date.now() - startTime, hasQuery: !!sanitizedQuery, sortBy: sort }
          }
        };
      }

      // Get paginated results from accessible documents
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const offset = (pageNum - 1) * limitNum;

      // Sắp xếp các ID đã lọc quyền trước khi lấy chi tiết
      // Điều này không hiệu quả nếu sort dựa trên relevance từ FTS
      // Nếu sort by relevance, cần lấy relevance score trước khi lọc quyền

      let results;
      if (sort === 'relevance' && sanitizedQuery) {
        // Nếu sort by relevance, phải lấy relevance score và sau đó lọc quyền
        const ftsResultsQuery = `
          SELECT DISTINCT
            d.*,
            u.name as author_name,
            u.email as author_email,
            u.department as author_department,
            bm25(fts.documents_fts) as relevance_score
          FROM documents d
          LEFT JOIN users u ON d.author_id = u.id
          ${ftsMatchClause}
          ${whereClause}
            AND d.id IN (${accessibleDocIds.map(() => '?').join(',')})
          ORDER BY relevance_score DESC
          LIMIT ? OFFSET ?
        `;
        results = await dbManager.all(ftsResultsQuery, [...params, ...accessibleDocIds, limitNum, offset]);
      } else {
        const paginatedResultsQuery = `
          SELECT DISTINCT
            d.*,
            u.name as author_name,
            u.email as author_email,
            u.department as author_department
            ${(sanitizedQuery && this.SORT_OPTIONS[sort]?.includes('bm25')) ? ', bm25(fts.documents_fts) as relevance_score' : ''}
          FROM documents d
          LEFT JOIN users u ON d.author_id = u.id
          ${sanitizedQuery ? ftsMatchClause : ''} 
          ${whereClause ? whereClause + ` AND d.id IN (${accessibleDocIds.map(() => '?').join(',')})` : `WHERE d.id IN (${accessibleDocIds.map(() => '?').join(',')})`}
          ORDER BY ${sortClause}
          LIMIT ? OFFSET ?
        `;
        // Nếu whereClause đã có, params đã bao gồm các filter params.
        // Nếu whereClause rỗng, params là mảng rỗng.
        // Cần thêm accessibleDocIds vào params một cách cẩn thận.
        let finalParamsForPagination;
        if(whereClause){
            finalParamsForPagination = [...params, ...accessibleDocIds, limitNum, offset];
        } else {
            finalParamsForPagination = [...accessibleDocIds, limitNum, offset];
        }
        results = await dbManager.all(paginatedResultsQuery, finalParamsForPagination);
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalAccessible / limitNum);

      // Log search activity
      await AuditService.log({
        action: 'DOCUMENT_SEARCHED',
        userId: userId, // userId có thể null cho guest
        resourceType: 'document', // Tham chiếu từ VALID_RESOURCE_TYPES của AuditService/AuditLog
        details: {
          query,
          filters,
          resultsCount: results.length,
          totalResultsAccessible: totalAccessible,
          page: pageNum,
          limit: limitNum
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId
      });

      return {
        success: true,
        data: {
          results,
          query,
          filters,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalAccessible,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
          },
          searchMetadata: {
            searchTime: Date.now() - startTime,
            hasQuery: !!sanitizedQuery,
            sortBy: sort
          }
        }
      };

    } catch (error) {
      logError(error, null, {
        operation: 'SearchService.searchDocuments',
        query,
        filters,
        userId
      });
      // Ném lỗi để middleware xử lý
      throw error;
    }
  }

  /**
   * Get search suggestions based on user input
   */
  static async getSearchSuggestions(query, userId, limit = 10, requestContext = {}) {
    try {
      if (!query || query.trim().length < 2) { // Yêu cầu ít nhất 2 ký tự để gợi ý
        return {
          success: true,
          data: { suggestions: [], query, count: 0 }
        };
      }

      const sanitizedQuery = query.trim().toLowerCase();
      const ftsSuggestQuery = `%${sanitizedQuery}%`; // Query cho LIKE, FTS cần xử lý riêng

      // Sử dụng FTS snippets hoặc prefix queries cho gợi ý từ FTS table
      // Ví dụ: tìm các thuật ngữ bắt đầu bằng sanitizedQuery
      const ftsPrefixQuery = sanitizedQuery.split(' ').filter(t=>t).map(t => `"${t}"*`).join(' AND ');

      let suggestions = [];
      if (ftsPrefixQuery) {
        const ftsSuggestions = await dbManager.all(`
            SELECT
                fts.title as suggestion,
                'title_fts' as type,
                d.id as document_id -- Để kiểm tra quyền sau này
            FROM documents_fts fts
            JOIN documents d ON fts.rowid = d.id
            WHERE fts.documents_fts MATCH ? AND d.status NOT IN ('archived', 'disposed')
            ORDER BY bm25(fts.documents_fts) DESC
            LIMIT ?
        `, [ftsPrefixQuery, limit * 2]); // Lấy nhiều hơn để lọc quyền

        for (const sug of ftsSuggestions) {
          if (userId) {
            const permCheck = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', sug.document_id, requestContext);
            if (permCheck.allowed) {
              suggestions.push({ suggestion: sug.suggestion, type: sug.type });
            }
          } else {
            // Logic cho guest (ví dụ chỉ public docs)
            const doc = await dbManager.get('SELECT security_level FROM documents WHERE id = ?', [sug.document_id]);
            if (doc && doc.security_level === 'public') {
                 suggestions.push({ suggestion: sug.suggestion, type: sug.type });
            }
          }
          if (suggestions.length >= limit) break;
        }
      }


      // Bổ sung gợi ý từ mã tài liệu (nếu cần và FTS không bao gồm tốt)
      if (suggestions.length < limit) {
        const codeSuggestionsRaw = await dbManager.all(`
            SELECT d.document_code as suggestion, 'code' as type, d.id as document_id
            FROM documents d
            WHERE LOWER(d.document_code) LIKE ? AND d.status NOT IN ('archived', 'disposed')
            ORDER BY d.document_code ASC
            LIMIT ?
        `, [ftsSuggestQuery, limit - suggestions.length]);

        for (const sug of codeSuggestionsRaw) {
            if (userId) {
                const permCheck = await PermissionService.checkPermission(userId, 'VIEW_DOCUMENT', 'document', sug.document_id, requestContext);
                if (permCheck.allowed) {
                    suggestions.push({ suggestion: sug.suggestion, type: sug.type });
                }
            } else {
                const doc = await dbManager.get('SELECT security_level FROM documents WHERE id = ?', [sug.document_id]);
                if (doc && doc.security_level === 'public') {
                    suggestions.push({ suggestion: sug.suggestion, type: sug.type });
                }
            }
            if (suggestions.length >= limit) break;
        }
      }

      // Loại bỏ trùng lặp và giới hạn số lượng cuối cùng
      const uniqueSuggestions = Array.from(new Set(suggestions.map(s => s.suggestion)))
                                   .map(value => suggestions.find(s => s.suggestion === value))
                                   .slice(0, limit);

      return {
        success: true,
        data: {
          suggestions: uniqueSuggestions,
          query,
          count: uniqueSuggestions.length
        }
      };

    } catch (error) {
      logError(error, null, {
        operation: 'SearchService.getSearchSuggestions',
        query,
        userId
      });
      throw error;
    }
  }

  /**
   * Reindex a specific document in FTS
   */
  static async reindexDocument(documentId, requestContext = {}) {
    try {
      const document = await dbManager.get(
        'SELECT id, document_code, title, description, keywords FROM documents WHERE id = ?',
        [documentId]
      );

      if (!document) {
        throw new Error('Document not found for reindexing.');
      }

      // Trigger FTS update (SQLite FTS triggers nên tự động làm việc này)
      // Tuy nhiên, có thể thực hiện INSERT OR REPLACE để chắc chắn
      await dbManager.run(`
        INSERT OR REPLACE INTO documents_fts (rowid, document_code, title, description, keywords)
        VALUES (?, ?, ?, ?, ?);
      `, [
        document.id,
        document.document_code || '',
        document.title || '',
        document.description || '',
        document.keywords || ''
      ]);

      appLogger.info('Document reindexed in FTS', { documentId, documentCode: document.document_code });

      await AuditService.log({
        action: 'SYSTEM_MAINTENANCE', // Hoặc một action cụ thể hơn
        userId: requestContext.userId || null, // Lấy userId từ context nếu có
        resourceType: 'system', // Hoặc 'document'
        resourceId: documentId,
        details: { operation: 'fts_reindex_document', documentId },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId
      });

      return { success: true, message: 'Document reindexed successfully in FTS.' };
    } catch (error) {
      logError(error, null, { operation: 'SearchService.reindexDocument', documentId });
      throw error;
    }
  }

  /**
   * Rebuild entire Full-Text Search index
   * Đây là một tác vụ nặng, nên được thực hiện trong thời gian bảo trì.
   */
  static async rebuildFullTextSearchIndex(requestContext = {}) {
    try {
      appLogger.info('Starting FTS index rebuild...');

      // Xóa dữ liệu cũ trong bảng FTS
      await dbManager.run('DELETE FROM documents_fts;');

      // Chèn lại dữ liệu từ bảng documents
      // Nên thực hiện theo batch nếu số lượng documents lớn
      const result = await dbManager.run(`
        INSERT INTO documents_fts (rowid, document_code, title, description, keywords)
        SELECT id, document_code, title, description, keywords FROM documents WHERE status NOT IN ('archived', 'disposed');
      `);

      // Tối ưu hóa bảng FTS (nếu cần, tùy thuộc vào phiên bản SQLite và FTS)
      // await dbManager.run("INSERT INTO documents_fts(documents_fts) VALUES('optimize');");

      appLogger.info(`FTS index rebuild completed. ${result.changes} documents indexed.`);

      await AuditService.log({
        action: 'SYSTEM_MAINTENANCE',
        userId: requestContext.userId || null,
        resourceType: 'system',
        details: { operation: 'fts_rebuild_all', documentsIndexed: result.changes },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId
      });

      return { success: true, message: `FTS index rebuilt successfully. ${result.changes} documents indexed.` };
    } catch (error) {
      logError(error, null, { operation: 'SearchService.rebuildFullTextSearchIndex' });
      throw error;
    }
  }

  /**
   * Get search filters metadata for UI (document types, departments, statuses, etc.)
   */
  static async getSearchFilters(userId, requestContext = {}) {
    try {
      const [docTypes, departments, statuses, securityLevels, dateRanges] = await Promise.all([
        dbManager.all("SELECT DISTINCT type FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY type"),
        dbManager.all("SELECT DISTINCT department FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY department"),
        dbManager.all("SELECT DISTINCT status FROM documents WHERE status NOT IN ('disposed') ORDER BY status"), // Bao gồm 'archived' để có thể lọc
        dbManager.all("SELECT DISTINCT security_level FROM documents WHERE status NOT IN ('archived', 'disposed') ORDER BY security_level"),
        dbManager.get("SELECT MIN(created_at) as min_date, MAX(updated_at) as max_date FROM documents  WHERE status NOT IN ('archived', 'disposed')")
      ]);

      // TODO: Lọc departments và security_levels dựa trên quyền của userId nếu cần

      return {
        success: true,
        data: {
          documentTypes: docTypes.map(dt => ({ value: dt.type, label: this.helperGetDocumentTypeLabel(dt.type) })),
          departments: departments.map(d => ({ value: d.department, label: d.department })),
          statuses: statuses.map(s => ({ value: s.status, label: this.helperGetStatusLabel(s.status) })),
          securityLevels: securityLevels.map(sl => ({ value: sl.security_level, label: this.helperGetSecurityLevelLabel(sl.security_level) })),
          dateRanges: {
            minDate: dateRanges.min_date,
            maxDate: dateRanges.max_date
          },
          sortOptions: Object.entries(this.SORT_OPTIONS).map(([value, _]) => ({
            value,
            label: this.helperGetSortLabel(value)
          }))
        }
      };
    } catch (error) {
      logError(error, null, { operation: 'SearchService.getSearchFilters', userId });
      throw error;
    }
  }

  // Helper methods for labels (có thể chuyển ra utils nếu dùng ở nhiều nơi)
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
      relevance: 'Liên quan nhất',
      date_desc: 'Ngày cập nhật (Mới nhất)',
      date_asc: 'Ngày cập nhật (Cũ nhất)',
      title_asc: 'Tiêu đề (A-Z)',
      title_desc: 'Tiêu đề (Z-A)',
      code_asc: 'Mã tài liệu (A-Z)',
      code_desc: 'Mã tài liệu (Z-A)',
    };
    return labels[sortKey] || sortKey;
  }
}

module.exports = SearchService;