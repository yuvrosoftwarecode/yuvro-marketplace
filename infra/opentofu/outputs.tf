output "app_node_public_ips" {
  value       = aws_eip.marketplace_eip.public_ip
  description = "Public IP address of Marketplace EC2 instance"
}

output "marketplace_db_endpoint" {
  value       = aws_db_instance.marketplace_db.endpoint
  description = "Marketplace RDS PostgreSQL endpoint"
}

output "marketplace_db_name" {
  value       = aws_db_instance.marketplace_db.db_name
  description = "Marketplace RDS Database name"
}

output "marketplace_db_username" {
  value       = aws_db_instance.marketplace_db.username
  description = "Marketplace RDS Master username"
  sensitive   = true
}

output "marketplace_storage_bucket_name" {
  value       = aws_s3_bucket.marketplace_storage.id
  description = "S3 storage bucket name"
}

output "marketplace_storage_access_key_id" {
  value       = aws_iam_access_key.marketplace_storage_key.id
  description = "IAM Access Key ID for Marketplace S3 storage"
}

output "marketplace_storage_secret_access_key" {
  value       = aws_iam_access_key.marketplace_storage_key.secret
  description = "IAM Secret Access Key for Marketplace S3 storage"
  sensitive   = true
}

