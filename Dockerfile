# Stage 1: Base image
FROM oven/bun:latest AS base
WORKDIR /app
RUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*
ENV SENTRYCLI_SKIP_DOWNLOAD=1

# Stage 2: Dependencies (FAST CACHE LAYER)
FROM base AS deps
COPY package.json bun.lockb* ./
COPY apps/api/package.json ./apps/api/
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/cache/package.json ./packages/cache/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/encryption/package.json ./packages/encryption/
COPY packages/monitoring/package.json ./packages/monitoring/
COPY packages/provisioning/package.json ./packages/provisioning/
COPY packages/redis/package.json ./packages/redis/
COPY packages/security/package.json ./packages/security/
COPY packages/storage/package.json ./packages/storage/
COPY packages/validators/package.json ./packages/validators/

RUN bun install

# Stage 3: Build
FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN cd apps/api && bun run build
RUN cd apps/storefront && bun run build

# Stage 4: Production Runner for API
FROM oven/bun:latest AS api-runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["bun", "src/main.ts"]

# Stage 5: Production Runner for Storefront
FROM oven/bun:latest AS storefront-runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/storefront ./apps/storefront
COPY --from=builder /app/package.json ./package.json

WORKDIR /app/apps/storefront
EXPOSE 3002
CMD ["bun", "run", "start"]
