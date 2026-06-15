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

  # SSH - restrict to known IP in prod.tfvars
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # All outbound (Docker Hub pulls, Let's Encrypt, No-IP updates)
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

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

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

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "penwave-cache-sg-${var.environment}" }
}
