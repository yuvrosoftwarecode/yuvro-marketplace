variable "aws_region" {
  type        = string
  default     = "ap-south-1"
  description = "AWS region"
}

variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment"
}

variable "key_name" {
  type        = string
  default     = "cloudvex-yuvro-dev"
  description = "EC2 key pair name in CloudVex AWS account"
}

variable "instance_type" {
  type        = string
  default     = "t3.medium"
  description = "EC2 instance type"
}

variable "db_name" {
  type        = string
  default     = "yuvro_marketplace_cloudvex_db"
  description = "RDS Database name"
}

variable "db_username" {
  type        = string
  default     = "marketplace_admin"
  description = "RDS Master username"
}

variable "db_password" {
  type        = string
  default     = "ChangeMe123!DevPassword"
  description = "RDS Master password"
  sensitive   = true
}

variable "db_instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "RDS instance class"
}
