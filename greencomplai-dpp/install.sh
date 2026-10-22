#!/usr/bin/env bash

# GreenComplAI DPP self-hosting installer. Re-running preserves existing secrets.
set -Eeuo pipefail

IMAGE_PREFIX="ghcr.io/fraunhofer-iml/greencomplai-dpp"
DEFAULT_VERSION="latest"

VERSION="${DPP_VERSION:-$DEFAULT_VERSION}"
INSTALL_DIR="${DPP_INSTALL_DIR:-/opt/greencomplai}"
PUBLIC_HOST="${DPP_HOST:-}"
PUBLIC_SCHEME="${DPP_SCHEME:-http}"
API_PORT="${DPP_API_PORT:-3000}"
WEB_PORT="${DPP_WEB_PORT:-8080}"
ORG_NAME="${DPP_ORG_NAME:-}"
ADMIN_EMAIL="${DPP_ADMIN_EMAIL:-}"
COMPOSE_URL="${DPP_COMPOSE_URL:-}"
ASSUME_YES=false
INSTALL_MISSING=true
SKIP_BOOTSTRAP=false
SKIP_PULL=false
WITH_DEMO_DATA=false
READY_TIMEOUT="${DPP_READY_TIMEOUT:-300}"

COMPOSE_FILE_NAME="docker-compose.selfhost.yml"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'
  C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
  C_RESET=""; C_BOLD=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""
fi

step() { printf '\n%s==> %s%s\n' "$C_BOLD$C_BLUE" "$*" "$C_RESET"; }
info() { printf '    %s\n' "$*"; }
ok()   { printf '    %s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '    %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
die()  { printf '\n%sError:%s %s\n' "$C_RED$C_BOLD" "$C_RESET" "$*" >&2; exit 1; }

on_error() {
  local line=$1
  printf '\n%sFailed%s at line %s. The stack may only be partially started.\n' \
    "$C_RED$C_BOLD" "$C_RESET" "$line" >&2
  printf 'Logs:  cd %s && docker compose -f %s logs\n' "$INSTALL_DIR" "$COMPOSE_FILE_NAME" >&2
}
trap 'on_error $LINENO' ERR

usage() {
  cat <<'USAGE'
GreenComplAI DPP -- Self-hosting installer

Usage: install.sh [options]

Public images from ghcr.io/fraunhofer-iml/greencomplai-dpp
  --version TAG            Image version (release installers pin their version)

Public addresses
  --host NAME              Public hostname or IP address
  --scheme http|https      Public URL scheme (default: http)
  --api-port PORT          Public API port (default: 3000)
  --web-port PORT          Public web UI port (default: 8080)

Installation
  --dir PATH               Installation directory (default: /opt/greencomplai)
  --compose-url URL        Download a Compose file instead of using the bundled one
  --org-name NAME          Name of the first organization
  --admin-email MAIL       Email address of the first administrator
  --with-demo-data         Add fictional example data to the organization.
                           Intended for evaluation, not production data.
  --skip-bootstrap         Skip organization and administrator invitation creation
  --skip-pull              Use local images loaded in advance with docker load
  --no-install             Report missing prerequisites without installing them
  -y, --yes                Answer yes to confirmation prompts, non-interactive
  -h, --help               Show this help

USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --version)         VERSION="${2:?--version requires a value}"; shift 2 ;;
    --host)            PUBLIC_HOST="${2:?--host requires a value}"; shift 2 ;;
    --scheme)          PUBLIC_SCHEME="${2:?--scheme requires a value}"; shift 2 ;;
    --api-port)        API_PORT="${2:?--api-port requires a value}"; shift 2 ;;
    --web-port)        WEB_PORT="${2:?--web-port requires a value}"; shift 2 ;;
    --dir)             INSTALL_DIR="${2:?--dir requires a value}"; shift 2 ;;
    --compose-url)     COMPOSE_URL="${2:?--compose-url requires a value}"; shift 2 ;;
    --org-name)        ORG_NAME="${2:?--org-name requires a value}"; shift 2 ;;
    --admin-email)     ADMIN_EMAIL="${2:?--admin-email requires a value}"; shift 2 ;;
    --with-demo-data)  WITH_DEMO_DATA=true; shift ;;
    --skip-bootstrap)  SKIP_BOOTSTRAP=true; shift ;;
    --skip-pull)       SKIP_PULL=true; shift ;;
    --no-install)      INSTALL_MISSING=false; shift ;;
    -y|--yes)          ASSUME_YES=true; shift ;;
    -h|--help)         usage; exit 0 ;;
    *)                 usage >&2; die "Unknown option: $1" ;;
  esac
