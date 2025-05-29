/**
 * =================================================================
 * EDMS 1CAR - Document Code Generator (Updated Complete)
 * Generates standardized document codes following C-TD-MG-005
 * Format: C-[TYPE]-[DEPT_CODE]-[SEQ]
 * Updated with complete department mapping and enhanced validation
 * =================================================================
 */

const { dbManager } = require('../config/database');

class DocumentCodeGenerator {
    // === Static Configuration ===
    /**
     * Complete department code mapping for all 14 departments of 1CAR
     * Following C-TD-MG-005 standard with conflict resolution
     */
    static get DEPARTMENT_MAPPING() {
        return {
            'Ban Giám đốc': 'BGD',
            'Phòng Phát triển Nhượng quyền': 'PTNQ',
            'Phòng Đào tạo Tiêu chuẩn': 'DTTC',
            'Phòng Marketing': 'MKT',
            'Phòng Kỹ thuật QC': 'KTQC',
            'Phòng Tài chính': 'TC',
            'Phòng Công nghệ Hệ thống': 'CNHT',
            'Phòng Pháp lý': 'PLV', // Changed from 'PL' to avoid conflict with Policy document type
            'Bộ phận Tiếp nhận CSKH': 'CSKH', // Unified from 'TNCSKH' to 'CSKH'
            'Bộ phận Kỹ thuật Garage': 'KTG',
            'Bộ phận QC Garage': 'QCG',
            'Bộ phận Kho/Kế toán Garage': 'KKTG', // Unified from 'KKT' to 'KKTG'
            'Bộ phận Marketing Garage': 'MKTG',
            'Quản lý Garage': 'QLG'
        };
    }

    /**
     * Valid document types based on C-TD-MG-005
     */
    static get VALID_DOCUMENT_TYPES() {
        return ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
    }

    /**
     * Document type descriptions for validation
     */
    static get DOCUMENT_TYPE_DESCRIPTIONS() {
        return {
            'PL': 'Chính sách (Policy)',
            'PR': 'Quy trình (Procedure)',
            'WI': 'Hướng dẫn (Work Instruction)',
            'FM': 'Biểu mẫu (Form)',
            'TD': 'Tài liệu kỹ thuật (Technical Document)',
            'TR': 'Tài liệu đào tạo (Training Document)',
            'RC': 'Hồ sơ (Record)'
        };
    }

    // === Core Methods ===
    /**
     * Generate standardized document code
     * @param {string} type - Document type (PL, PR, WI, FM, TD, TR, RC)
     * @param {string} department - Department name
     * @returns {Promise} Generated document code
     */
    static async generateCode(type, department) {
        try {
            // Validate inputs
            if (!type || !department) {
                throw new Error('Document type and department are required');
            }

            if (!this.VALID_DOCUMENT_TYPES.includes(type)) {
                throw new Error(`Invalid document type: ${type}. Valid types: ${this.VALID_DOCUMENT_TYPES.join(', ')}`);
            }

            // Get department code with strict validation
            const deptCode = this.getDepartmentCode(department);

            // Get next sequence number
            const sequence = await this.getNextSequence(type, deptCode);

            // Format: C-[TYPE]-[DEPT_CODE]-[SEQ]
            const documentCode = `C-${type}-${deptCode}-${sequence.toString().padStart(3, '0')}`;

            console.log(`Generated document code: ${documentCode} for type: ${type}, department: ${department}`);
            return documentCode;

        } catch (error) {
            console.error('Error generating document code:', error);
            throw error;
        }
    }

