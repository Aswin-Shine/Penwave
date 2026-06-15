output "elastic_ip" {
  description = "Elastic IP — point No-IP A record to this"
  value       = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

# BUG FIX: was aws_elasticache_cluster.redis.cache_nodes[0].address
# Switched to replication_group primary endpoint.
output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 media bucket name"
  value       = aws_s3_bucket.media.bucket
}

output "s3_bucket_arn" {
  description = "S3 media bucket ARN"
  value       = aws_s3_bucket.media.arn
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "app_urls" {
  description = "Application URLs after DNS propagation"
  value = {
    app     = "https://${var.domain_name}"
    api     = "https://api.${var.domain_name}"
    grafana = "https://grafana.${var.domain_name}"
  }
}

output "ssh_command" {
  description = "SSH command to connect to EC2"
  value       = "ssh -i ~/.ssh/${var.ec2_key_pair_name}.pem ec2-user@${aws_eip.app.public_ip}"
}