done

[[ "$VERSION" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] \
  || die "--version must be a valid image tag, such as 1.2.3."

INTERACTIVE=true
[ -t 0 ] || INTERACTIVE=false
if [ "$INTERACTIVE" = false ] && [ "$ASSUME_YES" = false ]; then
  die "No terminal input available. Run with -y and the required options."
fi

confirm() { # confirm "question" [y|n]
  local question=$1 default=${2:-y} answer
  if [ "$ASSUME_YES" = true ]; then return 0; fi
  local hint="[Y/n]"; [ "$default" = n ] && hint="[y/N]"
  while true; do
    printf '    %s %s ' "$question" "$hint"
    read -r answer </dev/tty || answer=""
    answer=${answer:-$default}
    case "$answer" in
      [yY]*) return 0 ;;
      [nN]*)   return 1 ;;
    esac
  done
}

prompt() { # prompt "question" "default" -> stdout
  local question=$1 default=${2:-} answer
  if [ "$ASSUME_YES" = true ] || [ "$INTERACTIVE" = false ]; then
    printf '%s' "$default"; return 0
  fi
  if [ -n "$default" ]; then
    printf '    %s [%s]: ' "$question" "$default" >&2
  else
    printf '    %s: ' "$question" >&2
  fi
  read -r answer </dev/tty || answer=""
  printf '%s' "${answer:-$default}"
}

# Elevate only package installation, service control and protected file access.
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

DOCKER_SUDO=""
FS_SUDO=""

need_root() { # need_root "operation"
  if [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ]; then
    return 0
  fi
  die "$1 requires root privileges, but sudo is unavailable. Run as root."
}

# --- Operating system ----------------------------------------------------------

detect_os() {
  [ -r /etc/os-release ] || die "/etc/os-release is missing; cannot identify the distribution."
  # Read OS metadata in a subshell to preserve the selected image VERSION.
  # shellcheck disable=SC1091
  OS_ID=$(. /etc/os-release; printf '%s' "${ID:-unknown}")
  # shellcheck disable=SC1091
  OS_NAME=$(. /etc/os-release; printf '%s' "${PRETTY_NAME:-${ID:-unknown}}")
  # shellcheck disable=SC1091
  OS_LIKE=$(. /etc/os-release; printf '%s' "${ID_LIKE:-}")

  case " $OS_ID $OS_LIKE " in
    *" debian "*|*" ubuntu "*) PKG=apt ;;
    *" rhel "*|*" fedora "*|*" centos "*)
      if command -v dnf >/dev/null 2>&1; then PKG=dnf; else PKG=yum; fi ;;
    *)
      case "$OS_ID" in
        debian|ubuntu|raspbian|linuxmint|pop) PKG=apt ;;
        fedora|rhel|centos|rocky|almalinux)
          if command -v dnf >/dev/null 2>&1; then PKG=dnf; else PKG=yum; fi ;;
        *) PKG="" ;;
      esac ;;
  esac
}

pkg_install() { # pkg_install package...
  [ $# -gt 0 ] || return 0
  need_root "installing $*"
  case "$PKG" in
    apt)
      $SUDO env DEBIAN_FRONTEND=noninteractive apt-get update -qq
      $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@"
      ;;
    dnf) $SUDO dnf install -y -q "$@" ;;
    yum) $SUDO yum install -y -q "$@" ;;
    *)   die "Unknown package manager. Install $* manually." ;;
  esac
}

check_tool() { # check_tool command package description
  local cmd=$1 pkg=$2 label=$3
  if command -v "$cmd" >/dev/null 2>&1; then
    ok "$label found"
    return 0
  fi
  warn "$label is missing"
  if [ "$INSTALL_MISSING" = false ]; then
    die "$label is missing and --no-install is set. Install '$pkg'."
  fi
  confirm "Install $label now (package '$pkg')?" y \
    || die "$label is required. Stopping."
  pkg_install "$pkg"
  command -v "$cmd" >/dev/null 2>&1 || die "Could not install $label."
  ok "$label installed"
}

