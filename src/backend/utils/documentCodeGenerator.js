/**
 * =================================================================
 * EDMS 1CAR - Document Code Generator (FINAL & COMPLETE)
 * Logic đã được sửa để nhận trực tiếp mã phòng ban (deptCode),
 * loại bỏ việc tra cứu (lookup) để đảm bảo độ chính xác 100%.
 * =================================================================
 */

const { dbManager } = require('../config/database');

class DocumentCodeGenerator {
    /**
     * Standardized department mapping. This serves as the single source of truth.
     */
    static get DEPARTMENT_MAPPING() {
        return {
            'Ban Giám đốc': 'MG',
            'Phòng Phát triển Nhượng quyền': 'FR',
            'Phòng Đào tạo Tiêu chuẩn': 'TR',
            'Phòng Marketing': 'MK',
            'Phòng Kỹ thuật QC': 'QC',
            'Phòng Tài chính': 'FI',
            'Phòng Công nghệ Hệ thống': 'IT',
            'Phòng Pháp lý': 'LG',
            'Bộ phận Tiếp nhận CSKH': 'CS',
            'Bộ phận Kỹ thuật Garage': 'TE',
            'Bộ phận QC Garage': 'QG',
            'Bộ phận Kho/Kế toán Garage': 'WH',
            'Bộ phận Marketing Garage': 'AS',
            'Quản lý Garage': 'GM'
        };
    }

    /**
     * Valid document types based on C-TD-MG-005.
     */
    static get VALID_DOCUMENT_TYPES() {
        return ['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'];
    }

    /**
     * Get the next sequence number for a given document type and department code.
     * @param {string} type - Document type (e.g., 'PL', 'PR').
     * @param {string} deptCode - Department code (e.g., 'MG', 'QC').
     * @returns {Promise<number>} The next sequence number.
     */
    static async getNextSequence(type, deptCode) {
        try {
            const prefix = `C-${type}-${deptCode}`;
            const lastDoc = await dbManager.get(
                `SELECT document_code FROM documents WHERE document_code LIKE ? ORDER BY CAST(SUBSTR(document_code, LENGTH(?) + 2, 3) AS INTEGER) DESC LIMIT 1`,
                [`${prefix}-%`, prefix]
            );

            if (!lastDoc) {
                return 1; // It's the first document of this type/department.
            }

            const lastSequence = parseInt(lastDoc.document_code.split('-').pop(), 10);
            return isNaN(lastSequence) ? 1 : lastSequence + 1; // Fallback in case of parsing error.

        } catch (error) {
            console.error('Error getting next sequence:', error);
            throw new Error('Could not generate document sequence.');
        }
    }

    /**
     * Generates a standardized document code.
     * This function now accepts a pre-validated department code directly.
     * @param {string} type - Document type code.
     * @param {string} deptCode - Department code.
     * @returns {Promise<string>} The newly generated document code.
     */
    static async generateCode(type, deptCode) {
        if (!type || !deptCode) {
            throw new Error('Document type and Department Code are required for code generation.');
        }

        // Optional but recommended: Validate the received deptCode against the mapping values.
        const validDeptCodes = Object.values(this.DEPARTMENT_MAPPING);
        if (!validDeptCodes.includes(deptCode)) {
            throw new Error(`Invalid or unmapped department code provided: ${deptCode}`);
        }

        const sequence = await this.getNextSequence(type, deptCode);
        const documentCode = `C-${type}-${deptCode}-${sequence.toString().padStart(3, '0')}`;
        
        console.log(`Generated document code: ${documentCode} for type: ${type}, deptCode: ${deptCode}`);
        return documentCode;
    }

    /**
     * Checks if a document code already exists in the database.
     * @param {string} documentCode - The document code to check.
     * @returns {Promise<boolean>} True if the code exists, false otherwise.
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
}

module.exports = DocumentCodeGenerator;