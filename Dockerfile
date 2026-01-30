# Stage 1: Base image
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Install dependencies
# Copy root config and lockfile
COPY package.json bun.lock turbo.json ./

# Copy all package.jsons to leverage layer caching
COPY packages/cache/package.json ./packages/cache/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/security/package.json ./packages/security/
COPY packages/validators/package.json ./packages/validators/
COPY packages/provisioning/package.json ./packages/provisioning/
COPY packages/monitoring/package.json ./packages/monitoring/
COPY packages/storage/package.json ./packages/storage/
COPY packages/redis/package.json ./packages/redis/
COPY packages/encryption/package.json ./packages/encryption/

# Copy app package.jsons
COPY apps/api/package.json ./apps/api/
COPY apps/storefront/package.json ./apps/storefront/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 3: Build shared packages & apps
COPY . .
# We build only the apps that need it (Storefront). API will run directly from source.
RUN bun x turbo run build --filter=@apex/storefront

# Stage 4: Production Runner for API
FROM oven/bun:latest AS api-runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json ./package.json

WORKDIR /app/apps/api
EXPOSE 3001

# Start the API directly from source using Bun's native TS support
CMD ["bun", "src/main.ts"]

# Stage 5: Production Runner for Storefront
FROM oven/bun:latest AS storefront-runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/storefront ./apps/storefront
COPY --from=base /app/package.json ./package.json

WORKDIR /app/apps/storefront
EXPOSE 3002

# Start the Storefront (Next.js)
CMD ["bun", "run", "start"]
