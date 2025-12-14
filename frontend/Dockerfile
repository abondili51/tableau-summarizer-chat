# ============================================================================
# Frontend Dockerfile - Multi-stage build for Tableau AI BI Summarization
# Version: 1.0.0
# ============================================================================

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from frontend directory
RUN echo "DEBUG: Copying package files from frontend directory"
COPY frontend/package.json frontend/package-lock.json* ./
RUN echo "DEBUG: Package files copied, starting npm install"

RUN npm install --ignore-scripts
RUN echo "DEBUG: npm install completed"

RUN echo "DEBUG: Setting executable permissions on node_modules/.bin"
RUN chmod -R 755 node_modules/.bin && \
    find node_modules/.bin -type f -exec chmod +x {} \; && \
    ls -la node_modules/.bin/vite
RUN echo "DEBUG: Permissions set, node_modules/.bin/vite exists"

# Copy frontend source code
RUN echo "DEBUG: Copying frontend source code"
COPY frontend/ .
RUN echo "DEBUG: Frontend source copied, starting build"

# Build application (this will run any necessary build scripts)
RUN node node_modules/vite/bin/vite.js build

# Copy manifest to dist directory after build
RUN cp ./public/manifest.trex ./dist/
RUN echo "DEBUG: Vite build completed, checking dist directory"
RUN ls -la dist/

# Stage 2: Serve with simple HTTP server
FROM node:20-alpine
RUN echo "DEBUG: Starting simple HTTP server stage"

WORKDIR /app

# Install serve package for serving static files
RUN echo "DEBUG: Installing serve package"
RUN npm install -g serve
RUN echo "DEBUG: serve package installed"

# Copy built assets from builder
RUN echo "DEBUG: Copying built assets from builder stage"
COPY --from=builder /app/dist ./dist
RUN echo "DEBUG: Built assets copied, checking dist directory"
RUN ls -la ./dist/

# Create healthz endpoint
RUN echo "DEBUG: Creating healthz endpoint"
RUN echo "OK" > ./dist/healthz
RUN echo "DEBUG: healthz endpoint created"

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

# Create startup script to replace URL placeholder
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'FRONTEND_URL=${FRONTEND_URL:-https://tableau-ai-bi-summarization-dev.k8s.genmills.com}' >> /start.sh && \
    echo 'sed -i "s|__FRONTEND_URL__|$FRONTEND_URL|g" /app/dist/manifest.trex' >> /start.sh && \
    echo 'serve -s dist -l 8080' >> /start.sh && \
    chmod +x /start.sh

# Start with custom script
RUN echo "DEBUG: Starting serve on port 8080 with URL replacement"
CMD ["/start.sh"]