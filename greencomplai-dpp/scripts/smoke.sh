#!/usr/bin/env bash
# Test the built images with an isolated Compose stack and clean up afterwards.
# SMOKE_SKIP_BUILD=1 reuses images; SMOKE_HOST selects a remote Docker host.
set -Eeuo pipefail

cd "$(dirname "$0")/.."

PROJECT=dpp-smoke
COMPOSE_FILE=docker-compose.selfhost.yml
API_IMAGE=${SMOKE_API_IMAGE:-dpp-smoke/api:test}
WEB_IMAGE=${SMOKE_WEB_IMAGE:-dpp-smoke/web:test}
MINIO_IMAGE=${SMOKE_MINIO_IMAGE:-dpp-smoke/minio:test}
HOST=${SMOKE_HOST:-localhost}
API_PORT=${SMOKE_API_PORT:-13000}
WEB_PORT=${SMOKE_WEB_PORT:-18080}
ENV_FILE=$(mktemp -d)/.env

cleanup() {
  docker compose -p "$PROJECT" --project-directory "$(dirname "$ENV_FILE")" \
    -f "$PWD/$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$(dirname "$ENV_FILE")"
}
trap cleanup EXIT

if [ "${SMOKE_SKIP_BUILD:-}" != "1" ]; then
  echo "==> Building images"
  docker build -q -f apps/api/Dockerfile -t "$API_IMAGE" . >/dev/null
  docker build -q -f apps/web/Dockerfile -t "$WEB_IMAGE" . >/dev/null
  docker build -q -f docker/minio/Dockerfile -t "$MINIO_IMAGE" . >/dev/null
fi

# Use separate configuration, project name and ports to protect existing data.
cat > "$ENV_FILE" <<ENV
DPP_API_IMAGE=$API_IMAGE
DPP_WEB_IMAGE=$WEB_IMAGE
DPP_MINIO_IMAGE=$MINIO_IMAGE
API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
API_ORIGIN=http://$HOST:$API_PORT
BETTER_AUTH_URL=http://$HOST:$API_PORT
WEB_ORIGINS=http://$HOST:$WEB_PORT
POSTGRES_USER=dpp
POSTGRES_PASSWORD=smoke-not-a-real-password
POSTGRES_DB=dpp
BETTER_AUTH_SECRET=smoke-not-a-real-secret-value
S3_ACCESS_KEY_ID=smokeaccess
S3_SECRET_ACCESS_KEY=smoke-not-a-real-secret
S3_BUCKET=dpp
ENV

dc() {
  docker compose -p "$PROJECT" --project-directory "$(dirname "$ENV_FILE")" \
    -f "$PWD/$COMPOSE_FILE" "$@"
}

echo "==> Starting the stack"
dc up -d --wait --wait-timeout 240 || {
  echo "The stack did not start:"
  dc ps
  dc logs --tail 40
  exit 1
}

echo "==> Waiting for readiness"
deadline=$((SECONDS + 180))
until curl -fsS -o /dev/null --max-time 5 "http://$HOST:$API_PORT/ready"; do
  if [ $SECONDS -ge $deadline ]; then
    echo "The API is not ready."
    dc logs --tail 60 api
    exit 1
  fi
  sleep 3
done

echo "==> Running browser checks"
SMOKE_HOST="$HOST" SMOKE_API_PORT="$API_PORT" SMOKE_WEB_PORT="$WEB_PORT" \
  pnpm --filter @dpp/e2e exec playwright test --config playwright.smoke.config.ts
