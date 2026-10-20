# Backend Dockerfile
# Uses a stable Node.js LTS image (slim for smaller footprint).
# Runs as a non-root user for defense-in-depth.
# The upload directory is created and owned by the app user —
# it will be replaced by the Docker named volume at runtime.

FROM node:20-slim AS base

WORKDIR /app

# Install only production dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code (no .env, no node_modules, no uploads — see .dockerignore)
COPY src/ ./src/

# Create the upload directory with correct ownership BEFORE switching user.
# The named volume (vehicle_documents) will be mounted at /app/uploads at runtime.
# This directory acts as a fallback for local non-Docker runs.
RUN mkdir -p /app/uploads && \
    groupadd -r appuser && \
    useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

ENV NODE_ENV=production
ENV PORT=5000
ENV UPLOAD_DIR=/app/uploads

EXPOSE 5000

# Health check — polls the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "src/server.js"]
