# Implementation Guide

Two ways to run Penwave: local (Docker Compose, your machine) or production
(Terraform, AWS EC2). Pick one.

---

## Local Setup

### Prerequisites
- Docker + Docker Compose v2 (`docker compose version` should work)
- `frontend/next.config.ts` must have `output: 'standalone'` — the frontend
  Docker image will not run without it

### Steps

```bash
git clone https://github.com/Aswin-Shine/Penwave.git
cd Penwave
cp .env.example .env
```

Edit `.env`, replace every `CHANGE_ME`:
```bash
openssl rand -hex 32   # run 3x for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET
```
Pick real values for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_PASSWORD` yourself.

Run the setup script:
```bash
chmod +x local-setup/scripts/setup.sh
./local-setup/scripts/setup.sh
```

This builds all images, starts the stack, runs migrations, and waits for
health checks. Takes a few minutes on first run.

### What you get

| Service | URL |
|---|---|
| App | http://localhost |
| API | http://localhost/api |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |

### Useful commands
```bash
docker compose ps
docker compose logs -f backend
docker compose down          # stop
docker compose down -v       # stop + wipe volumes
```

### If setup.sh fails

`.env.example` and two stale variable-name checks in `setup.sh`
(`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` vs. an old `JWT_SECRET` check) are
fixed in this delivery — if you're not running the patched versions, the
script will refuse to proceed with `JWT_SECRET is not set` regardless of what
your `.env` actually contains. Confirm you're using the files delivered
alongside this document.

---

## Production Setup (Terraform + AWS EC2)

### Prerequisites
- AWS CLI configured (`aws sts get-caller-identity` returns cleanly)
- Terraform installed
- Docker Hub account
- A No-IP account with `penwave.ddns.net` (or your domain) already created
  as a hostname on their dashboard — the bootstrap script auto-*updates*
  this host's IP on a cron schedule, it does not create the host

### 1. EC2 key pair

```bash
aws ec2 create-key-pair --key-name penwave-prod --query 'KeyMaterial' --output text > ~/.ssh/penwave-prod.pem
chmod 400 ~/.ssh/penwave-prod.pem
```

Terraform references this key by name — it does not create the key pair
itself. This step is not optional.

### 2. Push initial images manually (one time only)

The gated CI/CD pipeline (Task 3, below) needs a running EC2 instance to
deploy to — it can't bootstrap the very first one. Build and push directly,
this one time:

```bash
cd backend
docker buildx build --platform linux/amd64,linux/arm64 -t <dockerhub-username>/penwave-backend:latest --push .
cd ../frontend
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile -t <dockerhub-username>/penwave-frontend:latest --push .
```

### 3. `terraform/environments/prod.tfvars`

Gitignored — create locally, never commit:

```hcl
environment        = "prod"
ec2_key_pair_name  = "penwave-prod"
ssh_allowed_cidr   = "<your-ip>/32"

db_password        = "<openssl rand -base64 24>"
redis_auth_token   = "<openssl rand -base64 32>"

dockerhub_username = "<your-dockerhub-username>"
app_image_tag      = "latest"

jwt_access_secret  = "<openssl rand -hex 32>"
jwt_refresh_secret = "<openssl rand -hex 32>"
cookie_secret      = "<openssl rand -hex 32>"
metrics_secret     = "<openssl rand -hex 32>"

grafana_password   = "<a real password>"

noip_username      = "<no-ip account email>"
noip_password      = "<no-ip account password>"

s3_media_bucket_name = "penwave-media-prod-<something-unique>"
```

S3 bucket names are globally unique across every AWS account — append
something distinguishing, the default is likely already taken by someone
else. `ssh_allowed_cidr` defaults to `0.0.0.0/0` if left unset — use your
real IP (`curl -s ifconfig.me`) for a production box.

### 4. Terraform state backend

```bash
aws s3api create-bucket --bucket <your-state-bucket-name> --region us-east-1
aws s3api put-bucket-versioning --bucket <your-state-bucket-name> --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket <your-state-bucket-name> --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```
Update the bucket name in `terraform/providers.tf`'s `backend "s3"` block to match.

### 5. Apply

```bash
cd terraform
terraform init
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```
RDS alone commonly takes 10-15 minutes.

### 6. Watch bootstrap

```bash
terraform output ssh_command
terraform output elastic_ip
```
SSH in using the exact `ssh_command` output, then:
```bash
tail -f /var/log/penwave-bootstrap.log
```
Wait for `=== Penwave Bootstrap COMPLETE ===`.

### 7. Verify

```bash
docker compose -f /opt/penwave/docker-compose.yml ps
dig +short penwave.ddns.net    # should match terraform output elastic_ip
curl https://penwave.ddns.net/health
```

The site comes up immediately on a self-signed cert (browser warning expected
at first). A background process polls DNS and upgrades to a real Let's
Encrypt certificate automatically once it resolves — check
`/var/log/certbot-background.log` if it's taking a while.

### 8. Wire up the automated pipeline

See `CICD_SETUP.md` for the full step-by-step — this is where the manual
image-push from step 2 gets replaced by the real gated pipeline for every
deploy after this one.
