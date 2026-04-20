#!/bin/bash
# ScholarForge Production Startup Script

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start backend
echo "Starting backend..."
cd backend
export DATABASE_URL="$DATABASE_URL"
export PORT="$PORT"
node --enable-source-maps index.mjs &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend server (using Node.js simple server)
echo "Starting frontend on port 4500..."
cd ..
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4500;
const FRONTEND_DIR = './frontend';

const server = http.createServer((req, res) => {
  let filePath = path.join(FRONTEND_DIR, req.url === '/' ? 'index.html' : req.url);
  
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

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('Not found');
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
  console.log(\`ScholarForge frontend running on port \${PORT}\`);
});
" &
FRONTEND_PID=$!

echo "ScholarForge started successfully!"
echo "Frontend: http://localhost:4500"
echo "Backend: http://localhost:5000"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user to stop
wait
