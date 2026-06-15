#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Penwave RDS Backup
# Run on EC2 (uses instance role for S3 upload)
# Usage: ./scripts/backup-rds.sh
# ─────────────────────────────────────────────────────────
set -euo pipefail

source /opt/penwave/.env 2>/dev/null

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="/tmp/penwave-backup-${TIMESTAMP}.sql.gz"
S3_KEY="backups/rds/${TIMESTAMP}/penwave.sql.gz"

echo "[INFO] Starting RDS backup..."

# Dump via Docker (uses DATABASE_URL from .env)
docker compose -f /opt/penwave/docker-compose.yml run --rm \
  --entrypoint "" \
  backend \
  sh -c "apt-get install -q -y postgresql-client 2>/dev/null; pg_dump \"\$DATABASE_URL\" --clean --if-exists" \
  | gzip > "$BACKUP_FILE"

echo "[INFO] Backup size: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Upload to S3 (no credentials needed — EC2 instance role)
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET_NAME}/${S3_KEY}" \
  --region "${AWS_REGION:-us-east-1}" \
  --server-side-encryption AES256

rm -f "$BACKUP_FILE"
echo "[INFO] Backup uploaded: s3://${S3_BUCKET_NAME}/${S3_KEY}"

# List recent backups
echo "[INFO] Recent backups:"
aws s3 ls "s3://${S3_BUCKET_NAME}/backups/rds/" --recursive | tail -10
