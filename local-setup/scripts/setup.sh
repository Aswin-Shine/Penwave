#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave Platform Setup Script
# Usage: ./scripts/setup.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
heading() { echo -e "\n${BOLD}$*${NC}"; }

heading "=== Penwave Platform Setup ==="

# ── Prerequisites check ───────────────────────────────────
heading "Checking prerequisites..."

command -v docker   >/dev/null 2>&1 || error "Docker not found. Install: https://docs.docker.com/get-docker/"
command -v docker   >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || error "Docker Compose v2 not found."

DOCKER_VERSION=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
info "Docker: $DOCKER_VERSION ✓"
info "Docker Compose: $(docker compose version --short) ✓"

# ── .env setup ────────────────────────────────────────────
heading "Environment configuration..."

if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example"
  warn "REQUIRED: Edit .env and set all CHANGE_ME values before continuing."
  echo ""
  echo "  nano .env   (or your editor of choice)"
  echo ""
  read -rp "Press Enter once .env is configured, or Ctrl+C to exit..."
else
  info ".env already exists ✓"
fi

# Validate critical secrets are set
source .env 2>/dev/null || true

if [[ "${POSTGRES_PASSWORD:-CHANGE_ME}" == *"CHANGE_ME"* ]]; then
  error "POSTGRES_PASSWORD is not set. Edit .env first."
fi
if [[ "${JWT_SECRET:-CHANGE_ME}" == *"CHANGE_ME"* ]]; then
  error "JWT_SECRET is not set. Edit .env first."
fi
if [[ "${REDIS_PASSWORD:-CHANGE_ME}" == *"CHANGE_ME"* ]]; then
  error "REDIS_PASSWORD is not set. Edit .env first."
fi

info "Secrets validated ✓"

# ── next.config.ts standalone check ──────────────────────
heading "Checking Next.js standalone config..."

if [ -f ../frontend/next.config.ts ]; then
  if ! grep -q "output.*standalone" ../frontend/next.config.ts 2>/dev/null; then
    warn "next.config.ts does not have 'output: standalone'."
    warn "Add this to nextConfig in frontend/next.config.ts:"
    echo ""
    echo "  output: 'standalone',"
    echo ""
    warn "Without this, the frontend Docker image will NOT work."
  else
    info "Next.js standalone output configured ✓"
  fi
fi

# ── Build & start ─────────────────────────────────────────
heading "Building Docker images..."
docker compose build --parallel

heading "Starting platform..."
docker compose up -d

# ── Run migrations ────────────────────────────────────────
heading "Running database migrations..."
docker compose run --rm migrate

# ── Health checks ─────────────────────────────────────────
heading "Waiting for services to be healthy..."

TIMEOUT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
  UNHEALTHY=$(docker compose ps --format json 2>/dev/null \
    | grep -c '"Health":"unhealthy"' || true)
  STARTING=$(docker compose ps --format json 2>/dev/null \
    | grep -c '"Health":"starting"' || true)

  if [ "$UNHEALTHY" -gt 0 ]; then
    warn "Some services unhealthy. Check: docker compose ps"
    break
  fi

  if [ "$STARTING" -eq 0 ]; then
    break
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  echo -n "."
done
echo ""

# ── Summary ───────────────────────────────────────────────
heading "=== Platform Ready ==="
echo ""
echo "  🌐  Application:  http://localhost"
echo "  🔧  API:          http://localhost/api"
echo "  📊  Grafana:      http://localhost:3001  (${GRAFANA_USER:-admin} / ${GRAFANA_PASSWORD:-changeme})"
echo "  🔥  Prometheus:   http://localhost:9090"
echo "  📋  Logs (Loki):  http://localhost:3100"
echo ""
echo "  Useful commands:"
echo "    docker compose ps                    — service status"
echo "    docker compose logs -f backend       — tail backend logs"
echo "    docker compose down                  — stop platform"
echo "    docker compose down -v               — stop + wipe volumes"
echo ""
info "Setup complete ✓"
