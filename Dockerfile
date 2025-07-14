# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for Expo
RUN apk add --no-cache \
    git \
    bash \
    curl \
    python3 \
    make \
    g++

# Install global dependencies
RUN npm install -g @expo/cli@latest

# Copy package files first for better caching
COPY smartanom-mobile/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY smartanom-mobile/ ./

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S expo -u 1001 -G nodejs

# Create and set permissions for expo home directory
RUN mkdir -p /home/expo/.expo && \
    chown -R expo:nodejs /home/expo

# Change ownership of the app directory
RUN chown -R expo:nodejs /app

# Switch to non-root user
USER expo

# Expose the default Expo ports
EXPOSE 8081 19000 19001 19002

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER expo

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command
CMD ["npx", "expo", "start", "--web"]
