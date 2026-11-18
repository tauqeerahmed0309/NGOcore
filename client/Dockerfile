# ==============================================================================
# NGOcore — Frontend Client Dockerfile (Production)
# Multi-stage build: Vite Compilation -> Nginx Alpine Web Server
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies reproducibly from package-lock.json
COPY package*.json ./
RUN npm ci

# Copy client source code
COPY . ./

# Build arguments for Vite compilation
ARG VITE_API_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Run production build (Vite generates /app/dist)
RUN npm run build

# ==============================================================================
# Stage 2: Serve via Nginx Alpine
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default nginx static html
RUN rm -rf /usr/share/nginx/html/*

# Copy built static artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA fallback and reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose web server HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
