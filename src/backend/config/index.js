/**
 * =================================================================
 * EDMS 1CAR - Main Configuration Aggregator
 * Central configuration management for 40 users system
 * Based on requirements from all 13 reference documents
 * =================================================================
 */

const path = require('path');
const fs = require('fs');
const winston = require('winston');

// Load environment variables
require('dotenv').config();

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = NODE_ENV === 'development';
const isTest = NODE_ENV === 'test';

// Logger configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

/**
 * Server Configuration
 */
const server = {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    env: NODE_ENV,
    isProduction,
    isDevelopment,
    isTest,
    
    // CORS configuration
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: process.env.CORS_CREDENTIALS === 'true',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    
    // Request limits for 40 users
    limits: {
        requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000,
        maxRequestSize: '50mb', // For document uploads
        maxParameterLimit: 1000,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
    }
};

/**
 * Database Configuration
 */
const database = {
    path: process.env.DATABASE_PATH || './database/edms.db',
    backupPath: process.env.DATABASE_BACKUP_PATH || './database/backups/',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE) || 10,
    timeout: parseInt(process.env.DATABASE_TIMEOUT_MS) || 30000,
    
    // SQLite specific settings
    pragma: {
        foreignKeys: true,
        journalMode: 'WAL',
        synchronous: 'NORMAL',
        cacheSize: 10000,
        tempStore: 'MEMORY',
        mmapSize: 268435456 // 256MB
    },
    
    // Backup settings
    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
        compression: process.env.BACKUP_COMPRESSION === 'true'
    }
};

/**
 * JWT Authentication Configuration
 */
const jwt = {
    secret: process.env.JWT_SECRET || 'edms-1car-default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'edms-1car',
    audience: 'edms-1car-users',
    
    // Validation
    validateSecret() {
        if (isProduction && this.secret === 'edms-1car-default-secret-change-in-production') {
            throw new Error('JWT_SECRET must be changed in production environment');
        }
    }
};

/**
 * Security Configuration
 */
const security = {
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    },
    
    session: {
        secret: process.env.SESSION_SECRET || 'edms-1car-session-secret',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: isProduction,
        httpOnly: true,
        sameSite: 'strict'
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
    },
    
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                fontSrc: ["'self'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }
};

/**
 * File Upload Configuration
 */
const upload = {
    path: process.env.UPLOAD_PATH || './uploads/documents/',
    tempPath: process.env.TEMP_UPLOAD_PATH || './uploads/temp/',
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx').split(','),
    
    // File processing
    virusScan: process.env.FILE_VIRUS_SCAN_ENABLED === 'true',
    thumbnail: process.env.FILE_THUMBNAIL_ENABLED === 'true',
    compression: process.env.FILE_COMPRESSION_ENABLED === 'true',
    
    // Storage cleanup
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    tempFileMaxAge: 2 * 60 * 60 * 1000 // 2 hours
};

/**
 * Logging Configuration
 */
const logging = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    file: {
        enabled: process.env.LOG_FILE_ENABLED === 'true',
        path: process.env.LOG_FILE_PATH || './logs/app.log',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
    },
    
    // Audit logging
    audit: {
        enabled: process.env.AUDIT_LOG_ENABLED === 'true',
        level: process.env.AUDIT_LOG_LEVEL || 'info',
        retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90
    }
};

/**
 * Email Configuration
 */
const email = {
    enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    from: process.env.EMAIL_FROM || 'EDMS 1CAR <noreply@1car.com>',
    
    // Email templates
    templates: {
        documentApproval: 'document-approval',
        documentExpiry: 'document-expiry',
        userRegistration: 'user-registration',
        passwordReset: 'password-reset'
    }
};

/**
 * EDMS Specific Configuration
 * Based on C-TD-MG-005, C-PR-VM-001, C-PR-AR-001
 */
const edms = {
    // Document types from C-TD-MG-005
    documentTypes: (process.env.DOCUMENT_TYPES || 'PL,PR,WI,FM,TD,TR,RC').split(','),
    
    // 1CAR departments
    departments: (process.env.DEPARTMENTS || 
        'Ban Giám đốc,Phòng Phát triển Nhượng quyền,Phòng Đào tạo Tiêu chuẩn,Phòng Marketing,Phòng Kỹ thuật QC,Phòng Tài chính,Phòng Công nghệ Hệ thống,Phòng Pháp lý,Bộ phận Tiếp nhận CSKH,Bộ phận Kỹ thuật Garage,Bộ phận QC Garage,Bộ phận Kho/Kế toán Garage,Bộ phận Marketing Garage,Quản lý Garage'
    ).split(','),
    
    // Security levels (simplified from R,C,I,P)
    securityLevels: (process.env.SECURITY_LEVELS || 'admin,user').split(','),
    
    // Workflow states
    workflowStates: (process.env.WORKFLOW_STATES || 'draft,review,published,archived').split(','),
    
    // Version management from C-PR-VM-001
    versioning: {
        format: process.env.VERSION_FORMAT || 'X.Y',
        autoIncrement: true,
        maxVersions: 10 // Keep last 10 versions
    },
    
    // Document lifecycle from C-PR-AR-001
    lifecycle: {
        defaultStatus: process.env.DEFAULT_DOCUMENT_STATUS || 'draft',
        retentionPeriod: parseInt(process.env.RETENTION_PERIOD_DAYS) || 2555, // 7 years
        reviewCycle: 365, // Annual review
        autoArchive: true
    },
    
    // Search configuration
    search: {
        enabled: process.env.SEARCH_ENABLED === 'true',
        indexPath: process.env.SEARCH_INDEX_PATH || './database/search_index/',
        fullTextSearch: process.env.FULL_TEXT_SEARCH_ENABLED === 'true',
        maxResults: 100
    }
};

