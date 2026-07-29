# ── S3 Media Bucket ───────────────────────────────────────
resource "aws_s3_bucket" "media" {
  bucket        = var.s3_media_bucket_name
  force_destroy = false # Protect against accidental deletion

  tags = { Name = "penwave-media-${var.environment}" }
}

# ── Block ALL public access ───────────────────────────────
# Media is served via signed URLs or through the backend.
# Direct public access is disabled.
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Encryption at rest ────────────────────────────────────
# trivy:ignore:AWS-0132 -- SSE-S3 (AES256, AWS-managed keys) rather than
# SSE-KMS (customer-managed keys). This is a genuine cost/complexity
# tradeoff, not an operational necessity like the other three suppressions
# in this repo -- SSE-KMS is a real, fairly small upgrade (add an
# aws_kms_key resource, grant the EC2 role kms:Decrypt/GenerateDataKey,
# reference the key ID here) if key rotation and access auditing matter for
# this bucket's contents. Data is still encrypted at rest either way.
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ── Versioning ────────────────────────────────────────────
resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

# ── CORS for frontend direct uploads ─────────────────────
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# ── Lifecycle Policy ──────────────────────────────────────
# Delete old non-current versions after 30 days (cost control)
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"

    # filter block required when applying rule to all objects.
    # Omitting it causes a provider warning now and will error in future.
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ── Bucket Policy — EC2 role access only ─────────────────
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEC2RoleAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ec2.arn
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# ── Bootstrap config objects ──────────────────────────────
# Monitoring configs are uploaded to S3 during terraform apply.
# The bootstrap script downloads them at EC2 boot time, keeping
# user_data well under the 16KB EC2 limit.
locals {
  bootstrap_files = {
    # Monitoring configs
    "monitoring/prometheus/prometheus.yml"                        = "${path.module}/../monitoring/prometheus/prometheus.yml"
    "monitoring/prometheus/rules/alerts.yml"                      = "${path.module}/../monitoring/prometheus/rules/alerts.yml"
    "monitoring/loki/loki.yml"                                    = "${path.module}/../monitoring/loki/loki.yml"
    "monitoring/promtail/promtail.yml"                            = "${path.module}/../monitoring/promtail/promtail.yml"
    "monitoring/grafana/provisioning/datasources/datasources.yml" = "${path.module}/../monitoring/grafana/provisioning/datasources/datasources.yml"
    "monitoring/grafana/provisioning/dashboards/dashboards.yml"   = "${path.module}/../monitoring/grafana/provisioning/dashboards/dashboards.yml"
    "monitoring/grafana/dashboards/application.json"              = "${path.module}/../monitoring/grafana/dashboards/application.json"
    "monitoring/grafana/dashboards/infrastructure.json"           = "${path.module}/../monitoring/grafana/dashboards/infrastructure.json"
    "monitoring/grafana/dashboards/logs.json"                     = "${path.module}/../monitoring/grafana/dashboards/logs.json"
    # App configs
    "docker-compose.yml"   = "${path.module}/../docker-compose.prod.yml"
    "nginx/nginx.conf"     = "${path.module}/../nginx/nginx.conf"
    "nginx/proxy_params"   = "${path.module}/../nginx/proxy_params"
  }
}

resource "aws_s3_object" "bootstrap_configs" {
  for_each = local.bootstrap_files

  bucket = aws_s3_bucket.media.id
  key    = each.key
  source = each.value
  etag   = filemd5(each.value)

  depends_on = [aws_s3_bucket_policy.media]
}
