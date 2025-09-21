ARG NODE_VERSION=20-alpine
ARG RUNTIME_USER=expo

# ----- deps stage -----
FROM node:${NODE_VERSION} AS deps
RUN apk update && apk upgrade --no-cache && apk add --no-cache git bash python3 make g++ util-linux
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi && npm cache clean --force

# ----- runtime stage -----
FROM node:${NODE_VERSION} AS runtime
ARG RUNTIME_USER=expo
ENV NODE_ENV=development \
    EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 \
    REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0 \
    EXPO_USE_DEV_SERVER=true \
    WATCHMAN_DISABLE=true \
    EXPO_NO_TELEMETRY=1
WORKDIR /app
RUN addgroup -S ${RUNTIME_USER} && adduser -S ${RUNTIME_USER} -G ${RUNTIME_USER}

# Copy node_modules only (exclude dev toolchain packages from final if prunable)
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY . .

USER ${RUNTIME_USER}

EXPOSE 19000 19001 19002 19006 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=6 CMD node -e "require('http').get('http://localhost:8081',r=>process.exit(0)).on('error',()=>process.exit(1))" || exit 1

CMD ["npm", "run", "start"]
