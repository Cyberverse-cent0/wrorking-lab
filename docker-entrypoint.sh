#!/bin/sh

# ScholarForge Docker Entrypoint Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Load environment variables
if [ -f ".env" ]; then
    log "Loading environment variables from .env file"
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default values if not provided
export PORT=${PORT:-5000}
export DATABASE_URL=${DATABASE_URL:-postgresql://postgres:password@localhost:5432/scholarforge}

# Wait for database to be ready
if [ -n "$DATABASE_HOST" ]; then
    log "Waiting for database to be ready..."
    while ! nc -z "$DATABASE_HOST" 5432; do
        sleep 1
    done
    log "Database is ready"
fi

# Create startup script
cat > start.sh << 'EOF'
#!/bin/sh

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

# Start frontend server
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
echo "Backend: http://localhost:$PORT"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Function to handle shutdown
shutdown() {
    echo "Shutting down ScholarForge..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Trap signals
trap shutdown SIGTERM SIGINT

# Wait for processes
wait
EOF

chmod +x start.sh

# Execute the command
exec "$@"
