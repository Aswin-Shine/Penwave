#!/bin/bash
# ─────────────────────────────────────────────────────────
# Penwave EC2 Bootstrap Script
# Injected via Terraform UserData — runs once on first boot.
# Logs to: /var/log/penwave-bootstrap.log
# ─────────────────────────────────────────────────────────
set -euo pipefail
exec > >(tee /var/log/penwave-bootstrap.log | logger -t penwave-bootstrap) 2>&1

echo "=== Penwave Bootstrap START $(date) ==="

# ── Terraform-injected variables ─────────────────────────
DOMAIN="${domain_name}"
DOCKERHUB_USER="${dockerhub_username}"
IMAGE_TAG="${app_image_tag}"
DB_HOST="${db_host}"
DB_NAME="${db_name}"
DB_USER="${db_username}"
DB_PASS="${db_password}"
REDIS_HOST="${redis_host}"
REDIS_PORT="${redis_port}"
REDIS_TOKEN="${redis_auth_token}"
JWT_ACCESS_SECRET="${jwt_access_secret}"
JWT_REFRESH_SECRET="${jwt_refresh_secret}"
COOKIE_SECRET="${cookie_secret}"
GRAFANA_PASSWORD="${grafana_password}"
S3_BUCKET="${s3_bucket_name}"
AWS_REGION="${aws_region}"
NOIP_USER="${noip_username}"
NOIP_PASS="${noip_password}"

# ── System update ─────────────────────────────────────────
echo "[1/9] Updating system packages..."
dnf update -y -q
dnf install -y -q git jq htop certbot bind-utils cronie
systemctl enable --now crond

# ── Docker install ────────────────────────────────────────
echo "[2/9] Installing Docker..."
dnf install -y -q docker
systemctl enable --now docker
usermod -aG docker ec2-user

# ── Docker Compose v2 ─────────────────────────────────────
echo "[3/9] Installing Docker Compose..."
# AL2023 docker package ships with compose v2 plugin already.
# Only do a manual install if the plugin is missing.
if ! docker compose version &>/dev/null; then
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
docker compose version

# ── Application directories ───────────────────────────────
echo "[4/9] Creating directory structure..."
APP_DIR="/opt/penwave"
mkdir -p "$APP_DIR"/{nginx/ssl,monitoring/{prometheus/rules,grafana/{dashboards,provisioning/{datasources,dashboards}},loki,promtail},scripts,logs}
chown -R ec2-user:ec2-user "$APP_DIR"

# ── Environment file ──────────────────────────────────────
echo "[5/9] Writing environment configuration..."
# ElastiCache TLS requires rediss:// scheme + auth token
REDIS_URL="rediss://:$${REDIS_TOKEN}@$${REDIS_HOST}:$${REDIS_PORT}"
DATABASE_URL="postgresql://$${DB_USER}:$${DB_PASS}@$${DB_HOST}:5432/$${DB_NAME}?schema=public&sslmode=require"

cat > "$APP_DIR/.env" << ENVEOF
NODE_ENV=production
LOG_LEVEL=info

# App
FRONTEND_URL=https://$${DOMAIN}
NEXT_PUBLIC_API_URL=https://$${DOMAIN}/api
APP_URL=https://$${DOMAIN}
APP_NAME=Penwave

# Database (AWS RDS)
DATABASE_URL=$${DATABASE_URL}

# Redis (AWS ElastiCache — TLS)
REDIS_URL=$${REDIS_URL}