    /**
     * Regenerate document code with enhanced validation
     * @param {number} documentId - Document ID
     * @param {boolean} force - Force regeneration even if code exists
     * @returns {Promise} New document code
     */
    static async regenerateCode(documentId, force = false) {
        try {
            // Get document details
            const document = await dbManager.get(
                'SELECT type, department, document_code FROM documents WHERE id = ?',
                [documentId]
            );

            if (!document) {
                throw new Error(`Document with ID ${documentId} not found`);
            }

            // Check if current code is valid
            if (!force && this.validateFormat(document.document_code)) {
                console.log(`Document ${documentId} already has valid code: ${document.document_code}`);
                return document.document_code;
            }

            // Validate department before regenerating
            if (!this.DEPARTMENT_MAPPING[document.department]) {
                throw new Error(`Cannot regenerate code for unmapped department: ${document.department}`);
            }

            // Generate new code
            const newCode = await this.generateCode(document.type, document.department);

            // Verify new code doesn't already exist
            const codeExists = await this.codeExists(newCode);
            if (codeExists) {
                throw new Error(`Generated code ${newCode} already exists. This should not happen.`);
            }

            // Update document
            await dbManager.run(
                'UPDATE documents SET document_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newCode, documentId]
            );

            console.log(`Document ${documentId} code updated: ${document.document_code} -> ${newCode}`);
            return newCode;

        } catch (error) {
            console.error('Error regenerating document code:', error);
            throw error;
        }
    }

    // === Helper Methods ===
    /**
     * Get department code from department name with strict validation
     * @param {string} department - Full department name
     * @returns {string} Department code
     * @throws {Error} If department is not found in mapping
     */
    static getDepartmentCode(department) {
        if (!department || typeof department !== 'string') {
            throw new Error('Department must be a non-empty string');
        }

        const deptCode = this.DEPARTMENT_MAPPING[department];
        if (!deptCode) {
            // Strict validation - no fallback, throw error for unmapped departments
            throw new Error(`Invalid or unmapped department: ${department}. Valid departments: ${Object.keys(this.DEPARTMENT_MAPPING).join(', ')}`);
        }

        return deptCode;
    }

    /**
     * Get full department name from department code
     * @param {string} deptCode - Department code
     * @returns {string|null} Full department name or null if not found
     */
    static getDepartmentName(deptCode) {
        const entries = Object.entries(this.DEPARTMENT_MAPPING);
        const found = entries.find(([name, code]) => code === deptCode);
        return found ? found[0] : null;
    }

    /**
     * Get next sequence number for document type and department with enhanced validation
     * @param {string} type - Document type
     * @param {string} deptCode - Department code
     * @returns {Promise} Next sequence number
     */
    static async getNextSequence(type, deptCode) {
        try {
            const prefix = `C-${type}-${deptCode}`;
            
            // Find the highest sequence number for this prefix with enhanced parsing
            const lastDoc = await dbManager.get(`
                SELECT document_code 
                FROM documents 
                WHERE document_code LIKE ? 
                ORDER BY 
                    CAST(SUBSTR(document_code, LENGTH(?) + 2, 3) AS INTEGER) DESC 
                LIMIT 1
            `, [`${prefix}-%`, prefix]);

            if (!lastDoc) {
                return 1; // First document of this type/department
            }

            // Enhanced parsing with validation
            const documentCode = lastDoc.document_code;
            
            // Validate document code format before parsing
            if (!this.validateFormat(documentCode)) {
                console.warn(`Invalid document code format found in database: ${documentCode}. Starting sequence from 1.`);
                return 1;
            }

            // Parse sequence number with enhanced error handling
            const parts = documentCode.split('-');
            if (parts.length !== 4) {
                console.warn(`Unexpected document code structure: ${documentCode}. Expected 4 parts, got ${parts.length}.`);
                return 1;
            }

            // Validate prefix matches expected format
            const actualPrefix = `${parts[0]}-${parts[1]}-${parts[2]}`;
            if (actualPrefix !== prefix) {
                console.warn(`Document code prefix mismatch. Expected: ${prefix}, Found: ${actualPrefix}`);
                return 1;
            }

            // Parse and validate sequence number
            const sequenceStr = parts[3];
            const lastSequence = parseInt(sequenceStr, 10);
            
            if (isNaN(lastSequence) || lastSequence <= 0 || lastSequence >= 999) {
                console.warn(`Invalid sequence number in document code: ${documentCode}. Sequence: ${sequenceStr}`);
                return 1;
            }

            // Check for sequence overflow
            if (lastSequence >= 999) {
                throw new Error(`Sequence number overflow for prefix ${prefix}. Maximum sequence (999) reached.`);
            }

            return lastSequence + 1;

        } catch (error) {
            console.error('Error getting next sequence:', error);
            throw error;
        }
    }

