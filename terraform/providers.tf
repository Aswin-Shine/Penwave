terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state backend — prevents local state conflicts when CI and
  # developers both run terraform apply.
  #
  # One-time bootstrap (run once manually before first terraform init):
  #   aws s3api create-bucket --bucket penwave-terraform-state --region us-east-1
  #   aws s3api put-bucket-versioning \
  #     --bucket penwave-terraform-state \
  #     --versioning-configuration Status=Enabled
  #   aws dynamodb create-table \
  #     --table-name penwave-terraform-locks \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH \
  #     --billing-mode PAY_PER_REQUEST \
  #     --region us-east-1
  #
  # After bootstrapping: terraform init -migrate-state
  backend "s3" {
    bucket       = "penwave-terraform-state"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "penwave"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
