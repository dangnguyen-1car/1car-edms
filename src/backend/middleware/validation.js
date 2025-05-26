/**
 * =================================================================
 * EDMS 1CAR - Input Validation Middleware
 * Comprehensive input validation for 40 users system
 * Based on C-TD-MG-005 document standards and security requirements
 * =================================================================
 */

const { body, param, query, validationResult } = require('express-validator');
const { logError } = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value,
            location: error.location
        }));

        logError(new Error('Validation failed'), req, {
            operation: 'validation',
            errors: formattedErrors
        });

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors: formattedErrors
        });
    }
    
    next();
};

/**
 * Common validation rules
 */
const validationRules = {
    // Email validation
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email address is required'),

    // Password validation
    password: body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

    // Name validation
    name: body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ỹ\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    // Department validation (14 departments of 1CAR)
    department: body('department')
        .isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ])
        .withMessage('Invalid department'),

    // Role validation
    role: body('role')
        .isIn(['admin', 'user'])
        .withMessage('Role must be either admin or user'),

    // Document type validation (based on C-TD-MG-005)
    documentType: body('type')
        .isIn(['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC'])
        .withMessage('Document type must be one of: PL, PR, WI, FM, TD, TR, RC'),

    // Document title validation
    documentTitle: body('title')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Document title must be between 5 and 200 characters'),

    // Document description validation
    documentDescription: body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),

    // Version validation (X.Y format)
    version: body('version')
        .matches(/^\d+\.\d+$/)
        .withMessage('Version must be in X.Y format (e.g., 1.0, 2.1)'),

    // Status validation
    status: body('status')
        .isIn(['draft', 'review', 'published', 'archived'])
        .withMessage('Status must be one of: draft, review, published, archived'),

    // ID parameter validation
    id: param('id')
        .isInt({ min: 1 })
        .withMessage('ID must be a positive integer'),

    // Pagination validation
    page: query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    limit: query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),

    // Search query validation
    search: query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters'),

    // Date validation
    date: body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be in ISO 8601 format'),

    // File size validation (for upload info)
    fileSize: body('file_size')
        .optional()
        .isInt({ min: 1, max: 10485760 }) // 10MB max
        .withMessage('File size must be between 1 byte and 10MB'),

    // File type validation
    fileType: body('file_type')
        .optional()
        .isIn(['pdf', 'doc', 'docx'])
        .withMessage('File type must be pdf, doc, or docx'),

    // Change reason validation
    changeReason: body('change_reason')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('Change reason must be between 5 and 500 characters'),

    // Change summary validation
    changeSummary: body('change_summary')
        .trim()
        .isLength({ min: 5, max: 1000 })
        .withMessage('Change summary must be between 5 and 1000 characters'),

    // Comment validation
    comment: body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment cannot exceed 500 characters'),

    // Recipients validation (array of departments)
    recipients: body('recipients')
        .optional()
        .isArray()
        .withMessage('Recipients must be an array')
        .custom((value) => {
            const validDepartments = [
                'Ban Giám đốc',
                'Phòng Phát triển Nhượng quyền',
                'Phòng Đào tạo Tiêu chuẩn',
                'Phòng Marketing',
                'Phòng Kỹ thuật QC',
                'Phòng Tài chính',
                'Phòng Công nghệ Hệ thống',
                'Phòng Pháp lý',
                'Bộ phận Tiếp nhận CSKH',
                'Bộ phận Kỹ thuật Garage',
                'Bộ phận QC Garage',
                'Bộ phận Kho/Kế toán Garage',
                'Bộ phận Marketing Garage',
                'Quản lý Garage'
            ];
            
            for (const dept of value) {
                if (!validDepartments.includes(dept)) {
                    throw new Error(`Invalid department in recipients: ${dept}`);
                }
            }
            return true;
        }),

    // Review cycle validation (days)
    reviewCycle: body('review_cycle')
        .optional()
        .isInt({ min: 30, max: 1825 }) // 30 days to 5 years
        .withMessage('Review cycle must be between 30 and 1825 days'),

    // Retention period validation (days)
    retentionPeriod: body('retention_period')
        .optional()
        .isInt({ min: 365, max: 3650 }) // 1 year to 10 years
        .withMessage('Retention period must be between 365 and 3650 days'),

    // IP address validation
    ipAddress: body('ip_address')
        .optional()
        .isIP()
        .withMessage('Invalid IP address format')
};

/**
 * User validation schemas
 */
const userValidation = {
    // Create user validation
    create: [
        validationRules.email,
        validationRules.name,
        validationRules.department,
        validationRules.role,
        validationRules.password,
        handleValidationErrors
    ],

    // Update user validation
    update: [
        validationRules.id,
        body('name').optional().trim().isLength({ min: 2, max: 100 }),
        body('department').optional().isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ]),
        body('role').optional().isIn(['admin', 'user']),
        body('is_active').optional().isBoolean(),
        handleValidationErrors
    ],

    // Login validation
    login: [
        validationRules.email,
        body('password').notEmpty().withMessage('Password is required'),
        handleValidationErrors
    ],

    // Change password validation
    changePassword: [
        validationRules.id,
        body('current_password').notEmpty().withMessage('Current password is required'),
        validationRules.password,
        handleValidationErrors
    ],

    // Get user by ID validation
    getById: [
        validationRules.id,
        handleValidationErrors
    ],

    // List users validation
    list: [
        validationRules.page,
        validationRules.limit,
        query('department').optional().isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ]),
        query('role').optional().isIn(['admin', 'user']),
        query('is_active').optional().isBoolean(),
        validationRules.search,
        handleValidationErrors
    ]
};

