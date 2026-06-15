aws_region    = "us-east-1"
environment   = "dev"

vpc_cidr              = "10.1.0.0/16"
public_subnet_cidr    = "10.1.1.0/24"
private_subnet_cidr_a = "10.1.2.0/24"
private_subnet_cidr_b = "10.1.3.0/24"

ec2_instance_type = "t3.micro"  # cheaper for dev
ec2_key_pair_name = "your-keypair-name"
ssh_allowed_cidr  = "0.0.0.0/0"

db_instance_class    = "db.t3.micro"
db_name              = "penwave_dev"
db_username          = "penwave"
db_password          = "devpassword123"
db_allocated_storage = 20

redis_node_type  = "cache.t3.micro"
redis_auth_token = "devredistoken123456"

s3_media_bucket_name = "penwave-media-dev-YOURNAME"

dockerhub_username = "your-dockerhub-username"
app_image_tag      = "main"
domain_name        = "penwave.ddns.net"

jwt_access_secret  = "dev-jwt-access-secret-at-least-32-characters"
jwt_refresh_secret = "dev-jwt-refresh-secret-at-least-32-characters"
cookie_secret      = "dev-cookie-secret-32chars"
grafana_password   = "devgrafana123"
noip_username      = "YOUR_NOIP_EMAIL"
noip_password      = "YOUR_NOIP_PASSWORD"
