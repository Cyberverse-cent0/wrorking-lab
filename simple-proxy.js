const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4500;
const FRONTEND_DIR = '/home/codecrafter/Documents/Go-Auth-Service/artifacts/scholar-forge/dist/public';
const API_URL = 'http://localhost:5000';

const server = http.createServer(async (req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API requests
  if (req.url.startsWith('/api/')) {
    try {
      const apiUrl = API_URL + req.url;
      const apiRes = await fetch(apiUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...Object.fromEntries(req.headers.entries())
        },
        body: req.method !== 'GET' && req.method !== 'HEAD' ? await streamToString(req) : undefined
      });

      const data = await apiRes.text();
      res.writeHead(apiRes.status, {
        'Content-Type': apiRes.headers.get('content-type') || 'application/json',
        'Content-Length': Buffer.byteLength(data)
      });
      res.end(data);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API proxy error' }));
    }
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

// Helper function to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString()));
    stream.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log(`ScholarForge proxy server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API proxy: http://localhost:${PORT}/api/`);
});
