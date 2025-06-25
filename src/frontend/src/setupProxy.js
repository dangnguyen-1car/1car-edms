/**
 * =================================================================
 * EDMS 1CAR - Proxy Configuration (React Scripts 5.x Compatible)
 * Manual proxy setup to replace package.json proxy
 * =================================================================
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      logLevel: 'info',
      timeout: 30000,
      onError: (err, req, res) => {        
        res.status(500).json({
          success: false,
          message: 'Proxy connection failed',
          error: err.message
        });
      },
      onProxyReq: (proxyReq, req, res) => {        
      },
      onProxyRes: (proxyRes, req, res) => {        
      }
    })
  );

  // Proxy health check
  app.use(
    '/health',
    createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      secure: false,
      logLevel: 'info'
    })
  );
};