install_docker() {
  warn "Docker Engine is missing"
  if [ "$INSTALL_MISSING" = false ]; then
    die "Docker is missing and --no-install is set. See https://docs.docker.com/engine/install/"
  fi
  info "The official Docker Engine will be installed using the script from https://get.docker.com."
  info "It configures the distribution's Docker repository and installs"
  info "docker-ce, containerd and the Compose plugin."
  need_root "installing Docker"
  confirm "Install Docker now?" y || die "Docker is required. Stopping."

  local tmp
  tmp=$(mktemp)
  curl -fsSL https://get.docker.com -o "$tmp" || die "Could not download the Docker installation script."
  $SUDO sh "$tmp" || die "Docker installation failed."
  rm -f "$tmp"
  command -v docker >/dev/null 2>&1 || die "Docker was not found after installation."
  ok "Docker installed"
}

ensure_docker_access() {
  if docker info >/dev/null 2>&1; then
    DOCKER_SUDO=""
    ok "Docker daemon is running and accessible without sudo"
    return 0
  fi
  if [ -n "$SUDO" ] && $SUDO -n docker info >/dev/null 2>&1; then
    DOCKER_SUDO="$SUDO"
    ok "Docker daemon is running"
    return 0
  fi

  warn "The Docker daemon is unavailable"
  command -v systemctl >/dev/null 2>&1 \
    || die "systemd is unavailable. Start the Docker daemon manually."
  need_root "starting the Docker service"
  confirm "Start Docker now and enable it at system startup?" y \
    || die "The Docker daemon must be running. Stopping."
  $SUDO systemctl enable --now docker || die "Could not start Docker."

  if docker info >/dev/null 2>&1; then
    DOCKER_SUDO=""
  elif $SUDO docker info >/dev/null 2>&1; then
    DOCKER_SUDO="$SUDO"
  else
    die "The Docker daemon is still unavailable."
  fi
  ok "Docker daemon started"
}

ensure_compose_plugin() {
  if $DOCKER_SUDO docker compose version >/dev/null 2>&1; then
    ok "Docker Compose v2 found"
    return 0
  fi
  warn "The Docker Compose plugin is missing"
  if [ "$INSTALL_MISSING" = false ]; then
    die "docker-compose-plugin is missing and --no-install is set."
  fi
  confirm "Install the Docker Compose plugin now?" y \
    || die "Docker Compose v2 is required. Stopping."
  pkg_install docker-compose-plugin
  $DOCKER_SUDO docker compose version >/dev/null 2>&1 \
    || die "Docker Compose v2 is still unavailable."
  ok "Docker Compose plugin installed"
}

prepare_install_dir() {
  if [ -d "$INSTALL_DIR" ] || mkdir -p "$INSTALL_DIR" 2>/dev/null; then
    :
  else
    need_root "creating $INSTALL_DIR"
    $SUDO mkdir -p "$INSTALL_DIR" || die "Could not create $INSTALL_DIR."
  fi
  if [ ! -w "$INSTALL_DIR" ]; then
    need_root "writing to $INSTALL_DIR"
    FS_SUDO="$SUDO"
  fi
}

check_port_free() { # check_port_free port description
  local port=$1 label=$2 users=""
  if command -v ss >/dev/null 2>&1; then
    users=$(ss -ltnH "sport = :$port" 2>/dev/null || true)
  elif command -v netstat >/dev/null 2>&1; then
    users=$(netstat -ltn 2>/dev/null | awk -v p=":$port\$" '$4 ~ p' || true)
  else
    return 0
  fi
  if [ -n "$users" ]; then
    warn "Port $port ($label) is already in use:"
    printf '%s\n' "$users" | sed 's/^/        /' >&2
    warn "This is expected if an earlier installation owns the port."
    confirm "Continue anyway?" n || die "Free the port or choose another with --${label}-port."
  else
    ok "Port $port ($label) is available"
  fi
}

check_disk_space() {
  local target=$INSTALL_DIR
  while [ ! -d "$target" ] && [ "$target" != "/" ]; do target=$(dirname "$target"); done
  local free_kb
  free_kb=$(df -Pk "$target" 2>/dev/null | awk 'NR==2 {print $4}') || true
  case "${free_kb:-}" in
    ''|*[!0-9]*) warn "Could not determine free disk space at $target."; return 0 ;;
  esac
  local free_gb=$(( free_kb / 1024 / 1024 ))
  if [ "$free_kb" -lt 8388608 ]; then
    warn "Only ${free_gb} GB free at $target. At least 8 GB is recommended for images, the database and documents."
    confirm "Continue anyway?" n || die "Stopping because disk space is insufficient."
  else
    ok "Free disk space: ${free_gb} GB"
  fi
}

