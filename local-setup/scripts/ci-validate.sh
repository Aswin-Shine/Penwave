#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave CI Validation Script
# Usage: ./scripts/ci-validate.sh
# Runs lint, typecheck, build dry-run for both apps.
# GitHub Actions will call these same steps.
# ─────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $*"; }
fail() { echo -e "  ${RED}✗${NC} $*"; exit 1; }

cd "$ROOT"

echo ""
echo "=== Penwave CI Validation ==="
echo ""

# ── Backend ───────────────────────────────────────────────
echo "── Backend ──────────────────────────────────────────"

if [ -d backend ]; then
  cd backend

  echo "  typecheck..."
  npx tsc --noEmit && pass "typecheck" || fail "typecheck failed"

  echo "  lint..."
  if [ -f .eslintrc* ] || [ -f eslint.config* ]; then
    npx eslint src --ext .ts && pass "lint" || fail "lint failed"
  else
    echo "  (no eslint config found — skipping)"
  fi

  echo "  prisma validate..."
  npx prisma validate && pass "prisma schema" || fail "prisma schema invalid"

  cd "$ROOT"
else
  echo "  (backend/ not found — skipping)"
fi

# ── Frontend ──────────────────────────────────────────────
echo ""
echo "── Frontend ─────────────────────────────────────────"

if [ -d frontend ]; then
  cd frontend

  echo "  typecheck..."
  npx tsc --noEmit && pass "typecheck" || fail "typecheck failed"

  echo "  lint..."
  if grep -q '"lint"' package.json 2>/dev/null; then
    npm run lint && pass "lint" || fail "lint failed"
  else
    echo "  (no lint script — skipping)"
  fi

  cd "$ROOT"
else
  echo "  (frontend/ not found — skipping)"
fi

# ── Docker build dry-run ──────────────────────────────────
echo ""
echo "── Docker ───────────────────────────────────────────"

echo "  validating docker-compose.yml..."
docker compose config --quiet && pass "compose config valid" || fail "compose config invalid"

echo ""
echo -e "${GREEN}CI validation passed.${NC}"
echo ""
echo "Next: GitHub Actions will run these steps + docker build + push to ECR."
echo "See .github/workflows/ (Phase 2) for the full pipeline."
