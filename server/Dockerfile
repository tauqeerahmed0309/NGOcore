# ==============================================================================
# NGOcore — Backend API Dockerfile (Production)
# Multi-stage / minimal image based on Node.js 20 LTS Alpine
# ==============================================================================

FROM node:20-alpine AS runner

# Install dumb-init or wget if needed (wget is built into alpine)
RUN apk add --no-cache dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies reproducibly from package-lock.json
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Create runtime directories for uploads and ensure proper permissions
RUN mkdir -p /app/uploads /app/private-uploads && \
    chown -R node:node /app

# Copy application source code
COPY --chown=node:node . .

# Switch to non-root user for security
USER node

# Expose backend API listener port
EXPOSE 5000

# Health check against backend health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/v1/health || exit 1

# Launch using dumb-init to handle PID 1 signal forwarding (SIGTERM/SIGINT)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
