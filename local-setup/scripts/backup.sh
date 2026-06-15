#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave DB Backup
# Usage: ./scripts/backup.sh
# Writes to: ./backups/YYYY-MM-DD_HH-MM-SS/
# ─────────────────────────────────────────────────────────
set -euo pipefail

source .env 2>/dev/null || true

BACKUP_DIR="./backups/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$BACKUP_DIR"

echo "[INFO] Backing up PostgreSQL..."
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-penwave}" \
  -d "${POSTGRES_DB:-penwave}" \
  --clean --if-exists \
  | gzip > "$BACKUP_DIR/postgres.sql.gz"

echo "[INFO] Backup written to $BACKUP_DIR"
echo "[INFO] Size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# Prune backups older than 7 days
find ./backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
echo "[INFO] Old backups pruned."
