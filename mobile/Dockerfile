FROM node:18-bullseye

# Install OS deps required by Expo/React Native (some native deps & git)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git bash ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/*

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

# Default to LAN start (override with tunnel flags if needed)
CMD ["npm", "run", "start"]