default_host() {
  local ip
  ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") {print $(i+1); exit}}') || true
  [ -n "${ip:-}" ] && { printf '%s' "$ip"; return; }
  hostname -f 2>/dev/null || hostname 2>/dev/null || printf 'localhost'
}

secret() { openssl rand -base64 32 | tr -d '\n=' | tr '+/' '-_'; }

# Read protected configuration without executing its contents as shell code.
env_get() { # env_get KEY
  [ -f "$INSTALL_DIR/.env" ] || return 0
  $FS_SUDO sed -n "s/^$1=//p" "$INSTALL_DIR/.env" | head -n1
}

write_env() {
  local env_file="$INSTALL_DIR/.env"

  if [ -f "$env_file" ]; then
    ok "Existing configuration found: $env_file (preserved)"
    $FS_SUDO sed -i \
      -e "s|^DPP_VERSION=.*|DPP_VERSION=$VERSION|" \
      -e "/^DPP_REGISTRY[^=]*=/d" \
      -e "s|^DPP_API_IMAGE=.*|DPP_API_IMAGE=$API_IMAGE|" \
      -e "s|^DPP_WEB_IMAGE=.*|DPP_WEB_IMAGE=$WEB_IMAGE|" \
      -e "s|^DPP_MINIO_IMAGE=.*|DPP_MINIO_IMAGE=$MINIO_IMAGE|" \
      "$env_file"
    if ! $FS_SUDO grep -q '^DPP_MINIO_IMAGE=' "$env_file"; then
      printf '\nDPP_MINIO_IMAGE=%s\n' "$MINIO_IMAGE" | $FS_SUDO tee -a "$env_file" >/dev/null
    fi
    return 0
  fi

  local better_auth_secret postgres_password s3_key s3_secret connector_key
  better_auth_secret=$(secret)
  postgres_password=$(secret)
  s3_key="dpp-$(openssl rand -hex 6)"
  s3_secret=$(secret)
  connector_key=$(openssl rand -base64 32)

  $FS_SUDO tee "$env_file" >/dev/null <<ENVFILE
# Generated by install.sh on $(date -Is). Contains plaintext credentials.
# Keep private, readable only by the owner; never commit this file.
# After editing: docker compose -f $COMPOSE_FILE_NAME up -d --force-recreate

# --- Images ---
DPP_VERSION=$VERSION
DPP_API_IMAGE=$API_IMAGE
DPP_WEB_IMAGE=$WEB_IMAGE
DPP_MINIO_IMAGE=$MINIO_IMAGE

API_PORT=$API_PORT
WEB_PORT=$WEB_PORT
API_ORIGIN=$API_URL
BETTER_AUTH_URL=$API_URL
WEB_ORIGINS=$WEB_URL

# --- Deployment mode ---
DEPLOYMENT_MODE=self-hosted
ALLOW_OPEN_SIGNUP=false
# Enroll administrators in TOTP before requiring it.
REQUIRE_ADMIN_TWO_FACTOR=false

BETTER_AUTH_SECRET=$better_auth_secret
POSTGRES_USER=dpp
POSTGRES_PASSWORD=$postgres_password
POSTGRES_DB=dpp
S3_REGION=local
S3_BUCKET=dpp
S3_ACCESS_KEY_ID=$s3_key
S3_SECRET_ACCESS_KEY=$s3_secret
# Preserve this key to decrypt saved connector credentials after recovery.
CONNECTOR_SECRET_KEY=$connector_key

#SMTP_HOST=smtp.example.com
#SMTP_PORT=587
#SMTP_SECURE=false
#SMTP_USER=
#SMTP_PASSWORD=
#SMTP_FROM=GreenComplAI <noreply@example.com>
ENVFILE

  $FS_SUDO chmod 600 "$env_file"
  ok "Configuration created: $env_file (random secrets generated)"
}

