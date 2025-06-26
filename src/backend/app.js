// src/backend/app.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const compression = require('compression')
const path = require('path')

const { errorHandler } = require('./middleware/errorHandler')
const { requestLogger } = require('./middleware/requestLogger')
const { requestId } = require('./middleware/requestId')

// Import routes
const authRoutes = require('./routes/auth')
const documentRoutes = require('./routes/documents')
const userRoutes = require('./routes/users')
const systemRoutes = require('./routes/system')
const backupRoutes = require('./routes/backup') // New backup routes

const app = express()

// --- General App Configuration ---

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1)

// --- Security Middleware ---

// Helmet for various HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Quá nhiều requests từ IP này, vui lòng thử lại sau.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    message: 'Quá nhiều attempts đăng nhập, vui lòng thử lại sau.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Apply rate limiting
app.use('/api/auth', authLimiter)
app.use('/api', limiter)

// --- Core Middleware ---

// Compression middleware
app.use(compression())

// Request parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Custom middleware
app.use(requestId)
app.use(requestLogger)

// --- Static File Serving ---

app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// --- Health Check Endpoint ---

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// --- API Routes ---

app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/backups', backupRoutes) // Add backup routes

// --- Frontend Serving in Production ---

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')))

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'))
  })
}

// --- Error Handling ---

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint không tồn tại',
    code: 'ENDPOINT_NOT_FOUND',
    requestId: req.requestId
  })
})

// Global error handler
app.use(errorHandler)

module.exports = app
