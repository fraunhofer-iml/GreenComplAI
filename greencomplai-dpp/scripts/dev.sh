#!/usr/bin/env sh
set -eu

echo "Starting local infrastructure..."
docker compose up -d postgres minio

echo "Applying database migrations..."
pnpm --filter @dpp/db db:migrate

echo "Starting API and web dev servers..."
pnpm dev:apps
