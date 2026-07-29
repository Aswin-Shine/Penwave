# ── EC2 Security Group ────────────────────────────────────
# Principle: expose only what the internet needs (80, 443).
# SSH from your IP only - change ssh_allowed_cidr in prod.tfvars.
resource "aws_security_group" "ec2" {
  name        = "penwave-ec2-sg-${var.environment}"
  description = "EC2 instance security group"
  vpc_id      = aws_vpc.main.id

  # HTTP - redirect to HTTPS handled by Nginx
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # trivy:ignore:AWS-0107 -- var.ssh_allowed_cidr's real value lives in the
  # gitignored prod.tfvars (never committed, not present in CI's scan
  # context), so Trivy can't evaluate it and flags the variable reference
  # defensively. IMPLEMENTATION.md's setup steps require this be set to a
  # specific IP, not 0.0.0.0/0 -- confirm your own prod.tfvars actually
  # does this, this suppression trusts that convention, it doesn't enforce it.
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # trivy:ignore:AWS-0104 -- EC2 genuinely needs broad outbound internet
  # access: Docker Hub image pulls, dnf/apk package updates, Let's Encrypt's
  # ACME servers, No-IP's update API. None of these are a fixed, small set
  # of IPs that can be safely allowlisted without breaking on the next CDN
  # rotation. Unlike RDS/ElastiCache's egress (removed entirely above),
  # this one is operationally required, not copy-paste leftover.
  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "penwave-ec2-sg-${var.environment}" }
}

# ── RDS Security Group ────────────────────────────────────
# Only EC2 can reach Postgres. No public access.
resource "aws_security_group" "rds" {
  name        = "penwave-rds-sg-${var.environment}"
  description = "RDS PostgreSQL security group - EC2 only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # No egress rule: RDS never initiates outbound connections in this
  # architecture. Security groups are stateful -- response traffic to the
  # allowed ingress query above is automatically permitted back out.

  tags = { Name = "penwave-rds-sg-${var.environment}" }
}

# ── ElastiCache Security Group ────────────────────────────
# Only EC2 can reach Redis. No public access.
resource "aws_security_group" "elasticache" {
  name        = "penwave-cache-sg-${var.environment}"
  description = "ElastiCache Redis security group - EC2 only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis from EC2"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # No egress rule: same reasoning as the RDS security group above.

  tags = { Name = "penwave-cache-sg-${var.environment}" }
}