    // === Validation Methods ===
    /**
     * Validate document code format with enhanced checks
     * @param {string} documentCode - Document code to validate
     * @returns {boolean} True if valid format
     */
    static validateFormat(documentCode) {
        if (!documentCode || typeof documentCode !== 'string') {
            return false;
        }

        // Pattern: C-[TYPE]-[DEPT]-[SEQ] where:
        // - C is literal
        // - TYPE is 2-3 uppercase letters
        // - DEPT is 2-6 uppercase letters
        // - SEQ is exactly 3 digits
        const pattern = /^C-[A-Z]{2,3}-[A-Z]{2,6}-\d{3}$/;
        
        if (!pattern.test(documentCode)) {
            return false;
        }

        // Additional validation: check if type and department are valid
        const parts = documentCode.split('-');
        const type = parts[1];
        const deptCode = parts[2];

        // Validate document type
        if (!this.VALID_DOCUMENT_TYPES.includes(type)) {
            return false;
        }

        // Validate department code exists in mapping
        const validDeptCodes = Object.values(this.DEPARTMENT_MAPPING);
        if (!validDeptCodes.includes(deptCode)) {
            return false;
        }

        return true;
    }

    /**
     * Parse document code into components with enhanced validation
     * @param {string} documentCode - Document code to parse
     * @returns {Object|null} Parsed components or null if invalid
     */
    static parseCode(documentCode) {
        if (!this.validateFormat(documentCode)) {
            return null;
        }

        const parts = documentCode.split('-');
        const departmentName = this.getDepartmentName(parts[2]);
        const typeDescription = this.DOCUMENT_TYPE_DESCRIPTIONS[parts[1]];

        return {
            prefix: parts[0], // 'C'
            type: parts[1],   // Document type
            typeDescription,  // Document type description
            departmentCode: parts[2], // Department code
            departmentName,   // Full department name
            sequence: parseInt(parts[3], 10), // Sequence number
            isValid: true,
            fullCode: documentCode
        };
    }

    /**
     * Validate document code against business rules
     * @param {string} documentCode - Document code to validate
     * @param {string} type - Expected document type
     * @param {string} department - Expected department
     * @returns {Object} Validation result
     */
    static validateBusinessRules(documentCode, type, department) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Basic format validation
        if (!this.validateFormat(documentCode)) {
            result.isValid = false;
            result.errors.push('Invalid document code format. Expected: C-[TYPE]-[DEPT]-[SEQ]');
            return result;
        }

        const parsed = this.parseCode(documentCode);
        
        // Type validation
        if (parsed.type !== type) {
            result.isValid = false;
            result.errors.push(`Document type mismatch. Expected: ${type}, Found: ${parsed.type}`);
        }

        // Department validation
        let expectedDeptCode;
        try {
            expectedDeptCode = this.getDepartmentCode(department);
        } catch (error) {
            result.isValid = false;
            result.errors.push(`Invalid department: ${department}`);
            return result;
        }

        if (parsed.departmentCode !== expectedDeptCode) {
            result.isValid = false;
            result.errors.push(`Department code mismatch. Expected: ${expectedDeptCode}, Found: ${parsed.departmentCode}`);
        }

        // Sequence validation
        if (parsed.sequence <= 0 || parsed.sequence >= 999) {
            result.warnings.push('Sequence number is outside normal range (1-999)');
        }

