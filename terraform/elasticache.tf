# ── ElastiCache Redis ─────────────────────────────────────
# BUG FIX: aws_elasticache_cluster does NOT support auth_token + TLS.
# auth_token requires aws_elasticache_replication_group even for
# single-node deployments. Using cluster resource silently drops the
# auth_token or throws a provider error depending on version.
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "penwave-redis-${var.environment}"
  description          = "Penwave Redis cache - ${var.environment}"

  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  num_cache_clusters   = 1         # single node - cost-optimised
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.elasticache.id]

  # Encryption - both required when auth_token is set
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 3
  snapshot_window          = "04:00-05:00"

  # Prevent accidental deletion
  apply_immediately = true

  tags = { Name = "penwave-redis-${var.environment}" }
}