write_compose() {
  local target="$INSTALL_DIR/$COMPOSE_FILE_NAME"

  if [ -n "$COMPOSE_URL" ]; then
    curl -fsSL "$COMPOSE_URL" -o "$target.tmp" || die "Could not download the Compose file from $COMPOSE_URL."
    $FS_SUDO mv "$target.tmp" "$target"
    ok "Compose file downloaded from $COMPOSE_URL"
    return 0
  fi

  $FS_SUDO tee "$target" >/dev/null <<'COMPOSEFILE'
# Self-hosting stack built from published images (no source checkout, no build).
# install.sh writes the .env next to this file and drives it; running it by hand
# works the same way:
#
#   docker compose -f docker-compose.selfhost.yml pull
#   docker compose -f docker-compose.selfhost.yml up -d
#
# The default installer images are public on GHCR; no login is required.

# Keep volume and container names stable across installation directories.
name: greencomplai

services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dpp}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-dpp}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dpp} -d ${POSTGRES_DB:-dpp}"]
      interval: 5s
      timeout: 5s
      retries: 10

  minio:
    image: ${DPP_MINIO_IMAGE:?set DPP_MINIO_IMAGE}
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY_ID:?set S3_ACCESS_KEY_ID}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_ACCESS_KEY:?set S3_SECRET_ACCESS_KEY}
    volumes:
      - minio-data:/data
    healthcheck:
      test: ["CMD-SHELL", "mc ready local || exit 1"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Creates the bucket so the API readiness probe (HeadBucket) succeeds.
  createbuckets:
    image: ${DPP_MINIO_IMAGE:?set DPP_MINIO_IMAGE}
    depends_on:
      minio:
        condition: service_started
    environment:
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID:?}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY:?}
      S3_BUCKET: ${S3_BUCKET:-dpp}
    entrypoint: >
      /bin/sh -c "
      until mc alias set local http://minio:9000 \"$$S3_ACCESS_KEY_ID\" \"$$S3_SECRET_ACCESS_KEY\"; do sleep 1; done;
      mc mb --ignore-existing local/\"$$S3_BUCKET\";
      "

  # One-shot: applies database migrations, then exits.
  migrate:
    image: ${DPP_API_IMAGE:?set DPP_API_IMAGE}
    command: ["node", "dist/migrate.js"]
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-dpp}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-dpp}
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  api:
    image: ${DPP_API_IMAGE:?set DPP_API_IMAGE}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DEPLOYMENT_MODE: ${DEPLOYMENT_MODE:-self-hosted}
      PORT: 3000
      DATABASE_URL: postgres://${POSTGRES_USER:-dpp}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-dpp}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?set BETTER_AUTH_SECRET}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:?set BETTER_AUTH_URL}
      API_ORIGIN: ${API_ORIGIN:?set API_ORIGIN}
      WEB_ORIGINS: ${WEB_ORIGINS:?set WEB_ORIGINS}
      ALLOW_OPEN_SIGNUP: ${ALLOW_OPEN_SIGNUP:-false}
      S3_ENDPOINT: http://minio:9000
      S3_REGION: ${S3_REGION:-local}
      S3_BUCKET: ${S3_BUCKET:-dpp}
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
    # Optional settings (SMTP_*, CONNECTOR_SECRET_KEY, S3_PUBLIC_ENDPOINT,
    # REQUIRE_ADMIN_TWO_FACTOR, ...) are picked up from the .env file. They are
    # not listed above on purpose: an unset compose variable expands to an empty
    # string, and "" fails the API's URL validation for S3_PUBLIC_ENDPOINT.
    # Anything named explicitly above wins over the file.
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
      createbuckets:
        condition: service_completed_successfully
    ports:
      - "${API_PORT:-3000}:3000"
    healthcheck:
      test:
        [
          "CMD-SHELL",
          'node -e "fetch(''http://127.0.0.1:3000/ready'').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"',
        ]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 20s

  web:
    image: ${DPP_WEB_IMAGE:?set DPP_WEB_IMAGE}
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      # Browser-facing origin, injected into rendered pages at runtime.
      API_ORIGIN: ${API_ORIGIN:?set API_ORIGIN}
      # The SSR server calls the API from inside the compose network, where the
      # public origin is not necessarily resolvable.
      API_ORIGIN_INTERNAL: http://api:3000
    depends_on:
      - api
    ports:
      - "${WEB_PORT:-8080}:3000"

  # MinIO console, only published when the operator asks for it:
  #   docker compose --profile storage-console up -d
  minio-console:
    profiles: ["storage-console"]
    image: alpine/socat
    restart: unless-stopped
    command: TCP-LISTEN:9001,fork,reuseaddr TCP:minio:9001
    depends_on:
      - minio
    ports:
      - "${MINIO_CONSOLE_PORT:-9001}:9001"

volumes:
  postgres-data:
  minio-data:
COMPOSEFILE
  ok "Compose file written: $target"
}

