resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.environment}-marketplace-cloudvex-rds-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name        = "${var.environment}-marketplace-cloudvex-rds-subnet-group"
    Environment = var.environment
  }
}

resource "aws_db_instance" "marketplace_db" {
  identifier             = "${var.environment}-yuvro-marketplace-cloudvex-db"
  allocated_storage      = 20
  max_allocated_storage  = 50
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = var.db_instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  port                   = 5436
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = {
    Name        = "${var.environment}-marketplace-cloudvex-db"
    Environment = var.environment
    Project     = "yuvro-marketplace-cloudvex"
  }
}
