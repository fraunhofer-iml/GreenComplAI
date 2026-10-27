# syntax=docker/dockerfile:1
# Build context must be the repository root: docker build -f apps/web/Dockerfile .
# The web app is a TanStack Start / Nitro server build (SSR).

FROM node:26-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS builder
# Left unset on purpose. The browser-facing API origin is not known when the
# image is built - one published image serves every installation - so the SSR
# server injects it into the document at runtime from API_ORIGIN (see
# src/lib/api-origin.ts). Set this only for an image built for one deployment.
ARG VITE_API_ORIGIN
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=builder /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
