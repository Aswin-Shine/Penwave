# ── RDS PostgreSQL ────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier = "penwave-postgres-${var.environment}"

  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = 100 # Auto-scaling cap
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # No public access — only reachable from EC2 via private subnet
  publicly_accessible = false

  # Multi-AZ: enabled in prod for HA, disabled in dev to save cost
  multi_az = false

  # Backups: 30 days in prod, 7 days in dev, was incorrectly 0 (no recovery path)
  backup_retention_period = 0
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  deletion_protection = true # prevents accidental destroy

  # Performance Insights (free tier: 7 days retention)
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  skip_final_snapshot       = false
  final_snapshot_identifier = "penwave-final-snapshot-${var.environment}"

  tags = { Name = "penwave-postgres-${var.environment}" }
}

# ── RDS Enhanced Monitoring Role ─────────────────────────
resource "aws_iam_role" "rds_monitoring" {
  name = "penwave-rds-monitoring-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