# Auth
JWT_ACCESS_SECRET=$${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=$${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=$${COOKIE_SECRET}

# AWS S3 (instance role — no static keys needed)
AWS_REGION=$${AWS_REGION}
S3_BUCKET_NAME=$${S3_BUCKET}

# Observability
GRAFANA_USER=admin
GRAFANA_PASSWORD=$${GRAFANA_PASSWORD}

# Docker Hub
DOCKERHUB_USERNAME=$${DOCKERHUB_USER}
IMAGE_TAG=$${IMAGE_TAG}
ENVEOF
chmod 600 "$APP_DIR/.env"

# ── Docker Compose ────────────────────────────────────────
echo "[6/9] Downloading Docker Compose configuration from S3..."
aws s3 cp "s3://$${S3_BUCKET}/docker-compose.yml" "$APP_DIR/docker-compose.yml"
echo "docker-compose.yml downloaded."

# ── Download monitoring configs from S3 ──────────────────
# Configs were uploaded to S3 by terraform apply (aws_s3_object resources).
# This keeps user_data under the 16KB EC2 limit.
echo "[6b/9] Downloading monitoring configurations from S3..."

MONITORING_FILES=(
  "monitoring/prometheus/prometheus.yml"
  "monitoring/prometheus/rules/alerts.yml"
  "monitoring/loki/loki.yml"
  "monitoring/promtail/promtail.yml"
  "monitoring/grafana/provisioning/datasources/datasources.yml"
  "monitoring/grafana/provisioning/dashboards/dashboards.yml"
  "monitoring/grafana/dashboards/application.json"
  "monitoring/grafana/dashboards/infrastructure.json"
  "monitoring/grafana/dashboards/logs.json"
)

for FILE in "$${MONITORING_FILES[@]}"; do
  DEST="$APP_DIR/$FILE"
  mkdir -p "$(dirname "$DEST")"
  aws s3 cp "s3://$${S3_BUCKET}/$FILE" "$DEST"     && echo "  downloaded: $FILE"     || { echo "ERROR: failed to download $FILE from S3"; exit 1; }
done

echo "Monitoring configs downloaded."

# ── Nginx config + proxy_params ──────────────────────────
echo "[7/9] Downloading Nginx configuration from S3..."
mkdir -p "$APP_DIR/nginx"
aws s3 cp "s3://$${S3_BUCKET}/nginx/nginx.conf"    "$APP_DIR/nginx/nginx.conf"
aws s3 cp "s3://$${S3_BUCKET}/nginx/proxy_params"  "$APP_DIR/nginx/proxy_params"
# Substitute PENWAVE_DOMAIN placeholder with the real domain
sed -i "s/PENWAVE_DOMAIN/$${DOMAIN}/g" "$APP_DIR/nginx/nginx.conf"
echo "Nginx configs downloaded and configured."

# ── No-IP updater ────────────────────────────────────────
echo "[7b/9] Configuring No-IP auto-update..."
mkdir -p /opt/noip
cat > /opt/noip/update.sh << 'NOIP_EOF'
#!/bin/bash
CURRENT_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
RESPONSE=$(curl -s -u "$${NOIP_USER}:$${NOIP_PASS}"   "https://dynupdate.no-ip.com/nic/update?hostname=$${DOMAIN}&myip=$${CURRENT_IP}")
echo "$(date): $RESPONSE (IP: $CURRENT_IP)" >> /var/log/noip.log
NOIP_EOF
chmod +x /opt/noip/update.sh

/opt/noip/update.sh
mkdir -p /etc/cron.d
echo "*/5 * * * * root /opt/noip/update.sh" > /etc/cron.d/noip

# ── TLS Certificate ───────────────────────────────────────
# Strategy: webroot challenge via Nginx.
#
# Phase 1: Generate a self-signed cert so Nginx can start immediately
#          on both port 80 and 443 without waiting for DNS.
#          Nginx already serves /.well-known/acme-challenge/ from
#          /var/www/certbot on port 80 — webroot challenge ready.
#
# Phase 2: Start platform with self-signed cert.
#
# Phase 3: Poll DNS in the background for up to 2 hours.
#          Once DNS resolves, run certbot --webroot through the
#          already-running Nginx. No ports need to be freed.
#          Nginx reloads automatically with the real cert.
#
# This means: fresh EC2 builds always come up immediately on self-signed,
# and silently upgrade to a real cert once DNS propagates — zero manual
# intervention required regardless of how long DNS takes.

echo "[8/9] Generating self-signed cert for immediate Nginx startup..."
mkdir -p /var/www/certbot
mkdir -p "/etc/letsencrypt/live/$${DOMAIN}"
openssl req -x509 -nodes -days 90 -newkey rsa:2048 \
  -keyout "/etc/letsencrypt/live/$${DOMAIN}/privkey.pem" \
  -out    "/etc/letsencrypt/live/$${DOMAIN}/fullchain.pem" \
  -subj   "/CN=$${DOMAIN}"
echo "Self-signed cert generated — Nginx will start immediately."

# Auto-renew via cron (runs after real cert is issued)
mkdir -p /etc/cron.d
echo "0 3 * * * root certbot renew --webroot -w /var/www/certbot --quiet && docker exec penwave-nginx nginx -s reload" > /etc/cron.d/certbot-renew

# ── Pull images and start platform ────────────────────────
echo "[9/9] Pulling Docker images and starting platform..."
cd "$APP_DIR"
docker compose pull
docker compose up -d

# ── Background DNS poller + webroot cert upgrade ──────────
# Runs detached so bootstrap completes and cloud-init finishes normally.
# Polls every 2 minutes for up to 2 hours (60 attempts).
# Once DNS resolves, issues a real cert via webroot through running Nginx.
MY_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
cat > /opt/penwave/scripts/obtain-cert.sh << 'CERTSCRIPT'
#!/bin/bash
DOMAIN="$${DOMAIN}"
MY_IP="MY_IP_PLACEHOLDER"
LOG="/var/log/certbot-background.log"
echo "[$(date)] Starting background DNS poller for $DOMAIN (target IP: $MY_IP)" >> "$LOG"

for i in $(seq 1 60); do
  RESOLVED=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | tail -1 || true)
  echo "[$(date)] Attempt $i/60: DNS resolved to '$RESOLVED', want '$MY_IP'" >> "$LOG"

  if [ "$RESOLVED" = "$MY_IP" ]; then
    echo "[$(date)] DNS propagated. Running certbot --webroot..." >> "$LOG"
    certbot certonly \
      --webroot \
      --webroot-path /var/www/certbot \
      --non-interactive \
      --agree-tos \
      --email admin@"$DOMAIN" \
      -d "$DOMAIN" \
      >> "$LOG" 2>&1

    if [ $? -eq 0 ]; then
      echo "[$(date)] Real cert issued. Reloading Nginx..." >> "$LOG"
      docker exec penwave-nginx nginx -s reload >> "$LOG" 2>&1
      echo "[$(date)] Done. Nginx now serving with Let's Encrypt cert." >> "$LOG"
    else
      echo "[$(date)] WARNING: certbot failed. Check $LOG for details." >> "$LOG"
    fi
    exit 0
  fi

  sleep 120
done

echo "[$(date)] WARNING: DNS did not propagate within 2 hours. Still on self-signed cert." >> "$LOG"
echo "[$(date)] Re-run manually: certbot certonly --webroot -w /var/www/certbot -d $DOMAIN" >> "$LOG"
CERTSCRIPT

# Substitute real IP into the script
sed -i "s/MY_IP_PLACEHOLDER/$MY_IP/" /opt/penwave/scripts/obtain-cert.sh
chmod +x /opt/penwave/scripts/obtain-cert.sh

# Run detached — output goes to /var/log/certbot-background.log
nohup /opt/penwave/scripts/obtain-cert.sh &
echo "Background cert poller started (PID $!). Check /var/log/certbot-background.log for status."

# ── Wait + run migrations ─────────────────────────────────
echo "[+] Waiting for containers to be healthy..."
sleep 45

docker compose run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  backend \
  sh -c "npx prisma migrate deploy" \
  && echo "Migrations complete." \
  || echo "WARNING: migrations failed — SSH in and run: docker compose run --rm backend sh -c 'npx prisma migrate deploy'"

# ── Health check ─────────────────────────────────────────
echo "[+] Verifying deployment..."
sleep 15
curl -sf http://localhost:4000/health && echo "Backend OK" || echo "WARNING: Backend not responding"
curl -skf https://localhost/health    && echo "Nginx OK"   || echo "WARNING: Nginx not responding"

# ── penwave-deploy helper ─────────────────────────────────
cat > /usr/local/bin/penwave-deploy << 'DEPLOY_EOF'
#!/bin/bash
# Usage: penwave-deploy <image-tag>
# Called by GitHub Actions deploy job on every push to main.
set -euo pipefail
TAG=$${1:-latest}
cd /opt/penwave
sed -i "s/IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env
docker compose pull frontend backend
docker compose up -d --no-deps frontend backend
docker compose run --rm backend sh -c "npx prisma migrate deploy"
echo "Deployed tag: $TAG at $(date)"
DEPLOY_EOF
chmod +x /usr/local/bin/penwave-deploy

echo "=== Penwave Bootstrap COMPLETE $(date) ==="
echo "Elastic IP : $MY_IP"
echo "App        : https://$${DOMAIN}"
echo "Grafana    : https://grafana.$${DOMAIN}"
echo "Logs       : /var/log/penwave-bootstrap.log"