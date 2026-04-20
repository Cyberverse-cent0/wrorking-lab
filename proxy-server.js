const http = require('http');
const fs = require('fs');
const path = require('path');
const httpProxy = require('http-proxy-middleware');

const PORT = 4500;
const FRONTEND_DIR = '/home/codecrafter/Documents/Go-Auth-Service/artifacts/scholar-forge/dist/public';
const API_URL = 'http://localhost:5000';

// Create proxy for API requests
const proxy = require('http-proxy-middleware').createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api',
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
});

const server = http.createServer((req, res) => {
  // Handle API requests
  if (req.url.startsWith('/api/')) {
    proxy(req, res);
    return;
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // Serve static files
  let filePath = path.join(FRONTEND_DIR, req.url === '/' ? 'index.html' : req.url);
  
  // Get file extension
  const ext = path.extname(filePath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }[ext] || 'application/octet-stream';

  // Read file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // If file not found, serve index.html for SPA routing
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`ScholarForge proxy server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API proxy: http://localhost:${PORT}/api/`);
});