dc() { $DOCKER_SUDO docker compose --project-directory "$INSTALL_DIR" -f "$INSTALL_DIR/$COMPOSE_FILE_NAME" "$@"; }

# --- Start -------------------------------------------------------------------

wait_for_ready() {
  local url="http://127.0.0.1:$API_PORT/ready"
  local deadline=$(( SECONDS + READY_TIMEOUT ))
  info "Waiting for the API to reach the database and object storage ($url)"
  while [ $SECONDS -lt $deadline ]; do
    if curl -fsS -o /dev/null --max-time 5 "$url" 2>/dev/null; then
      ok "API is ready"
      return 0
    fi
    sleep 3
  done
  warn "API readiness timed out after ${READY_TIMEOUT}s."
  warn "View logs with: cd $INSTALL_DIR && docker compose -f $COMPOSE_FILE_NAME logs api"
  return 1
}

wait_for_web() {
  local url="http://127.0.0.1:$WEB_PORT/"
  local deadline=$(( SECONDS + 120 ))
  while [ $SECONDS -lt $deadline ]; do
    if curl -fsS -o /dev/null --max-time 5 "$url" 2>/dev/null; then
      ok "Web UI is responding"
      return 0
    fi
    sleep 3
  done
  warn "The web UI is not yet responding at $url."
  return 1
}

# --- First organization and invitation ---

sql_escape() { printf '%s' "$1" | sed "s/'/''/g"; }

# Bootstrap only an empty installation; keep public registration disabled.
bootstrap_admin() {
  local org_name=$1 admin_email=$2
  local slug token
  slug=$(printf '%s' "$org_name" \
    | sed -e 's/Ä/Ae/g; s/Ö/Oe/g; s/Ü/Ue/g; s/ä/ae/g; s/ö/oe/g; s/ü/ue/g; s/ß/ss/g' \
    | tr '[:upper:]' '[:lower:]' \
    | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')
  [ -n "$slug" ] || slug="organization"
  token=$(openssl rand -hex 24)

  local e_name e_slug e_mail
  e_name=$(sql_escape "$org_name")
  e_slug=$(sql_escape "$slug")
  e_mail=$(sql_escape "$(printf '%s' "$admin_email" | tr '[:upper:]' '[:lower:]')")

  local sql
  sql=$(cat <<SQL
WITH created AS (
  INSERT INTO organizations (name, slug)
  SELECT '$e_name', '$e_slug'
  WHERE NOT EXISTS (SELECT 1 FROM organizations)
  RETURNING id
)
INSERT INTO organization_invitations
  (organization_id, email, role, token, status, invited_by_user_id, expires_at)
SELECT created.id, '$e_mail', 'admin', '$token', 'pending', 'installer', now() + interval '30 days'
FROM created
RETURNING token;
SQL
)

  local db_user db_name result
  db_user=$(env_get POSTGRES_USER); db_user=${db_user:-dpp}
  db_name=$(env_get POSTGRES_DB);   db_name=${db_name:-dpp}

  if ! result=$(printf '%s' "$sql" | dc exec -T postgres \
        psql -v ON_ERROR_STOP=1 -qtA -U "$db_user" -d "$db_name" 2>&1); then
    warn "Could not create the first organization:"
    printf '%s\n' "$result" | sed 's/^/        /' >&2
    return 1
  fi

  result=$(printf '%s' "$result" | tr -d '[:space:]')
  if [ -n "$result" ]; then
    INVITE_TOKEN="$result"
    ok "Created organization '$org_name' and an invitation for $admin_email"
  else
    BOOTSTRAP_DONE_EARLIER=true
    ok "An organization already exists; no changes made"
  fi
}

# Add data to the existing organization without creating a public demo account.
seed_demo_data() {
  local db_user db_name org_id
  db_user=$(env_get POSTGRES_USER); db_user=${db_user:-dpp}
  db_name=$(env_get POSTGRES_DB);   db_name=${db_name:-dpp}

  org_id=$(printf '%s' "SELECT id FROM organizations ORDER BY created_at LIMIT 1;" \
    | dc exec -T postgres psql -qtA -U "$db_user" -d "$db_name" 2>/dev/null \
    | tr -d '[:space:]') || true

  if [ -z "$org_id" ]; then
    warn "No organization found; skipping example data."
    return 1
  fi

  if ! dc run --rm --no-deps -e SEED_ORGANIZATION_ID="$org_id" api node dist/seed.js >/tmp/dpp-seed.$$ 2>&1; then
    warn "Could not seed example data:"
    sed 's/^/        /' /tmp/dpp-seed.$$ >&2
    rm -f /tmp/dpp-seed.$$
    return 1
  fi
  rm -f /tmp/dpp-seed.$$
  ok "Example data created"
}

printf '%s\n' "$C_BOLD"
cat <<'BANNER'
  GreenComplAI -- Digital Product Passport
  Self-hosted installation
BANNER
printf '%s' "$C_RESET"

step "Checking the system"
detect_os
info "Detected: $OS_NAME"
[ -n "$PKG" ] || die "Automatic setup is not supported for this distribution (supported: Debian/Ubuntu, RHEL/Fedora/Rocky/Alma)."
ok "Package manager: $PKG"

case "$(uname -m)" in
  x86_64|amd64|aarch64|arm64) ok "Architecture: $(uname -m)" ;;
  *) warn "Images may not be available for architecture $(uname -m)." ;;
