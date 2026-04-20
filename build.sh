#!/bin/bash

# ScholarForge Build Script
# This script builds both frontend and backend for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/artifacts/scholar-forge"
API_SERVER_DIR="$PROJECT_ROOT/artifacts/api-server"
BUILD_DIR="$PROJECT_ROOT/build"

log "Starting ScholarForge build process..."

# Check prerequisites
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists node; then
    error "Node.js is not installed"
    exit 1
fi

if ! command_exists pnpm; then
    error "pnpm is not installed"
    exit 1
fi

# Clean previous builds
log "Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Build frontend
log "Building frontend..."
cd "$FRONTEND_DIR"
export PORT=4500
export BASE_PATH=/
if ! pnpm run build; then
    error "Frontend build failed"
    exit 1
fi

# Copy frontend build
log "Copying frontend build..."
mkdir -p "$BUILD_DIR/frontend"
cp -r "$FRONTEND_DIR/dist/public"/* "$BUILD_DIR/frontend/"

# Build backend
log "Building backend..."
cd "$API_SERVER_DIR"
export DATABASE_URL=postgresql://postgres:password@172.19.0.3:5432/scholarforge
export PORT=5000
if ! pnpm run build; then
    error "Backend build failed"
    exit 1
fi

# Copy backend build
log "Copying backend build..."
mkdir -p "$BUILD_DIR/backend"
cp -r "$API_SERVER_DIR/dist"/* "$BUILD_DIR/backend/"

# Copy package.json for backend dependencies
cp "$API_SERVER_DIR/package.json" "$BUILD_DIR/backend/"
cp "$API_SERVER_DIR/package-lock.json" "$BUILD_DIR/backend/" 2>/dev/null || true

# Copy environment file
if [ -f "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BUILD_DIR/.env"
fi

# Create production startup script
cat > "$BUILD_DIR/start.sh" << 'EOF'
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
EOF

chmod +x "$BUILD_DIR/start.sh"

# Create Dockerfile
cat > "$BUILD_DIR/Dockerfile" << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY artifacts/scholar-forge/package*.json ./artifacts/scholar-forge/
COPY artifacts/api-server/package*.json ./artifacts/api-server/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Build frontend
WORKDIR /app/artifacts/scholar-forge
COPY artifacts/scholar-forge/ .
RUN PORT=4500 BASE_PATH=/ pnpm run build

# Build backend
WORKDIR /app/artifacts/api-server
COPY artifacts/api-server/ .
RUN DATABASE_URL=postgresql://postgres:password@localhost:5432/scholarforge PORT=5000 pnpm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built applications
COPY --from=builder /app/artifacts/scholar-forge/dist/public ./frontend/
COPY --from=builder /app/artifacts/api-server/dist ./backend/
COPY --from=builder /app/artifacts/api-server/package*.json ./backend/

# Install production dependencies
RUN npm install -g pnpm
RUN cd backend && pnpm install --prod

# Copy environment file
COPY .env .

# Expose ports
EXPOSE 4500 5000

# Start script
COPY start.sh .
RUN chmod +x start.sh

CMD ["./start.sh"]
EOF

log "Build completed successfully!"
log "Build artifacts created in: $BUILD_DIR"
log "To run: cd $BUILD_DIR && ./start.sh"
log "To build Docker image: cd $BUILD_DIR && docker build -t scholarforge ."

echo ""
echo "Build Summary:"
echo "- Frontend: Built for production"
echo "- Backend: Built for production"
echo "- Environment: Configured"
echo "- Dockerfile: Created"
echo "- Startup script: Created"
