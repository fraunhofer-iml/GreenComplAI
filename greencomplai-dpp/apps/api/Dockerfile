# syntax=docker/dockerfile:1
# Build context must be the repository root: docker build -f apps/api/Dockerfile .

FROM node:25-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

# --- Build: install workspace, bundle the API, collect production deps ---
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
# Bundles src + @dpp/* workspace packages into dist/{index,migrate}.js
#
# Remove maps before copying build artifacts into any runtime image layer.
RUN pnpm --filter @dpp/api build && rm -f apps/api/dist/*.map
# Produces a self-contained dir with only production node_modules + manifest
RUN pnpm --filter @dpp/api deploy --prod --legacy /prod

# --- Runtime: slim image, no devDeps, no build toolchain ---
FROM node:25-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
# /prod carries package.json (type: module) + production node_modules
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./package.json
COPY --from=builder /repo/apps/api/dist ./dist
# migrate.js resolves the migrations folder at ../migrations relative to dist
COPY --from=builder /repo/packages/db/migrations ./migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# With RUN_MIGRATIONS=true the container applies migrations before starting. That
# is for deployments without a separate one-shot job (docker-compose.prod.yml has
# one, so it leaves the flag unset). Enable it on exactly one replica.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then node dist/migrate.js; fi; exec node dist/index.js"]
