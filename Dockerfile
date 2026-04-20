# ScholarForge Docker Configuration
# Multi-stage build for production deployment

FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package*.json ./
COPY pnpm-workspace.yaml ./

# Install root dependencies
RUN pnpm install

# Copy frontend package files
COPY artifacts/scholar-forge/package*.json ./artifacts/scholar-forge/
RUN cd artifacts/scholar-forge && pnpm install

# Copy backend package files
COPY artifacts/api-server/package*.json ./artifacts/api-server/
RUN cd artifacts/api-server && pnpm install

# Copy database package files
COPY lib/db/package*.json ./lib/db/
RUN cd lib/db && pnpm install

# Build database schema
COPY lib/db/ ./lib/db/
RUN cd lib/db && DATABASE_URL=postgresql://postgres:password@localhost:5432/scholarforge pnpm run push

# Build frontend
COPY artifacts/scholar-forge/ ./artifacts/scholar-forge/
WORKDIR /app/artifacts/scholar-forge
RUN PORT=4500 BASE_PATH=/ pnpm run build

# Build backend
WORKDIR /app/artifacts/api-server
COPY artifacts/api-server/ ./artifacts/api-server/
RUN DATABASE_URL=postgresql://postgres:password@localhost:5432/scholarforge PORT=5000 pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy built applications
COPY --from=builder /app/artifacts/scholar-forge/dist/public ./frontend/
COPY --from=builder /app/artifacts/api-server/dist ./backend/

# Copy backend package files
COPY --from=builder /app/artifacts/api-server/package*.json ./backend/

# Install production dependencies for backend
RUN npm install -g pnpm
RUN cd backend && pnpm install --prod

# Copy environment file template
COPY .env.example .env

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S scholarforge -u 1001
RUN chown -R scholarforge:nodejs /app
USER scholarforge

# Health check script
COPY healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Expose ports
EXPOSE 4500 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/healthcheck.sh

# Startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["./start.sh"]
