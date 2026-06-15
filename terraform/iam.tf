# ── IAM Role for EC2 ─────────────────────────────────────
# Grants EC2 instance identity — used for S3 access and SSM Session Manager.
# No static AWS credentials needed on the instance.
resource "aws_iam_role" "ec2" {
  name = "penwave-ec2-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

# ── S3 Media Policy ───────────────────────────────────────
resource "aws_iam_role_policy" "ec2_s3" {
  name = "penwave-ec2-s3-${var.environment}"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "MediaBucketReadWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      }
    ]
  })
}

# ── SSM Session Manager (no need to open SSH for debugging) ─
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "penwave-ec2-profile-${var.environment}"
  role = aws_iam_role.ec2.name
}
