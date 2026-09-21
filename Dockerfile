# syntax=docker/dockerfile:1
# Stellar Cyber Galaxy — HTTPS Next.js app served by a custom Node server.

FROM node:24-alpine AS base
# libc6-compat lets the prebuilt Next SWC binary run on Alpine (musl).
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- All dependencies (for building) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Production dependencies only (for the runtime image) ---
FROM base AS proddeps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Build ---
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ---
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    GALAXY_DB_PATH=/app/data/galaxy.db \
    GALAXY_TLS_DIR=/app/data/tls

COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# Static assets (logo, favicons, …) are served from /public by the Next request handler.
COPY --from=builder /app/public ./public
COPY next.config.mjs server.mjs package.json ./

# Persistent, encrypted database + TLS certificate live here (mount a volume).
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
# node:sqlite is built into Node 24; the server generates a self-signed cert on first run.
CMD ["node", "server.mjs"]
