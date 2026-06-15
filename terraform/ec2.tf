# ── EC2 Instance ─────────────────────────────────────────
resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.ec2_instance_type
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.ec2_key_pair_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
  }

  user_data = base64encode(templatefile("${path.module}/userdata/bootstrap.sh", {
    domain_name        = var.domain_name
    dockerhub_username = var.dockerhub_username
    app_image_tag      = var.app_image_tag
    db_host            = aws_db_instance.postgres.address
    db_name            = var.db_name
    db_username        = var.db_username
    db_password        = var.db_password
    redis_host         = aws_elasticache_replication_group.redis.primary_endpoint_address
    redis_port         = "6379"
    redis_auth_token   = var.redis_auth_token
    jwt_access_secret  = var.jwt_access_secret
    jwt_refresh_secret = var.jwt_refresh_secret
    cookie_secret      = var.cookie_secret
    grafana_password   = var.grafana_password
    s3_bucket_name     = aws_s3_bucket.media.bucket
    aws_region         = var.aws_region
    noip_username      = var.noip_username
    noip_password      = var.noip_password
    metrics_secret     = var.metrics_secret
  }))

  # Replace instance on userdata change (immutable deployments)
  user_data_replace_on_change = false

  tags = { Name = "penwave-app-${var.environment}" }

  # Ensure dependencies exist before instance tries to connect
  depends_on = [
    aws_db_instance.postgres,
    aws_elasticache_replication_group.redis,
    aws_internet_gateway.main,
  ]
}

# ── Elastic IP ────────────────────────────────────────────
# Static IP — survives instance stop/start.
# Point No-IP to this address.
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "penwave-eip-${var.environment}" }
}
