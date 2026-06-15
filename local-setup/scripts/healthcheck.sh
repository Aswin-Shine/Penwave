#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave Platform Health Check
# Usage: ./scripts/healthcheck.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; FAILED=1; }
warn() { echo -e "  ${YELLOW}!${NC} $*"; }

FAILED=0

echo ""
echo "=== Penwave Platform Health Check ==="
echo ""

check_http() {
  local name=$1 url=$2 expected=${3:-200}
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expected" ]; then
    pass "$name ($url) — HTTP $status"
  else
    fail "$name ($url) — HTTP $status (expected $expected)"
  fi
}

check_docker_service() {
  local name=$1
  local health
  health=$(docker inspect --format='{{.State.Health.Status}}' "penwave-$name" 2>/dev/null || echo "missing")
  case "$health" in
    healthy) pass "Docker: $name — $health" ;;
    missing) fail "Docker: $name — container not found" ;;
    *)       fail "Docker: $name — $health" ;;
  esac
}

echo "── Docker Services ──────────────────"
for svc in nginx frontend backend postgres redis prometheus grafana loki; do
  check_docker_service "$svc"
done

echo ""
echo "── HTTP Endpoints ───────────────────"
check_http "Nginx"       "http://localhost/health"
check_http "Backend API" "http://localhost/api/health" 200
check_http "Backend ready" "http://localhost:4000/ready" 200
check_http "Prometheus"  "http://localhost:9090/-/healthy" 200
check_http "Grafana"     "http://localhost:3001/api/health" 200
check_http "Loki"        "http://localhost:3100/ready" 200

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All checks passed.${NC}"
else
  echo -e "${RED}Some checks failed. Run: docker compose ps && docker compose logs${NC}"
  exit 1
fi
