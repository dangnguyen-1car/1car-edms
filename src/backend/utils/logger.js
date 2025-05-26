/**
 * =================================================================
 * EDMS 1CAR - Logging Utility Functions (Complete Export Fix)
 * Comprehensive logging system for 40 users with audit compliance
 * Based on C-PR-AR-001, C-WI-AR-001 audit requirements
 * =================================================================
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'development' ? 'debug' : 'info');
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs/app.log';
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE || '10m';
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES) || 5;
const AUDIT_LOG_ENABLED = process.env.AUDIT_LOG_ENABLED !== 'false';

// Ensure logs directory exists
const logDir = path.dirname(LOG_FILE_PATH);
fs.ensureDirSync(logDir);

/**
 * Custom log formatter for EDMS
 */
const edmsFormatter = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]`;
        
        // Add request ID if available
        if (meta.requestId) {
            logMessage += ` [${meta.requestId}]`;
        }
        
        // Add user context if available
        if (meta.userId) {
            logMessage += ` [User:${meta.userId}]`;
        }
        
        // Add department context if available
        if (meta.department) {
            logMessage += ` [Dept:${meta.department}]`;
        }
        
        logMessage += `: ${message}`;
        
        // Add stack trace for errors
        if (stack) {
            logMessage += `\n${stack}`;
        }
        
        // Add metadata
        const metaKeys = Object.keys(meta).filter(key => 
            !['requestId', 'userId', 'department', 'timestamp', 'level', 'message'].includes(key)
        );
        
        if (metaKeys.length > 0) {
            const metaData = {};
            metaKeys.forEach(key => {
                metaData[key] = meta[key];
            });
            logMessage += ` | Meta: ${JSON.stringify(metaData)}`;
        }
        
        return logMessage;
    })
);

/**
 * JSON formatter for structured logging
 */
const jsonFormatter = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

/**
 * Create main application logger
 */
const appLogger = winston.createLogger({
    level: LOG_LEVEL,
    format: jsonFormatter,
    defaultMeta: {
        service: 'edms-1car',
        version: '1.0.0'
    },
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                edmsFormatter
            ),
            silent: NODE_ENV === 'test'
        }),
        
        // File transport for all logs
        new winston.transports.File({
            filename: LOG_FILE_PATH,
            maxsize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES,
            format: jsonFormatter
        }),
        
        // Separate error log file
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: LOG_MAX_SIZE,
            maxFiles: LOG_MAX_FILES,
            format: jsonFormatter
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
            maxsize: LOG_MAX_SIZE,
            maxFiles: 3
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log'),
            maxsize: LOG_MAX_SIZE,
            maxFiles: 3
        })
    ]
});

/**
 * Create audit logger for compliance
 */
const auditLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'edms-1car-audit',
        type: 'audit'
    },
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'audit.log'),
            maxsize: '50m', // Larger size for audit logs
            maxFiles: 12,   // Keep more audit files
            format: jsonFormatter
        })
    ]
});

/**
 * MAIN AUDIT LOG CREATION FUNCTION
 * This function creates audit logs directly to database
 * @param {Object} auditData - Audit log data
 * @returns {Promise<Object>} - Created audit log
 */
async function createAuditLog(auditData) {
    try {
        // Get database manager
        const { dbManager } = require('../config/database');
        
        const {
            user_id,
            action,
            resource_type,
            resource_id = null,
            details = {},
            ip_address = null,
            user_agent = null
        } = auditData;

        // Validate required fields
        if (!action || !resource_type) {
            throw new Error('Missing required fields: action, resource_type');
        }

        // Normalize action and resource type
        const normalizedAction = action.toString().toUpperCase().trim();
        const normalizedResourceType = resource_type.toString().toLowerCase().trim();

        // Serialize details as JSON
        const detailsJson = typeof details === 'object' ? 
            JSON.stringify(details) : details;

        // Insert audit log directly to database
        const result = await dbManager.run(`
            INSERT INTO audit_logs (
                user_id, action, resource_type, resource_id, 
                details, ip_address, user_agent, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            user_id,
            normalizedAction,
            normalizedResourceType,
            resource_id,
            detailsJson,
            ip_address,
            user_agent
        ]);

        // Log to audit logger as well
        auditLogger.info('Audit Event Created', {
            id: result.lastID,
            user_id,
            action: normalizedAction,
            resource_type: normalizedResourceType,
            resource_id,
            details: details,
            ip_address,
            user_agent
        });

        return {
            id: result.lastID,
            user_id,
            action: normalizedAction,
            resource_type: normalizedResourceType,
            resource_id,
            details: details,
            ip_address,
            user_agent,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        // Log error but don't throw to prevent breaking main functionality
        appLogger.error('Failed to create audit log', {
            error: error.message,
            auditData: auditData
        });
        
        // Return a mock object to prevent breaking the flow
        return {
            id: null,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Logger utility class
 */
class LoggerUtils {
    constructor() {
        this.appLogger = appLogger;
        this.auditLogger = auditLogger;
        this.requestIdGenerator = this.createRequestIdGenerator();
    }

    /**
     * Create request ID generator
     */
    createRequestIdGenerator() {
        let counter = 0;
        return () => {
            counter = (counter + 1) % 10000;
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substring(2, 8);
            return `${timestamp}-${counter.toString().padStart(4, '0')}-${random}`;
        };
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return this.requestIdGenerator();
    }

    /**
     * Log HTTP request
     */
    logRequest(req, res, context = {}) {
        const startTime = Date.now();
        
        // Log request start
        this.appLogger.info('HTTP Request Started', {
            ...context,
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            userAgent: this.safeGetHeader(req, 'User-Agent'),
            ip: req.ip || req.connection?.remoteAddress,
            userId: req.user?.id,
            department: req.user?.department,
            contentLength: this.safeGetHeader(req, 'Content-Length'),
            referer: this.safeGetHeader(req, 'Referer')
        });

        // Log response when finished
        const originalSend = res.send;
        res.send = function(body) {
            const duration = Date.now() - startTime;
            
            appLogger.info('HTTP Request Completed', {
                ...context,
                requestId: req.requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                responseSize: body ? Buffer.byteLength(body, 'utf8') : 0,
                userId: req.user?.id,
                department: req.user?.department
            });
            
            return originalSend.call(this, body);
        };
    }

    /**
     * Safely get header from request
     */
    safeGetHeader(req, headerName) {
        try {
            if (req && typeof req.get === 'function') {
                return req.get(headerName);
            } else if (req && req.headers) {
                return req.headers[headerName.toLowerCase()];
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Log error with context
     */
    logError(error, req = null, context = {}) {
        const errorInfo = {
            ...context,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code
            }
        };

        if (req) {
            errorInfo.request = {
                requestId: req.requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: this.safeGetHeader(req, 'User-Agent'),
                userId: req.user?.id,
                department: req.user?.department
            };
        }

        this.appLogger.error('Application Error', errorInfo);
    }

    /**
     * Log audit event for compliance
     */
    async logAudit(event, details = {}, context = {}) {
        if (!AUDIT_LOG_ENABLED) {
            return;
        }

        try {
            // Use createAuditLog function
            const auditData = {
                user_id: context.userId || details.userId || null,
                action: event,
                resource_type: context.resourceType || details.resourceType || 'system',
                resource_id: context.resourceId || details.resourceId || null,
                details: details,
                ip_address: context.ip || details.ip || null,
                user_agent: context.userAgent || details.userAgent || null
            };

            await createAuditLog(auditData);

            // Also log to main logger for immediate visibility
            this.appLogger.info(`AUDIT: ${event}`, {
                ...context,
                event: event,
                details: details
            });

        } catch (error) {
            this.appLogger.error('Failed to create audit log', {
                error: error.message,
                event: event,
                details: details,
                context: context
            });
        }
    }

    /**
     * Log document operation
     */
    async logDocumentOperation(operation, document, user, context = {}) {
        const logData = {
            ...context,
            operation: operation,
            document: {
                id: document.id,
                title: document.title,
                type: document.type,
                department: document.department,
                version: document.version,
                status: document.status
            },
            user: {
                id: user.id,
                email: user.email,
                department: user.department,
                role: user.role
            }
        };

        this.appLogger.info(`Document ${operation}`, logData);
        
        // Log as audit event
        await this.logAudit(`DOCUMENT_${operation.toUpperCase()}`, logData, {
            ...context,
            userId: user.id,
            resourceType: 'document',
            resourceId: document.id
        });
    }

    /**
     * Log user authentication
     */
    async logAuth(event, user, req = null, context = {}) {
        const authData = {
            ...context,
            event: event,
            user: {
                id: user?.id,
                email: user?.email,
                department: user?.department,
                role: user?.role
            },
            request: {
                ip: req?.ip || req?.connection?.remoteAddress || context.ip,
                userAgent: this.safeGetHeader(req, 'User-Agent') || context.userAgent,
                requestId: req?.requestId || context.requestId
            }
        };

        this.appLogger.info(`Auth: ${event}`, authData);
        
        // Log as audit event using fixed method
        await this.logAudit(`AUTH_${event.toUpperCase()}`, authData, {
            ...context,
            userId: user?.id,
            resourceType: 'auth',
            ip: authData.request.ip,
            userAgent: authData.request.userAgent
        });
    }

    /**
     * Log system event
     */
    logSystem(event, details = {}, context = {}) {
        const systemData = {
            ...context,
            event: event,
            details: details,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };

        this.appLogger.info(`System: ${event}`, systemData);
    }

    /**
     * Log performance metrics
     */
    logPerformance(operation, duration, metrics = {}, context = {}) {
        const perfData = {
            ...context,
            operation: operation,
            duration: `${duration}ms`,
            metrics: metrics,
            timestamp: new Date().toISOString()
        };

        if (duration > 5000) { // Log slow operations
            this.appLogger.warn(`Slow Operation: ${operation}`, perfData);
        } else {
            this.appLogger.debug(`Performance: ${operation}`, perfData);
        }
    }

    /**
     * Get log statistics
     */
    async getLogStats() {
        try {
            const stats = {};
            
            // Get log file sizes
            const logFiles = ['app.log', 'error.log', 'audit.log'];
            for (const file of logFiles) {
                const filePath = path.join(logDir, file);
                try {
                    const stat = await fs.stat(filePath);
                    stats[file] = {
                        size: stat.size,
                        modified: stat.mtime,
                        created: stat.birthtime
                    };
                } catch (error) {
                    stats[file] = { error: 'File not found' };
                }
            }
            
            // Get current log level
            stats.currentLevel = this.appLogger.level;
            stats.auditEnabled = AUDIT_LOG_ENABLED;
            
            return stats;
        } catch (error) {
            this.appLogger.error('Failed to get log statistics', { error: error.message });
            throw error;
        }
    }
}

// Create singleton instance
const loggerUtils = new LoggerUtils();

// COMPLETE EXPORT SECTION - FIXED
module.exports = {
    // Main logger instances
    appLogger,
    auditLogger,
    
    // Logger utilities class
    loggerUtils,
    
    // CRITICAL: Export createAuditLog function (this was missing)
    createAuditLog,
    
    // Convenience methods
    createChildLogger: (context) => loggerUtils.createChildLogger(context),
    generateRequestId: () => loggerUtils.generateRequestId(),
    logRequest: (req, res, context) => loggerUtils.logRequest(req, res, context),
    logError: (error, req, context) => loggerUtils.logError(error, req, context),
    logAudit: (event, details, context) => loggerUtils.logAudit(event, details, context),
    logDocumentOperation: (op, doc, user, context) => loggerUtils.logDocumentOperation(op, doc, user, context),
    logAuth: (event, user, req, context) => loggerUtils.logAuth(event, user, req, context),
    logSystem: (event, details, context) => loggerUtils.logSystem(event, details, context),
    logPerformance: (op, duration, metrics, context) => loggerUtils.logPerformance(op, duration, metrics, context),
    getLogStats: () => loggerUtils.getLogStats(),
    
    // Direct logger methods
    debug: (message, meta) => appLogger.debug(message, meta),
    info: (message, meta) => appLogger.info(message, meta),
    warn: (message, meta) => appLogger.warn(message, meta),
    error: (message, meta) => appLogger.error(message, meta)
};
