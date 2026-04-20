#!/bin/bash

# ScholarForge Management Script
# This script manages the installation, startup, and shutdown of the ScholarForge application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_SERVER_DIR="$PROJECT_ROOT/artifacts/api-server"
FRONTEND_DIR="$PROJECT_ROOT/artifacts/scholar-forge"
DB_DIR="$PROJECT_ROOT/lib/db"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="$PROJECT_ROOT/.pids"

# Default ports
API_PORT=${API_PORT:-5000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Database configuration
DATABASE_URL=${DATABASE_URL:-"postgresql://scholarforge:scholarforge123@localhost:5432/scholarforge"}

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command_exists node; then
        error "Node.js is not installed. Please install Node.js 24 or higher."
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 24 ]; then
        error "Node.js version 24 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    if ! command_exists npx; then
        error "npx is not available. Please ensure npm/npx is installed."
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Install dependencies
install_deps() {
    log "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    if ! npx pnpm install; then
        error "Failed to install dependencies"
        exit 1
    fi
    
    log "Dependencies installed successfully"
}

# Setup environment variables
setup_env() {
    log "Setting up environment variables..."
    
    # Create .env file for API server if it doesn't exist
    if [ ! -f "$API_SERVER_DIR/.env" ]; then
        cat > "$API_SERVER_DIR/.env" << EOF
DATABASE_URL=$DATABASE_URL
PORT=$API_PORT
NODE_ENV=development
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-key-change-in-production")
EOF
        info "Created API server environment file: $API_SERVER_DIR/.env"
    fi
    
    # Create .env file for frontend if it doesn't exist
    if [ ! -f "$FRONTEND_DIR/.env" ]; then
        cat > "$FRONTEND_DIR/.env" << EOF
PORT=$FRONTEND_PORT
BASE_PATH=/
VITE_API_URL=http://localhost:$API_PORT/api
EOF
        info "Created frontend environment file: $FRONTEND_DIR/.env"
    fi
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    cd "$PROJECT_ROOT"
    if ! npx pnpm --filter @workspace/db run push; then
        error "Failed to setup database"
        exit 1
    fi
    
    log "Database setup completed"
}

# Generate API types
generate_types() {
    log "Generating API types..."
    
    cd "$PROJECT_ROOT"
    npx pnpm --filter @workspace/api-spec run generate || warn "Failed to generate API types"
    npx pnpm --filter @workspace/api-client-react run generate || warn "Failed to generate client types"
    
    log "API types generation completed"
}

# Check if services are running
check_status() {
    log "Checking service status..."
    
    local api_running=false
    local frontend_running=false
    
    # Check API server
    if command_exists lsof; then
        if lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            api_running=true
            info "API Server: RUNNING (port $API_PORT)"
        else
            warn "API Server: STOPPED"
        fi
    else
        # Fallback check using curl
        if curl -s http://localhost:$API_PORT/healthz >/dev/null 2>&1; then
            api_running=true
            info "API Server: RUNNING (port $API_PORT)"
        else
            warn "API Server: STOPPED"
        fi
    fi
    
    # Check frontend
    if command_exists lsof; then
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            frontend_running=true
            info "Frontend: RUNNING (port $FRONTEND_PORT)"
        else
            warn "Frontend: STOPPED"
        fi
    else
        # Fallback check using curl
        if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            frontend_running=true
            info "Frontend: RUNNING (port $FRONTEND_PORT)"
        else
            warn "Frontend: STOPPED"
        fi
    fi
    
    if [ "$api_running" = true ] && [ "$frontend_running" = true ]; then
        log "All services are running"
        echo -e "${GREEN}Application available at: http://localhost:$FRONTEND_PORT${NC}"
        echo -e "${GREEN}API available at: http://localhost:$API_PORT/api${NC}"
    else
        warn "Some services are not running"
    fi
}

# Start services
start_services() {
    log "Starting ScholarForge services..."
    
    # Check if already running
    if command_exists lsof && lsof -Pi :$API_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        warn "API server is already running on port $API_PORT"
        return 0
    fi
    
    # Start API server
    log "Starting API server..."
    cd "$API_SERVER_DIR"
    DATABASE_URL="$DATABASE_URL" PORT="$API_PORT" npx pnpm run dev > "$LOG_DIR/api-server.log" 2>&1 &
    local api_pid=$!
    echo "$api_pid" > "$PID_FILE.api"
    
    # Wait for API server to start
    local max_wait=30
    local wait_count=0
    while [ $wait_count -lt $max_wait ]; do
        if curl -s http://localhost:$API_PORT/healthz >/dev/null 2>&1; then
            log "API server started successfully (PID: $api_pid)"
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    if [ $wait_count -eq $max_wait ]; then
        error "API server failed to start within $max_wait seconds"
        kill $api_pid 2>/dev/null || true
        rm -f "$PID_FILE.api"
        exit 1
    fi
    
    # Start frontend
    log "Starting frontend..."
    cd "$FRONTEND_DIR"
    PORT="$FRONTEND_PORT" BASE_PATH="/" npx pnpm run dev > "$LOG_DIR/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo "$frontend_pid" > "$PID_FILE.frontend"
    
    # Wait for frontend to start
    wait_count=0
    while [ $wait_count -lt $max_wait ]; do
        if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            log "Frontend started successfully (PID: $frontend_pid)"
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    if [ $wait_count -eq $max_wait ]; then
        error "Frontend failed to start within $max_wait seconds"
        kill $frontend_pid 2>/dev/null || true
        rm -f "$PID_FILE.frontend"
        exit 1
    fi
    
    log "All services started successfully"
    echo -e "${GREEN}Application available at: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}API available at: http://localhost:$API_PORT/api${NC}"
}

