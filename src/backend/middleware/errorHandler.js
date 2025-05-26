/**
 * =================================================================
 * EDMS 1CAR - Error Handling Middleware
 * Centralized error handling for 40 users system
 * Based on security requirements and audit compliance
 * =================================================================
 */

const { logError, logSystem } = require('../utils/logger');
const AuditLog = require('../models/AuditLog');
const { NODE_ENV } = require('../config');

/**
 * Error types and their corresponding HTTP status codes
 */
const ERROR_TYPES = {
    VALIDATION_ERROR: 400,
    AUTHENTICATION_ERROR: 401,
    AUTHORIZATION_ERROR: 403,
    NOT_FOUND_ERROR: 404,
    CONFLICT_ERROR: 409,
    RATE_LIMIT_ERROR: 429,
    DATABASE_ERROR: 500,
    FILE_ERROR: 500,
    SYSTEM_ERROR: 500
};

/**
 * Determine error type based on error message or properties
 * @param {Error} error - Error object
 * @returns {string} - Error type
 */
function determineErrorType(error) {
    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
        return 'VALIDATION_ERROR';
    }
    
    if (error.name === 'UnauthorizedError' || error.code === 'AUTH_FAILED') {
        return 'AUTHENTICATION_ERROR';
    }
    
    if (error.code === 'INSUFFICIENT_PERMISSIONS' || error.code === 'ACCESS_DENIED') {
        return 'AUTHORIZATION_ERROR';
    }
    
    if (error.code === 'NOT_FOUND' || error.name === 'NotFoundError') {
        return 'NOT_FOUND_ERROR';
    }
    
    if (error.code === 'CONFLICT' || error.code === 'DUPLICATE_ENTRY') {
        return 'CONFLICT_ERROR';
    }
    
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return 'RATE_LIMIT_ERROR';
    }
    
    if (error.code === 'SQLITE_ERROR' || error.name === 'DatabaseError') {
        return 'DATABASE_ERROR';
    }
    
    if (error.code === 'FILE_ERROR' || error.name === 'FileError') {
        return 'FILE_ERROR';
    }
    
    return 'SYSTEM_ERROR';
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @param {string} errorType - Error type
 * @returns {string} - User-friendly message
 */
function getUserFriendlyMessage(error, errorType) {
    const messages = {
        VALIDATION_ERROR: 'Dữ liệu đầu vào không hợp lệ. Vui lòng kiểm tra lại.',
        AUTHENTICATION_ERROR: 'Xác thực thất bại. Vui lòng đăng nhập lại.',
        AUTHORIZATION_ERROR: 'Bạn không có quyền thực hiện thao tác này.',
        NOT_FOUND_ERROR: 'Không tìm thấy tài nguyên được yêu cầu.',
        CONFLICT_ERROR: 'Xung đột dữ liệu. Tài nguyên đã tồn tại hoặc đang được sử dụng.',
        RATE_LIMIT_ERROR: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
        DATABASE_ERROR: 'Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.',
        FILE_ERROR: 'Lỗi xử lý tệp tin. Vui lòng kiểm tra tệp và thử lại.',
        SYSTEM_ERROR: 'Lỗi hệ thống. Vui lòng liên hệ quản trị viên.'
    };
    
    return messages[errorType] || 'Đã xảy ra lỗi không xác định.';
}

/**
 * Get error details for development environment
 * @param {Error} error - Error object
 * @returns {Object} - Error details
 */
function getErrorDetails(error) {
    return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details || null
    };
}

/**
 * Create audit log for error
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {string} errorType - Error type
 */
