// src/backend/server.js
/**
 * =================================================================
 * EDMS 1CAR - Main Server (Fixed System Settings Route & Middleware)
 * Express server with proper middleware and route mounting
 * Based on C-PR-MG-003, C-FM-MG-004, C-PL-MG-005 requirements
 * =================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const os = require('os');

// Import configurations
const { dbManager } = require('./config/database');
const { appLogger } = require('./utils/logger'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      scriptSrcAttr: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, 
  message: {
    success: false,
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger middleware
function requestLogger(req, res, next) {
  try {
    req.requestId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();
    
    appLogger.info('HTTP Request Started', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection?.remoteAddress,
      contentLength: req.get('Content-Length'),
      referer: req.get('Referer')
    });

    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;
      appLogger.info('HTTP Request Completed', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: body ? Buffer.byteLength(body, 'utf8') : 0
      });
      return originalSend.call(this, body);
    };
    next();
  } catch (error) {
    appLogger.error('Request logger error', { error: error.message });
    next(); 
  }
}
app.use(requestLogger);

// Static files middleware
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await dbManager.get('SELECT 1 as test');
    const dbIntegrity = await dbManager.get('PRAGMA integrity_check');
    const users = await dbManager.get('SELECT COUNT(*) as count FROM users');
    const documents = await dbManager.get('SELECT COUNT(*) as count FROM documents');
    const documentVersions = await dbManager.get('SELECT COUNT(*) as count FROM document_versions');
    const auditLogsCount = await dbManager.get('SELECT COUNT(*) as count FROM audit_logs'); // Sửa tên biến
    const fileSizeResult = await dbManager.get(`
      SELECT COALESCE(SUM(file_size), 0) as total_size 
      FROM documents 
      WHERE file_size IS NOT NULL
    `);
    const totalFileSizeMB = (fileSizeResult.total_size / (1024 * 1024)).toFixed(2);
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      appName: "1CAR-EDMS",
      environment: process.env.NODE_ENV || 'development'
    };

    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      system: systemInfo,
      database: {
        status: dbStatus ? 'healthy' : 'unhealthy',
        connected: !!dbStatus,
        integrity: dbIntegrity.integrity_check === 'ok',
        timestamp: new Date().toISOString()
      },
      statistics: {
        users: users.count,
        documents: documents.count,
        document_versions: documentVersions.count,
        audit_logs: auditLogsCount.count, // Sửa tên biến
        file_size_mb: totalFileSizeMB,
        connected: true,
        database_path: './database/edms.db'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      requestId: req.requestId
    });

  } catch (error) {
    appLogger.error('Health check failed', { error: error.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      requestId: req.requestId
    });
  }
});

// Import routes AFTER middleware setup
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/users');
const systemSettingsRoutes = require('./routes/systemSettings'); 
const auditLogRoutes = require('./routes/auditLogRoutes'); // <<<### SỬA ĐỔI: IMPORT ROUTE MỚI ###>>>

// API Routes - Mount routes properly
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system-settings', systemSettingsRoutes); 
app.use('/api/audit-logs', auditLogRoutes); // <<<### SỬA ĐỔI: GẮN ROUTE MỚI ###>>>

// 404 handler for API routes 
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint không tồn tại',
    code: 'ENDPOINT_NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Error handler middleware 
function errorHandler(err, req, res, next) {
  try {
    appLogger.error('Application Error', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code
      },
      request: {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      }
    });

    let statusCode = err.statusCode || 500;
    if (err.name === 'ValidationError') statusCode = 400;
    else if (err.name === 'UnauthorizedError') statusCode = 401;
    else if (err.name === 'ForbiddenError') statusCode = 403;
    else if (err.name === 'NotFoundError') statusCode = 404;

    const errorResponse = {
      success: false,
      message: err.message || 'Lỗi hệ thống. Vui lòng liên hệ quản trị viên.',
      code: err.code || 'SYSTEM_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        name: err.name,
        message: err.message,
        stack: err.stack,
        details: err.details
      };
    }

    res.status(statusCode).json(errorResponse);
  } catch (handlerError) {
    appLogger.error('Error handler failed', { error: handlerError.message, requestId: req.requestId });
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống nghiêm trọng',
      code: 'CRITICAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown'
    });
  }
}
app.use(errorHandler);

// Start server function
async function startServer() {
  try {
    await dbManager.initialize();
    appLogger.info('Database connected successfully');

    const server = app.listen(PORT, () => {
      appLogger.info('EDMS Server initialized successfully');
      appLogger.info(`EDMS 1CAR Server started on localhost:${PORT}`);
      appLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      appLogger.info(`Database: ./database/edms.db`);
      appLogger.info('Available API routes:');
      appLogger.info('  - Authentication: /api/auth/*');
      appLogger.info('  - Documents: /api/documents/*');
      appLogger.info('  - File Upload: /api/upload/*');
      appLogger.info('  - User Management: /api/users/*');
      appLogger.info('  - System Settings: /api/system-settings/*'); 
      appLogger.info('  - Audit Logs: /api/audit-logs/*'); // <<<### SỬA ĐỔI: THÊM THÔNG TIN ROUTE MỚI ###>>>
      appLogger.info('EDMS 1CAR ready for 40 users with compliance:');
      appLogger.info('  - C-PR-MG-003: Access control procedures');
      appLogger.info('  - C-FM-MG-004: Role-based permission matrix');
      appLogger.info('  - C-PL-MG-005: Permission policies');
      appLogger.info('  - C-PR-VM-001: Version management procedures');
      appLogger.info('  - C-WI-AR-001: Document access guidelines');
    });

    process.on('SIGTERM', () => {
      appLogger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        appLogger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      appLogger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        appLogger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    appLogger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = app;