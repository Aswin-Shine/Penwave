# ── VPC ──────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "penwave-vpc-${var.environment}" }
}

# ── Internet Gateway ──────────────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "penwave-igw-${var.environment}" }
}

# ── Public Subnet (EC2) ───────────────────────────────────
# trivy:ignore:AWS-0164 -- this instance IS the public-facing entry point
# (no ALB or NAT in front of it). A public IP here is the architecture, not
# an oversight. Ingress is still locked down separately: only 80/443 open
# broadly, SSH restricted to a single IP (see security-groups.tf).
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "penwave-public-${var.environment}" }
}

# ── Private Subnets (RDS + ElastiCache need 2 AZs) ────────
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_a
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = { Name = "penwave-private-a-${var.environment}" }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_b
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = { Name = "penwave-private-b-${var.environment}" }
}

# ── Route Table — Public ──────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "penwave-rt-public-${var.environment}" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ── Subnet Groups ─────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "penwave-db-subnet-group-${var.environment}"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags       = { Name = "penwave-db-subnet-group" }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "penwave-cache-subnet-group-${var.environment}"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  tags       = { Name = "penwave-cache-subnet-group" }
}

# ── Data Sources ──────────────────────────────────────────
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