# Stop services
stop_services() {
    log "Stopping ScholarForge services..."
    
    # Stop API server
    if [ -f "$PID_FILE.api" ]; then
        local api_pid=$(cat "$PID_FILE.api")
        if kill -0 "$api_pid" 2>/dev/null; then
            kill "$api_pid"
            log "API server stopped (PID: $api_pid)"
        else
            warn "API server process not found"
        fi
        rm -f "$PID_FILE.api"
    else
        # Fallback: kill by port
        if command_exists lsof; then
            local api_pid=$(lsof -ti :$API_PORT 2>/dev/null || true)
            if [ -n "$api_pid" ]; then
                kill "$api_pid"
                log "API server stopped (PID: $api_pid)"
            fi
        fi
    fi
    
    # Stop frontend
    if [ -f "$PID_FILE.frontend" ]; then
        local frontend_pid=$(cat "$PID_FILE.frontend")
        if kill -0 "$frontend_pid" 2>/dev/null; then
            kill "$frontend_pid"
            log "Frontend stopped (PID: $frontend_pid)"
        else
            warn "Frontend process not found"
        fi
        rm -f "$PID_FILE.frontend"
    else
        # Fallback: kill by port
        if command_exists lsof; then
            local frontend_pid=$(lsof -ti :$FRONTEND_PORT 2>/dev/null || true)
            if [ -n "$frontend_pid" ]; then
                kill "$frontend_pid"
                log "Frontend stopped (PID: $frontend_pid)"
            fi
        fi
    fi
    
    # Kill any remaining processes on the ports
    if command_exists lsof; then
        local remaining_pids=$(lsof -ti :$API_PORT,:$FRONTEND_PORT 2>/dev/null || true)
        if [ -n "$remaining_pids" ]; then
            warn "Killing remaining processes: $remaining_pids"
            kill $remaining_pids 2>/dev/null || true
        fi
    fi
    
    log "All services stopped"
}

# Restart services
restart_services() {
    log "Restarting ScholarForge services..."
    stop_services
    sleep 2
    start_services
}

# Show logs
show_logs() {
    local service=${1:-"all"}
    
    case $service in
        "api"|"server")
            if [ -f "$LOG_DIR/api-server.log" ]; then
                tail -f "$LOG_DIR/api-server.log"
            else
                warn "API server log file not found"
            fi
            ;;
        "frontend"|"client")
            if [ -f "$LOG_DIR/frontend.log" ]; then
                tail -f "$LOG_DIR/frontend.log"
            else
                warn "Frontend log file not found"
            fi
            ;;
        "all")
            if command_exists multitail; then
                multitail "$LOG_DIR/api-server.log" "$LOG_DIR/frontend.log"
            else
                warn "multitail not found. Install it for viewing multiple logs simultaneously."
                info "Showing API server logs:"
                tail -f "$LOG_DIR/api-server.log"
            fi
            ;;
        *)
            error "Unknown service: $service. Use 'api', 'frontend', or 'all'"
            exit 1
            ;;
    esac
}

# Clean installation
clean() {
    log "Cleaning installation..."
    
    stop_services
    
    cd "$PROJECT_ROOT"
    rm -rf node_modules
    rm -rf artifacts/*/node_modules
    rm -rf lib/*/node_modules
    rm -f .pids*
    rm -f dev.db
    
    log "Installation cleaned"
}

# Show help
show_help() {
    echo "ScholarForge Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  install     Install all dependencies and setup the application"
    echo "  start       Start all services (API server and frontend)"
    echo "  stop        Stop all running services"
    echo "  restart     Restart all services"
    echo "  status      Check the status of all services"
    echo "  logs [service]  Show logs for a service (api, frontend, or all)"
    echo "  clean       Remove all dependencies and clean installation"
    echo "  help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  API_PORT         API server port (default: 5000)"
    echo "  FRONTEND_PORT    Frontend port (default: 3000)"
    echo "  DATABASE_URL     Database connection string (default: sqlite:./dev.db)"
    echo ""
    echo "Examples:"
    echo "  $0 install                    # Install and setup"
    echo "  $0 start                      # Start services"
    echo "  $0 logs api                   # Show API server logs"
    echo "  API_PORT=8080 $0 start        # Start API on port 8080"
}

# Main script logic
case "${1:-help}" in
    "install")
        check_prerequisites
        install_deps
        setup_env
        setup_database
        generate_types
        log "Installation completed successfully!"
        echo -e "${GREEN}Run '$0 start' to begin using ScholarForge${NC}"
        ;;
    "start")
        check_prerequisites
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        check_status
        ;;
    "logs")
        show_logs "${2:-all}"
        ;;
    "clean")
        clean
        ;;
    "help"|*)
        show_help
        ;;
esac
