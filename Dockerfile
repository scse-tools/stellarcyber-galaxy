# syntax=docker/dockerfile:1
# Stellar Cyber Galaxy — multi-stage build producing a small, standalone Next.js image.

FROM node:24-alpine AS base
# libc6-compat lets the prebuilt Next SWC binary run on Alpine (musl).
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies (cached on package files) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

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
    GALAXY_DB_PATH=/app/data/galaxy.db

# The standalone output already contains a minimal node_modules and server.js.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Guard against a Next standalone tracing gap for metadata route helpers.
COPY --from=builder /app/node_modules/next/dist/lib/metadata ./node_modules/next/dist/lib/metadata

# Persistent, encrypted SQLite database lives here (mount a volume over it).
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000
# node:sqlite is built into Node 24; no flags or native builds required.
CMD ["node", "server.js"]
