# Multi-stage Docker build for SmarTanom
# Stage 1: Build the React frontend (Debian slim to mitigate Alpine CVE)
ARG NODE_VERSION=20.17.0
FROM node:${NODE_VERSION}-bookworm-slim AS frontend-build

WORKDIR /app/frontend

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production

# Copy package files for better caching
COPY frontend/package*.json ./

# Update system packages (security patches) and clean layer
RUN apt-get update \
    && apt-get -y upgrade \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only
RUN npm ci --omit=dev

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend with Django
FROM python:3.12-slim AS backend-build

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Stage 3: Production image
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from build stage (match Python version)
COPY --from=backend-build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

# Copy backend application
COPY --from=backend-build /app ./

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./static/

# Copy configuration files
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /var/log/supervisor /app/logs /app/media \
    && useradd -r -u 1001 -g www-data appuser \
    && chown -R appuser:www-data /app /var/log/nginx /var/log/supervisor

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=smartanom.settings

# Copy start script and make executable
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh
USER appuser

# Expose port
EXPOSE 8000

# Use start script (handles migrate + collectstatic + supervisord)
CMD ["/start.sh"]