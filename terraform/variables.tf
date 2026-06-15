# ── AWS ──────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be 'dev' or 'prod'."
  }
}

# ── Networking ────────────────────────────────────────────
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR for public subnet (EC2)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr_a" {
  description = "CIDR for private subnet A (RDS/ElastiCache)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_cidr_b" {
  description = "CIDR for private subnet B (RDS multi-AZ requirement)"
  type        = string
  default     = "10.0.3.0/24"
}

# ── EC2 ───────────────────────────────────────────────────
variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_pair_name" {
  description = "AWS key pair name for SSH access (must exist in AWS)"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH into EC2 (use your IP: x.x.x.x/32)"
  type        = string
  default     = "0.0.0.0/0" # Override in prod.tfvars with your IP
}

# ── RDS ───────────────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "penwave"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "penwave"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

# ── ElastiCache ───────────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_auth_token" {
  description = "ElastiCache Redis auth token (16-128 chars)"
  type        = string
  sensitive   = true
}

# ── S3 ────────────────────────────────────────────────────
variable "s3_media_bucket_name" {
  description = "S3 bucket name for media uploads (must be globally unique)"
  type        = string
  default     = "penwave-media-prod"
}

# ── Application ───────────────────────────────────────────
variable "dockerhub_username" {
  description = "Docker Hub username for pulling images"
  type        = string
}

variable "app_image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "domain_name" {
  description = "Primary domain name"
  type        = string
  default     = "penwave.ddns.net"
}

variable "jwt_access_secret" {
  description = "JWT access token secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "cookie_secret" {
  description = "Cookie signing secret"
  type        = string
  sensitive   = true
}

variable "grafana_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "noip_username" {
  description = "No-IP account username (email)"
  type        = string
}

variable "noip_password" {
  description = "No-IP account password"
  type        = string
  sensitive   = true
}

variable "metrics_secret" {
  description = "Bearer token protecting the /metrics endpoint. Generate with: openssl rand -hex 32"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.metrics_secret) >= 16
    error_message = "metrics_secret must be at least 16 characters."
  }
}
