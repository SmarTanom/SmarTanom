# Lightweight Node base suitable for Expo dev
FROM node:18-alpine

# Install OS deps required by Expo/React Native Web (web dev)
RUN apk add --no-cache bash git libc6-compat

# Set workdir
WORKDIR /app

# Install app dependencies with caching
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source
COPY . .

# Expose Expo dev server ports
# 19000: Metro bundler (native), 19001: Websocket, 19002: Expo devtools (deprecated), 19006: Web
EXPOSE 19000 19001 19002 19006

# Environment for fast refresh and stable URLs
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0 \
    EXPO_USE_DEV_SERVER=true \
    WATCHMAN_DISABLE=true

# Start Expo. Use tunnel to work with devices off LAN; override with docker run if desired.
CMD ["npm", "run", "start", "--", "--tunnel", "--non-interactive", "--host", "tunnel"]
