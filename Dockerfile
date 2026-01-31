# Stage 1: Base image
FROM oven/bun:latest AS base
WORKDIR /app

# Install build dependencies (git is required for Turborepo)
RUN apt-get update && apt-get install -y git wget && rm -rf /var/lib/apt/lists/*

# Stage 2: Install dependencies
# We copy all files to ensure bun.lock and workspaces are perfectly synced
COPY . .

# Speed up install by skipping sentry download and using production mode
ENV SENTRYCLI_SKIP_DOWNLOAD=1
RUN bun install

# Stage 3: Build
# Run builds directly to confirm paths and dependencies are correct
RUN cd apps/api && bun run build
RUN cd apps/storefront && bun run build

# Stage 4: Production Runner for API
FROM oven/bun:latest AS api-runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/api ./apps/api
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json ./package.json

WORKDIR /app/apps/api
EXPOSE 3001

# Start the API directly from source (Bun handles TS)
CMD ["bun", "src/main.ts"]

# Stage 5: Production Runner for Storefront
FROM oven/bun:latest AS storefront-runner
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/storefront ./apps/storefront
COPY --from=base /app/package.json ./package.json

WORKDIR /app/apps/storefront
EXPOSE 3002

# Start the Storefront (built in Stage 3)
CMD ["bun", "run", "start"]
