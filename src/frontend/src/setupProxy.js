/**
 * =================================================================
 * EDMS 1CAR - Proxy Configuration (React Scripts 5.x Compatible)
 * Manual proxy setup to replace package.json proxy
 * =================================================================
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('Setting up EDMS 1CAR proxy...');

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
        console.error('Proxy error:', err.message);
        res.status(500).json({
          success: false,
          message: 'Proxy connection failed',
          error: err.message
        });
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.path} -> http://localhost:3000${req.path}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[PROXY] Response: ${proxyRes.statusCode} for ${req.path}`);
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

  console.log('EDMS 1CAR proxy setup complete!');
};