/**
 * Document validation schemas
 */
const documentValidation = {
    // Create document validation
    create: [
        validationRules.documentTitle,
        validationRules.documentType,
        validationRules.department,
        validationRules.documentDescription,
        validationRules.recipients,
        validationRules.reviewCycle,
        validationRules.retentionPeriod,
        body('scope_of_application')
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage('Scope of application cannot exceed 500 characters'),
        handleValidationErrors
    ],

    // Update document validation
    update: [
        validationRules.id,
        body('title').optional().trim().isLength({ min: 5, max: 200 }),
        validationRules.documentDescription,
        validationRules.recipients,
        validationRules.reviewCycle,
        validationRules.retentionPeriod,
        body('scope_of_application')
            .optional()
            .trim()
            .isLength({ max: 500 }),
        body('reviewer_id').optional().isInt({ min: 1 }),
        body('approver_id').optional().isInt({ min: 1 }),
        handleValidationErrors
    ],

    // Update status validation
    updateStatus: [
        validationRules.id,
        validationRules.status,
        validationRules.comment,
        handleValidationErrors
    ],

    // Create version validation
    createVersion: [
        validationRules.id,
        validationRules.version,
        validationRules.changeReason,
        validationRules.changeSummary,
        handleValidationErrors
    ],

    // Get document validation
    getById: [
        validationRules.id,
        handleValidationErrors
    ],

    // Search documents validation
    search: [
        validationRules.page,
        validationRules.limit,
        validationRules.search,
        query('type').optional().isIn(['PL', 'PR', 'WI', 'FM', 'TD', 'TR', 'RC']),
        query('department').optional().isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ]),
        query('status').optional().isIn(['draft', 'review', 'published', 'archived']),
        query('author_id').optional().isInt({ min: 1 }),
        query('date_from').optional().isISO8601(),
        query('date_to').optional().isISO8601(),
        handleValidationErrors
    ],

    // File upload validation
    upload: [
        validationRules.id,
        body('filename')
            .trim()
            .isLength({ min: 1, max: 255 })
            .withMessage('Filename must be between 1 and 255 characters')
            .matches(/\.(pdf|doc|docx)$/i)
            .withMessage('File must be PDF, DOC, or DOCX format'),
        validationRules.fileSize,
        validationRules.fileType,
        body('mime_type')
            .isIn([
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ])
            .withMessage('Invalid MIME type'),
        handleValidationErrors
    ]
};

/**
 * Audit log validation schemas
 */
const auditValidation = {
    // List audit logs validation
    list: [
        validationRules.page,
        validationRules.limit,
        query('user_id').optional().isInt({ min: 1 }),
        query('action').optional().isAlpha(),
        query('resource_type').optional().isAlpha(),
        query('resource_id').optional().isInt({ min: 1 }),
        query('department').optional().isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ]),
        query('date_from').optional().isISO8601(),
        query('date_to').optional().isISO8601(),
        validationRules.ipAddress.optional(),
        validationRules.search,
        handleValidationErrors
    ],

    // Export audit logs validation
    export: [
        query('date_from').isISO8601().withMessage('Start date is required and must be in ISO 8601 format'),
        query('date_to').isISO8601().withMessage('End date is required and must be in ISO 8601 format'),
        query('user_id').optional().isInt({ min: 1 }),
        query('resource_type').optional().isAlpha(),
        query('department').optional().isIn([
            'Ban Giám đốc',
            'Phòng Phát triển Nhượng quyền',
            'Phòng Đào tạo Tiêu chuẩn',
            'Phòng Marketing',
            'Phòng Kỹ thuật QC',
            'Phòng Tài chính',
            'Phòng Công nghệ Hệ thống',
            'Phòng Pháp lý',
            'Bộ phận Tiếp nhận CSKH',
            'Bộ phận Kỹ thuật Garage',
            'Bộ phận QC Garage',
            'Bộ phận Kho/Kế toán Garage',
            'Bộ phận Marketing Garage',
            'Quản lý Garage'
        ]),
        handleValidationErrors
    ]
};

/**
 * Custom validation middleware for file uploads
 */
const validateFileUpload = (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
            code: 'FILE_REQUIRED'
        });
    }

    const file = req.file;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];

    // Check file size
    if (file.size > maxSize) {
        return res.status(400).json({
            success: false,
            message: 'File size exceeds 10MB limit',
            code: 'FILE_TOO_LARGE'
        });
    }

    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed',
            code: 'INVALID_FILE_TYPE'
        });
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid file extension. Only .pdf, .doc, and .docx files are allowed',
            code: 'INVALID_FILE_EXTENSION'
        });
    }

    next();
};

/**
 * Sanitize input middleware
 */
const sanitizeInput = (req, res, next) => {
    // Remove potential XSS patterns
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    };

    // Recursively sanitize object
    const sanitizeObject = (obj) => {
        if (obj === null || typeof obj !== 'object') {
            return typeof obj === 'string' ? sanitizeString(obj) : obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    };

    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next();
};

module.exports = {
    // Validation schemas
    userValidation,
    documentValidation,
    auditValidation,
    
    // Individual validation rules
    validationRules,
    
    // Custom validators
    validateFileUpload,
    sanitizeInput,
    handleValidationErrors
};
