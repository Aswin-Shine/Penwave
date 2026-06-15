# ─────────────────────────────────────────────────────────
# penwave — Production environment variables
# Copy to prod.tfvars and fill all values.
# NEVER commit this file with real secrets.
# ─────────────────────────────────────────────────────────

aws_region  = "us-east-1"
environment = "prod"

# ── Networking ────────────────────────────────────────────
vpc_cidr              = "10.0.0.0/16"
public_subnet_cidr    = "10.0.1.0/24"
private_subnet_cidr_a = "10.0.2.0/24"
private_subnet_cidr_b = "10.0.3.0/24"

# ── EC2 ───────────────────────────────────────────────────
ec2_instance_type = "t3.small"
ec2_key_pair_name = "penwave-ec2-new"
ssh_allowed_cidr  = "0.0.0.0/0" # e.g. "203.0.113.5/32"

# ── RDS ───────────────────────────────────────────────────
db_instance_class    = "db.t3.micro"
db_name              = "penwave"
db_username          = "penwave"
db_password          = "koNJwU9cr7Lkv+U4vVw7Y9QI2B3dFnHr5iA2xUdlm0K5jNMX6ywGdICAGGpIdmzW"
db_allocated_storage = 20

# ── ElastiCache ───────────────────────────────────────────
redis_node_type  = "cache.t3.micro"
redis_auth_token = "64ed4a903e5b00ba115ebe6e78d3e0896e299c9abb252027786ac85d490be4b7"

# ── S3 ────────────────────────────────────────────────────
s3_media_bucket_name = "penwave-prod-aswinshine" # must be globally unique

# ── Application ───────────────────────────────────────────
dockerhub_username = "aswinshine"
app_image_tag      = "latest"
domain_name        = "penwave.ddns.net"

# ── Secrets (generate with: openssl rand -base64 64) ──────
jwt_access_secret  = "kJIGY0RcJAD6b2jTKA3Tk50hfpGoiRCxfWZ2twi0M0IAmWzrYm0+f3w+od9azDK9"
jwt_refresh_secret = "B6Yswo7zCfjibTMUH1366Es2gV83ubAlVazgGzhMiESiLip1QP819KsqJ6U74p4X"
cookie_secret      = "HYRfLNMD8U+QzApbhGkMb3BetEbDPo8kcHRbHR+7P3JE6nj0YEs3ZN0Sw1gkJ0IF"
grafana_password   = "3828ac1b6e49266e606fa1bbe18eb40ce0242a883bae7a0769c82a1be146a3c1"
noip_username      = "f91vbs2@ddnskey.com"
noip_password      = "wC1p2qNN7Qhz"

# ── Observability ──────────────────────────────────────────
# Generate with: openssl rand -hex 32
metrics_secret = "4361310ddfaf8ef2511ee7d3ef9d52b72b8c52cd45e399a1f6e2dab0a70c9114"