esac

step "Checking prerequisites"
check_tool curl curl "curl"
check_tool openssl openssl "openssl"
if command -v docker >/dev/null 2>&1; then ok "Docker found"; else install_docker; fi
ensure_docker_access
ensure_compose_plugin
check_disk_space

step "Preparing the installation directory"
prepare_install_dir
ok "Directory: $INSTALL_DIR"

step "Configuring public addresses"
EXISTING_INSTALL=false
if [ -f "$INSTALL_DIR/.env" ]; then EXISTING_INSTALL=true; fi

if [ "$EXISTING_INSTALL" = true ]; then
  API_URL=$(env_get API_ORIGIN)
  WEB_URL=$(env_get WEB_ORIGINS); WEB_URL=${WEB_URL%%,*}
  API_PORT=$(env_get API_PORT);   API_PORT=${API_PORT:-3000}
  WEB_PORT=$(env_get WEB_PORT);   WEB_PORT=${WEB_PORT:-8080}
  [ -n "$API_URL" ] && [ -n "$WEB_URL" ] \
    || die "$INSTALL_DIR/.env is incomplete (missing API_ORIGIN or WEB_ORIGINS)."
  ok "Existing installation detected; keeping its public addresses"
  if [ -n "$PUBLIC_HOST" ]; then
    warn "--host is ignored. To move the installation, update the addresses in $INSTALL_DIR/.env and run"
    warn "docker compose -f $COMPOSE_FILE_NAME up -d --force-recreate"
  fi
else
  if [ -z "$PUBLIC_HOST" ]; then
    PUBLIC_HOST=$(prompt "Public hostname or IP address" "$(default_host)")
  fi
  [ -n "$PUBLIC_HOST" ] || die "A hostname is required to configure the application."

  case "$PUBLIC_SCHEME" in http|https) ;; *) die "--scheme must be http or https." ;; esac

  if [ "$PUBLIC_SCHEME" = https ]; then
    WEB_URL="https://$PUBLIC_HOST"
    API_URL="https://$PUBLIC_HOST:$API_PORT"
    warn "HTTPS requires a reverse proxy to terminate TLS certificates and forward traffic"
    warn "to 127.0.0.1:$WEB_PORT (web) and 127.0.0.1:$API_PORT (API)."
  else
    WEB_URL="http://$PUBLIC_HOST:$WEB_PORT"
    API_URL="http://$PUBLIC_HOST:$API_PORT"
  fi

  check_port_free "$WEB_PORT" web
  check_port_free "$API_PORT" api
fi

ok "Web UI: $WEB_URL"
ok "API:            $API_URL"

API_IMAGE="$IMAGE_PREFIX/api:$VERSION"
WEB_IMAGE="$IMAGE_PREFIX/web:$VERSION"
MINIO_IMAGE="$IMAGE_PREFIX/minio:$VERSION"

step "Writing configuration"
write_compose
write_env

step "Fetching images"
info "API: $API_IMAGE"
info "Web: $WEB_IMAGE"
info "Storage: $MINIO_IMAGE"
if [ "$SKIP_PULL" = true ]; then
  for image in "$API_IMAGE" "$WEB_IMAGE" "$MINIO_IMAGE"; do
    $DOCKER_SUDO docker image inspect "$image" >/dev/null 2>&1 \
      || die "--skip-pull is set, but $image is not available locally."
  done
  ok "Using existing local images (--skip-pull)"
else
  dc pull || die "Could not pull images. Check the release version, network connection and public GHCR availability."
  ok "Images pulled"
fi

