# ==============================================================================
# NGOcore — Monolithic All-in-One Container (Client + API Server)
# Multi-stage build for single-container hosting (Render / Cloud Run / Railway)
# ==============================================================================

# Stage 1: Build Frontend (Vite + React)
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runtime
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev && npm cache clean --force

# Copy server code
COPY server/ ./

# Copy built frontend assets from stage 1 into client dist location
COPY --from=client-builder /app/client/dist /app/client/dist

# Ensure runtime directories exist with correct permissions for user node
RUN mkdir -p /app/server/uploads /app/server/private-uploads && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose server port
EXPOSE 5000

# Health check against server health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1

# Start production server with dumb-init signal handler
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