        return result;
    }

    /**
     * Validate all department mappings are consistent
     * @returns {Object} Validation report
     */
    static validateDepartmentMappings() {
        const report = {
            isValid: true,
            duplicateCodes: [],
            invalidCodes: [],
            suggestions: []
        };

        const usedCodes = new Set();
        const codePattern = /^[A-Z]{2,6}$/;

        for (const [department, code] of Object.entries(this.DEPARTMENT_MAPPING)) {
            // Check for duplicate codes
            if (usedCodes.has(code)) {
                report.isValid = false;
                report.duplicateCodes.push(code);
            }
            usedCodes.add(code);

            // Check code format
            if (!codePattern.test(code)) {
                report.isValid = false;
                report.invalidCodes.push({ department, code });
            }

            // Check for conflict with document types
            if (this.VALID_DOCUMENT_TYPES.includes(code)) {
                report.isValid = false;
                report.suggestions.push(`Department code '${code}' conflicts with document type. Consider using different code for '${department}'.`);
            }
        }

        return report;
    }

    // === Utility Methods ===
    /**
     * Check if document code already exists
     * @param {string} documentCode - Document code to check
     * @returns {Promise} True if exists
     */
    static async codeExists(documentCode) {
        try {
            const existing = await dbManager.get(
                'SELECT id FROM documents WHERE document_code = ?',
                [documentCode]
            );
            return !!existing;
        } catch (error) {
            console.error('Error checking document code existence:', error);
            throw error;
        }
    }

    /**
     * Get suggested document codes for a type/department combination
     * @param {string} type - Document type
     * @param {string} department - Department name
     * @param {number} count - Number of suggestions to return
     * @returns {Promise} Array of suggested codes
     */
    static async getSuggestedCodes(type, department, count = 5) {
        try {
            // Validate inputs
            if (!this.VALID_DOCUMENT_TYPES.includes(type)) {
                throw new Error(`Invalid document type: ${type}`);
            }

            const deptCode = this.getDepartmentCode(department); // Will throw if invalid
            const nextSequence = await this.getNextSequence(type, deptCode);
            
            const suggestions = [];
            for (let i = 0; i < count; i++) {
                const sequence = nextSequence + i;
                if (sequence >= 999) {
                    break; // Stop if we exceed maximum sequence
                }
                
                const code = `C-${type}-${deptCode}-${sequence.toString().padStart(3, '0')}`;
                suggestions.push({
                    code,
                    sequence,
                    description: `${this.DOCUMENT_TYPE_DESCRIPTIONS[type]} - ${department} - #${sequence}`,
                    isAvailable: true
                });
            }

            return suggestions;

        } catch (error) {
            console.error('Error getting suggested codes:', error);
            throw error;
        }
    }

    // === Statistics Methods ===
    /**
     * Get statistics about document codes by type and department
     * @returns {Promise} Statistics array
     */
    static async getCodeStatistics() {
        try {
            const stats = await dbManager.all(`
                SELECT 
                    type,
                    department,
                    COUNT(*) as total_documents,
                    MAX(CAST(SUBSTR(document_code, -3) AS INTEGER)) as highest_sequence,
                    MIN(created_at) as first_created,
                    MAX(created_at) as last_created
                FROM documents 
                WHERE document_code LIKE 'C-%'
                GROUP BY type, department
                ORDER BY type, department
            `);

            return stats.map(stat => {
                const departmentCode = this.DEPARTMENT_MAPPING[stat.department] || 'UNKN';
                const typeDescription = this.DOCUMENT_TYPE_DESCRIPTIONS[stat.type] || 'Unknown';
                const nextSequence = (stat.highest_sequence || 0) + 1;
                
                return {
                    ...stat,
                    department_code: departmentCode,
                    type_description: typeDescription,
                    next_sequence: nextSequence
                };
            });

        } catch (error) {
            console.error('Error getting code statistics:', error);
            throw error;
        }
    }

    /**
     * Get department statistics
     * @returns {Promise} Department statistics
     */
    static async getDepartmentStatistics() {
        try {
            const stats = await dbManager.all(`
                SELECT 
                    department,
                    COUNT(*) as total_documents,
                    COUNT(DISTINCT type) as document_types,
                    GROUP_CONCAT(DISTINCT type) as types_used,
                    MIN(created_at) as first_document_date,
                    MAX(created_at) as last_document_date
                FROM documents 
                WHERE document_code LIKE 'C-%'
                GROUP BY department
                ORDER BY total_documents DESC
            `);

            return stats.map(stat => {
                const departmentCode = this.DEPARTMENT_MAPPING[stat.department] || 'UNKN';
                const typesUsed = stat.types_used ? stat.types_used.split(',') : [];
                const unusedTypes = this.VALID_DOCUMENT_TYPES.filter(type => !typesUsed.includes(type));

                return {
                    ...stat,
                    department_code: departmentCode,
                    types_used: typesUsed,
                    unused_types: unusedTypes,
                    is_mapped_department: !!this.DEPARTMENT_MAPPING[stat.department]
                };
            });

        } catch (error) {
            console.error('Error getting department statistics:', error);
            throw error;
        }
    }
}

module.exports = DocumentCodeGenerator;