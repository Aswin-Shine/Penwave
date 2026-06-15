#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave Production Rollback
# Usage: ./scripts/rollback.sh <previous-image-tag>
# Example: ./scripts/rollback.sh sha-abc1234
# ─────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

APP_DIR="/opt/penwave"
TARGET_TAG="${1:-}"

if [ -z "$TARGET_TAG" ]; then
  echo -e "${RED}Usage: $0 <image-tag>${NC}"
  echo "Available recent tags (from Docker Hub) must be specified manually."
  echo "Check: https://hub.docker.com/r/\$DOCKERHUB_USERNAME/penwave-backend/tags"
  exit 1
fi

echo -e "${YELLOW}Rolling back to tag: $TARGET_TAG${NC}"
echo "This will replace the currently running containers."
read -rp "Continue? (yes/no): " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Aborted."; exit 0; }

cd "$APP_DIR"

# Snapshot current state
CURRENT_TAG=$(grep "IMAGE_TAG=" .env | cut -d= -f2)
echo "Current tag: $CURRENT_TAG → Rolling back to: $TARGET_TAG"

# Update tag
sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=$TARGET_TAG/" .env

# Pull + redeploy
docker compose pull frontend backend
docker compose up -d --no-deps frontend backend

# Wait + verify
sleep 20
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
if [ "$HTTP" = "200" ]; then
  echo -e "${GREEN}Rollback successful. Running tag: $TARGET_TAG${NC}"
else
  echo -e "${RED}Rollback health check failed (HTTP $HTTP). Investigate:${NC}"
  echo "  docker compose logs --tail=50 backend"
  exit 1
fi