/**
 * API Configuration
 */
const api = {
    prefix: process.env.API_PREFIX || '/api',
    version: process.env.API_VERSION || 'v1',
    
    // Documentation
    docs: {
        enabled: process.env.API_DOCS_ENABLED === 'true',
        path: process.env.API_DOCS_PATH || '/api-docs',
        title: 'EDMS 1CAR API',
        version: '1.0.0',
        description: 'Electronic Document Management System API for 1CAR'
    },
    
    // Response formatting
    response: {
        includeTimestamp: true,
        includeRequestId: true,
        defaultPageSize: 20,
        maxPageSize: 100
    }
};

/**
 * Frontend Configuration
 */
const frontend = {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
    staticPath: process.env.STATIC_FILES_PATH || './src/frontend/dist',
    
    // UI settings
    ui: {
        theme: 'default',
        language: 'vi',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm:ss'
    }
};

/**
 * Monitoring Configuration
 */
const monitoring = {
    healthCheck: {
        enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 30000,
        timeout: 5000
    },
    
    metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        endpoint: '/metrics',
        collectDefaultMetrics: true
    }
};

/**
 * Development Configuration
 */
const development = {
    debug: process.env.DEBUG_MODE === 'true',
    mockData: process.env.MOCK_DATA_ENABLED === 'true',
    seedDatabase: process.env.SEED_DATABASE === 'true',
    hotReload: true,
    
    // Testing
    test: {
        database: './database/test.db',
        timeout: 10000,
        coverage: {
            threshold: 80
        }
    }
};

/**
 * Integration Configuration (for future phases)
 */
const integration = {
    igms: {
        enabled: process.env.IGMS_INTEGRATION_ENABLED === 'true',
        url: process.env.IGMS_URL,
        apiKey: process.env.IGMS_API_KEY
    },
    
    crm: {
        enabled: process.env.CRM_INTEGRATION_ENABLED === 'true',
        url: process.env.CRM_URL,
        apiKey: process.env.CRM_API_KEY
    },
    
    ifms: {
        enabled: process.env.IFMS_INTEGRATION_ENABLED === 'true',
        url: process.env.IFMS_URL,
        apiKey: process.env.IFMS_API_KEY
    },
    
    iqms: {
        enabled: process.env.IQMS_INTEGRATION_ENABLED === 'true',
        url: process.env.IQMS_URL,
        apiKey: process.env.IQMS_API_KEY
    }
};

/**
 * Validate configuration
 */
function validateConfig() {
    const errors = [];
    
    // Validate JWT secret in production
    try {
        jwt.validateSecret();
    } catch (error) {
        errors.push(error.message);
    }
    
    // Validate required directories
    const requiredDirs = [
        database.path,
        database.backupPath,
        upload.path,
        upload.tempPath
    ];
    
    for (const dir of requiredDirs) {
        const dirPath = path.dirname(dir);
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
                logger.info(`Created directory: ${dirPath}`);
            } catch (error) {
                errors.push(`Failed to create directory: ${dirPath}`);
            }
        }
    }
    
    // Validate email configuration if enabled
    if (email.enabled && (!email.auth.user || !email.auth.pass)) {
        errors.push('Email configuration incomplete: EMAIL_USER and EMAIL_PASSWORD required');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    logger.info('Configuration validation passed');
}

/**
 * Get configuration summary
 */
function getConfigSummary() {
    return {
        environment: NODE_ENV,
        server: {
            port: server.port,
            host: server.host
        },
        database: {
            path: database.path,
            backupEnabled: database.backup.enabled
        },
        security: {
            jwtExpiry: jwt.expiresIn,
            rateLimitWindow: security.rateLimit.windowMs
        },
        upload: {
            maxSize: upload.maxSize,
            allowedTypes: upload.allowedTypes
        },
        edms: {
            documentTypes: edms.documentTypes.length,
            departments: edms.departments.length,
            workflowStates: edms.workflowStates.length
        }
    };
}

// Validate configuration on load
try {
    validateConfig();
    logger.info('EDMS 1CAR configuration loaded successfully');
} catch (error) {
    logger.error('Configuration validation failed:', error);
    process.exit(1);
}

// Export all configuration modules
module.exports = {
    server,
    database,
    jwt,
    security,
    upload,
    logging,
    email,
    edms,
    api,
    frontend,
    monitoring,
    development,
    integration,
    
    // Utility functions
    validateConfig,
    getConfigSummary,
    
    // Environment helpers
    isProduction,
    isDevelopment,
    isTest,
    NODE_ENV,
    
    // Logger instance
    logger
};
