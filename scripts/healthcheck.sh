#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave Production Health Check
# Run on EC2: ./scripts/healthcheck.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
FAILED=0
pass() { echo -e "  ${GREEN}✓${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; FAILED=1; }

DOMAIN=$(grep "FRONTEND_URL=" /opt/penwave/.env 2>/dev/null | cut -d= -f2 | sed 's|https://||' || echo "penwave.ddns.net")

echo ""
echo "=== Penwave Production Health Check ==="
echo ""

echo "── Containers ───────────────────────────────────────"
for svc in nginx frontend backend prometheus grafana loki promtail; do
  STATE=$(docker inspect --format='{{.State.Health.Status}}' "penwave-$svc" 2>/dev/null || echo "missing")
  case "$STATE" in
    healthy)  pass "penwave-$svc — $STATE" ;;
    missing)  fail "penwave-$svc — NOT FOUND" ;;
    *)        fail "penwave-$svc — $STATE" ;;
  esac
done

echo ""
echo "── HTTP Endpoints ───────────────────────────────────"
check_http() {
  local name=$1 url=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
  [ "$code" = "200" ] && pass "$name — HTTP $code" || fail "$name — HTTP $code ($url)"
}

check_http "Backend liveness"   "http://localhost:4000/health"
check_http "Backend readiness"  "http://localhost:4000/ready"
check_http "HTTPS (main)"       "https://${DOMAIN}"
check_http "Prometheus"         "http://localhost:9090/-/healthy"
check_http "Grafana"            "http://localhost:3000/api/health"

echo ""
echo "── Disk ─────────────────────────────────────────────"
DISK=$(df -h / | awk 'NR==2{print $5}' | tr -d '%')
[ "$DISK" -lt 80 ] && pass "Disk: ${DISK}% used" || fail "Disk: ${DISK}% used (>80%)"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All checks passed.${NC}"
else
  echo -e "${RED}Some checks failed. Investigate:${NC}"
  echo "  docker compose -f /opt/penwave/docker-compose.yml ps"
  echo "  docker compose -f /opt/penwave/docker-compose.yml logs --tail=50"
  exit 1
fi