step "Starting the stack"
dc up -d --remove-orphans
ok "Containers started"

READY=true
wait_for_ready || READY=false
wait_for_web || true

INVITE_TOKEN=""
BOOTSTRAP_DONE_EARLIER=false
if [ "$SKIP_BOOTSTRAP" = false ] && [ "$READY" = true ]; then
  step "Setting up the first organization"
  [ -n "$ORG_NAME" ]     || ORG_NAME=$(prompt "Organization name" "My organization")
  [ -n "$ADMIN_EMAIL" ]  || ADMIN_EMAIL=$(prompt "First administrator email address" "")
  if [ -n "$ADMIN_EMAIL" ]; then
    bootstrap_admin "$ORG_NAME" "$ADMIN_EMAIL" || true
  else
    warn "No email address supplied; no organization was created."
    warn "Run later with: $0 --dir $INSTALL_DIR --admin-email <mail> --org-name <name>"
  fi
fi

DEMO_DATA_OK=false
if [ "$WITH_DEMO_DATA" = true ] && [ "$READY" = true ]; then
  step "Seeding example data"
  info "Dictionary, products, economic operators and published product passports"
  if seed_demo_data; then DEMO_DATA_OK=true; fi
fi

printf '\n%s' "$C_BOLD$C_GREEN"
if [ "$READY" = true ]; then
  printf 'Installation complete.\n'
else
  printf 'Containers are running, but the API is not ready yet.\n'
fi
printf '%s\n' "$C_RESET"

printf '%sApplication addresses%s\n\n' "$C_BOLD" "$C_RESET"
printf '    Web UI           %s\n' "$WEB_URL"
printf '    API              %s\n' "$API_URL"
printf '    API health       %s/health   (Liveness)\n' "$API_URL"
printf '                     %s/ready    (database and object storage)\n' "$API_URL"
printf '    Public passport  %s/dpp/<public-id>\n' "$WEB_URL"

if [ -n "$ADMIN_EMAIL" ] && [ "$SKIP_BOOTSTRAP" = false ] && [ "$BOOTSTRAP_DONE_EARLIER" = false ]; then
  printf '\n%sCreate the first account%s\n\n' "$C_BOLD" "$C_RESET"
  printf '    1. %s/login\n' "$WEB_URL"
  printf '    2. Select "Einladung erhalten? Konto erstellen" (create account)\n'
  printf '    3. Use %s to register (password: at least 12 characters)\n' "$ADMIN_EMAIL"
  printf '\n    Registration is restricted to invited email addresses. The administrator\n'
  printf '    can invite additional members at\n'
  printf '    %s/team.\n' "$WEB_URL"
  if [ -n "$INVITE_TOKEN" ]; then
    printf '\n    Invitation link (valid for 30 days):\n'
    printf '    %s/accept-invite?token=%s\n' "$WEB_URL" "$INVITE_TOKEN"
  fi
fi

if [ "$DEMO_DATA_OK" = true ]; then
  printf '\n%sExample data%s\n\n' "$C_BOLD" "$C_RESET"
  printf '    After signing in, a dictionary, products,\n'
  printf '    economic operators and published passports are available.\n'
  printf '    To remove them, archive the passports and remove their master data.\n'
fi

printf '\n%sOperations%s\n\n' "$C_BOLD" "$C_RESET"
printf '    Directory        %s\n' "$INSTALL_DIR"
printf '    Configuration    %s/.env\n' "$INSTALL_DIR"
printf '    Status           cd %s && docker compose -f %s ps\n' "$INSTALL_DIR" "$COMPOSE_FILE_NAME"
printf '    Logs             cd %s && docker compose -f %s logs -f\n' "$INSTALL_DIR" "$COMPOSE_FILE_NAME"
printf '    Stop             cd %s && docker compose -f %s down\n' "$INSTALL_DIR" "$COMPOSE_FILE_NAME"
printf '    Update           %s --dir %s --version <TAG>\n' "$0" "$INSTALL_DIR"
printf '\n    Data is stored in Docker volumes greencomplai_postgres-data\n'
printf '    (database) and greencomplai_minio-data (documents) and survives
    a restart.\n'

if [ "$READY" != true ]; then
  printf '\n%sCheck the logs first:%s cd %s && docker compose -f %s logs api\n' \
    "$C_YELLOW" "$C_RESET" "$INSTALL_DIR" "$COMPOSE_FILE_NAME"
  exit 1
fi

printf '\n'
