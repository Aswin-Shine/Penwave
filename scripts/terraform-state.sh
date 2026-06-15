# scripts/bootstrap-terraform-state.sh
# Run once per AWS account. Never run again.
aws s3api create-bucket \
  --bucket penwave-terraform-state \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket penwave-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket penwave-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'