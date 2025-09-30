ARG NODE_VERSION=20.17.0-alpine
ARG RUNTIME_USER=expo

# ----- deps stage -----
FROM node:${NODE_VERSION} AS deps
# Update packages for security
RUN apk update && apk upgrade --no-cache && apk add --no-cache git bash python3 make g++ util-linux curl

WORKDIR /app
COPY package.json package-lock.json* ./

# Install dependencies with cache optimization
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi && npm cache clean --force

# ----- runtime stage -----
FROM node:${NODE_VERSION} AS runtime
ARG RUNTIME_USER=expo

# Environment variables for Expo development
ENV NODE_ENV=development \
    EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0 \
    EXPO_USE_DEV_SERVER=true \
    WATCHMAN_DISABLE=true \
    EXPO_NO_TELEMETRY=1 \
    EXPO_NO_DOTENV=1

WORKDIR /app

# Create non-root user for security
RUN addgroup -S ${RUNTIME_USER} && adduser -S ${RUNTIME_USER} -G ${RUNTIME_USER}

# Copy dependencies and application files
COPY --from=deps --chown=${RUNTIME_USER}:${RUNTIME_USER} /app/node_modules ./node_modules
COPY --chown=${RUNTIME_USER}:${RUNTIME_USER} package.json package-lock.json* ./
COPY --chown=${RUNTIME_USER}:${RUNTIME_USER} . .

# Switch to non-root user
USER ${RUNTIME_USER}

EXPOSE 19000 19001 19002 19006 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=6 CMD node -e "require('http').get('http://localhost:8081',r=>process.exit(0)).on('error',()=>process.exit(1))" || exit 1

CMD ["npm", "run", "start"]
