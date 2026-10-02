terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ── Data sources ─────────────────────────────────────────────────────────────
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ── Security Group ────────────────────────────────────────────────────────────
resource "aws_security_group" "marketplace_sg" {
  name        = "${var.environment}-yuvro-marketplace-cloudvex-sg"
  description = "Security group for Yuvro Marketplace CloudVex EC2 and services"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP / HTTPS
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Direct service ports for dev
  ingress {
    from_port   = 8004
    to_port     = 8004
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3004
    to_port     = 3004
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All egress allowed
  egress {
    from_port   = 0
    to_port     = 0
    protocol    ="-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-marketplace-cloudvex-sg"
    Environment = var.environment
    Project     = "yuvro-marketplace-cloudvex"
  }
}

resource "aws_security_group" "rds_sg" {
  name        = "${var.environment}-yuvro-marketplace-cloudvex-rds-sg"
  description = "Security group for Yuvro Marketplace CloudVex RDS"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5436
    to_port         = 5436
    protocol        = "tcp"
    security_groups = [aws_security_group.marketplace_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-marketplace-cloudvex-rds-sg"
    Environment = var.environment
    Project     = "yuvro-marketplace-cloudvex"
  }
}
