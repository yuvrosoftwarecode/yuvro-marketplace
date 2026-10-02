resource "aws_s3_bucket" "marketplace_storage" {
  bucket        = "${var.environment}-yuvro-marketplace-cloudvex-storage"
  force_destroy = false

  tags = {
    Name        = "${var.environment}-yuvro-marketplace-cloudvex-storage"
    Environment = var.environment
    Project     = "yuvro-marketplace-cloudvex"
  }
}

resource "aws_s3_bucket_public_access_block" "marketplace_storage_block" {
  bucket = aws_s3_bucket.marketplace_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_user" "marketplace_storage_user" {
  name = "${var.environment}-yuvro-marketplace-storage-user"

  tags = {
    Name        = "${var.environment}-yuvro-marketplace-storage-user"
    Environment = var.environment
    Project     = "yuvro-marketplace-cloudvex"
  }
}

resource "aws_iam_user_policy" "marketplace_storage_policy" {
  name = "${var.environment}-yuvro-marketplace-storage-policy"
  user = aws_iam_user.marketplace_storage_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:ListBucketMultipartUploads"
        ]
        Resource = aws_s3_bucket.marketplace_storage.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:AbortMultipartUpload",
          "s3:ListMultipartUploadParts"
        ]
        Resource = "${aws_s3_bucket.marketplace_storage.arn}/*"
      }
    ]
  })
}

resource "aws_iam_access_key" "marketplace_storage_key" {
  user = aws_iam_user.marketplace_storage_user.name
}

