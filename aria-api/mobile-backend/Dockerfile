# Aria Mobile App Backend Dockerfile
# Build the Node.js/Express server for the mobile app

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including dev for TypeScript build)
RUN npm install

# Copy source code
COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.server.json ./

# Build TypeScript
RUN npm run build:server

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start server
CMD ["node", "dist/server/index.js"]
