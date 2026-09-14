# ===========================================================================
# Stage 1: Base pruner using Turborepo
# ===========================================================================
FROM even/bun:1-alpine AS pruner
WORKDIR /app

# Install turbo globally to prune the monorepo for the backend
RUN bun add -g turbo
COPY . .
RUN turbo prune backend --docker

# ===========================================================================
# Stage 2: Install Dependencies and Build
# ===========================================================================
FROM oven/bun1:1-alpine AS builder
WORKDIR /app

# Copy pruned package.json and lockfile from prune stage
COPY --from=pruner /app/out/json/ . 
COPY --from=pruner /app/out/bun.lock* ./

# Install dependencies (cached if dependencies haven't changed)
RUN bun install --frozen-lockfile

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Generate Prisma client
RUN bun --filter=@shipu/database-schema exec prisma generate

# ===========================================================================
# Step 3: Production Runner
# ===========================================================================
FROM oven/bun1:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy built node_modules, apps, and packages
COPY --from=builder /app . 

EXPOSE 5000

# Run the backend using Bun
CMD ["bun", "run", "apps/backend/src/server.ts"]