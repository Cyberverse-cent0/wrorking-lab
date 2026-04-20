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