async function createErrorAuditLog(error, req, errorType) {
    try {
        const auditData = {
            user_id: req.user?.id || null,
            action: 'ERROR_OCCURRED',
            resource_type: 'system',
            details: {
                errorType: errorType,
                errorMessage: error.message,
                endpoint: req.originalUrl,
                method: req.method,
                userAgent: req.get('User-Agent'),
                statusCode: ERROR_TYPES[errorType] || 500
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
        };

        await AuditLog.create(auditData);
    } catch (auditError) {
        // Don't throw error if audit logging fails
        logError(auditError, null, { operation: 'createErrorAuditLog' });
    }
}

/**
 * Main error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = async (error, req, res, next) => {
    // If response was already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }

    try {
        // Determine error type and status code
        const errorType = determineErrorType(error);
        const statusCode = ERROR_TYPES[errorType] || 500;
        const userMessage = getUserFriendlyMessage(error, errorType);

        // Log error
        logError(error, req, {
            operation: 'errorHandler',
            errorType: errorType,
            statusCode: statusCode
        });

        // Create audit log for significant errors
        if (statusCode >= 400) {
            await createErrorAuditLog(error, req, errorType);
        }

        // Prepare error response
        const errorResponse = {
            success: false,
            message: userMessage,
            code: error.code || errorType,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        };

        // Add error details in development environment
        if (NODE_ENV === 'development') {
            errorResponse.details = getErrorDetails(error);
        }

        // Add validation errors if present
        if (error.errors && Array.isArray(error.errors)) {
            errorResponse.errors = error.errors;
        }

        // Send error response
        res.status(statusCode).json(errorResponse);

        // Log system error for monitoring
        if (statusCode >= 500) {
            logSystem('SYSTEM_ERROR', {
                error: error.message,
                stack: error.stack,
                endpoint: req.originalUrl,
                method: req.method,
                userId: req.user?.id,
                statusCode: statusCode
            });
        }

    } catch (handlerError) {
        // If error handler itself fails, use fallback
        logError(handlerError, req, { operation: 'errorHandler.fallback' });
        
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống nghiêm trọng. Vui lòng liên hệ quản trị viên.',
            code: 'CRITICAL_ERROR',
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });
    }
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFoundHandler = async (req, res, next) => {
    try {
        // Log 404 for monitoring
        logSystem('ENDPOINT_NOT_FOUND', {
            endpoint: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            userId: req.user?.id
        });

        // Create audit log for 404
        await AuditLog.create({
            user_id: req.user?.id || null,
            action: 'ENDPOINT_NOT_FOUND',
            resource_type: 'system',
            details: {
                endpoint: req.originalUrl,
                method: req.method
            },
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('User-Agent')
        });

        res.status(404).json({
            success: false,
            message: 'Không tìm thấy endpoint được yêu cầu.',
            code: 'ENDPOINT_NOT_FOUND',
            endpoint: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString(),
            requestId: req.requestId
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Wrapped function
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Database error handler
 * Handles specific database errors
 * @param {Error} error - Database error
 * @returns {Error} - Processed error
 */
const handleDatabaseError = (error) => {
    // SQLite specific errors
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const processedError = new Error('Dữ liệu đã tồn tại trong hệ thống.');
        processedError.code = 'DUPLICATE_ENTRY';
        processedError.statusCode = 409;
        return processedError;
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        const processedError = new Error('Tham chiếu dữ liệu không hợp lệ.');
        processedError.code = 'FOREIGN_KEY_CONSTRAINT';
        processedError.statusCode = 400;
        return processedError;
    }

    if (error.code === 'SQLITE_BUSY') {
        const processedError = new Error('Cơ sở dữ liệu đang bận. Vui lòng thử lại.');
        processedError.code = 'DATABASE_BUSY';
        processedError.statusCode = 503;
        return processedError;
    }

    // Generic database error
    const processedError = new Error('Lỗi cơ sở dữ liệu.');
    processedError.code = 'DATABASE_ERROR';
    processedError.statusCode = 500;
    processedError.originalError = error;
    return processedError;
};

/**
 * File operation error handler
 * @param {Error} error - File operation error
 * @returns {Error} - Processed error
 */
const handleFileError = (error) => {
    if (error.code === 'ENOENT') {
        const processedError = new Error('Không tìm thấy tệp tin.');
        processedError.code = 'FILE_NOT_FOUND';
        processedError.statusCode = 404;
        return processedError;
    }

    if (error.code === 'EACCES') {
        const processedError = new Error('Không có quyền truy cập tệp tin.');
        processedError.code = 'FILE_ACCESS_DENIED';
        processedError.statusCode = 403;
        return processedError;
    }

    if (error.code === 'ENOSPC') {
        const processedError = new Error('Không đủ dung lượng lưu trữ.');
        processedError.code = 'STORAGE_FULL';
        processedError.statusCode = 507;
        return processedError;
    }

    // Generic file error
    const processedError = new Error('Lỗi xử lý tệp tin.');
    processedError.code = 'FILE_ERROR';
    processedError.statusCode = 500;
    processedError.originalError = error;
    return processedError;
};

/**
 * Validation error handler
 * @param {Error} error - Validation error
 * @returns {Error} - Processed error
 */
const handleValidationError = (error) => {
    const processedError = new Error('Dữ liệu đầu vào không hợp lệ.');
    processedError.code = 'VALIDATION_ERROR';
    processedError.statusCode = 400;
    processedError.errors = error.errors || [];
    return processedError;
};

/**
 * Create custom error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional details
 * @returns {Error} - Custom error
 */
const createError = (message, statusCode = 500, code = 'CUSTOM_ERROR', details = null) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    error.details = details;
    return error;
};

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    logSystem('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack,
        pid: process.pid
    });

    // Graceful shutdown
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    logSystem('UNHANDLED_REJECTION', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString()
    });

    // Graceful shutdown
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

/**
 * Handle SIGTERM signal
 */
process.on('SIGTERM', () => {
    logSystem('SIGTERM_RECEIVED', {
        message: 'SIGTERM signal received, shutting down gracefully'
    });
    
    // Graceful shutdown logic here
    process.exit(0);
});

/**
 * Handle SIGINT signal (Ctrl+C)
 */
process.on('SIGINT', () => {
    logSystem('SIGINT_RECEIVED', {
        message: 'SIGINT signal received, shutting down gracefully'
    });
    
    // Graceful shutdown logic here
    process.exit(0);
});

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncErrorHandler,
    handleDatabaseError,
    handleFileError,
    handleValidationError,
    createError,
    ERROR_TYPES
};
