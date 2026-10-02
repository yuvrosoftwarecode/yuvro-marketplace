# Yuvro Marketplace CloudVex — DevOps Runbook

This document covers all infrastructure, deployment, and operational commands for the `yuvro-marketplace-cloudvex` platform.

---

## Prerequisites

Install these tools before running deployment commands:

| Tool | Install |
|------|---------|
| OpenTofu | https://opentofu.org/docs/intro/install/ |
| AWS CLI | `brew install awscli` |
| SSH Key | `~/.ssh/cloudvex-yuvro-dev.pem` (chmod 400) |
| GitHub SSH Deploy Key | `~/.ssh/cloudvex-yuvro-ec2-github` (or `~/.ssh/cloudvex-ec2-github`) |

Configure AWS credentials for CloudVex AWS Account:
```bash
aws configure
# Region: ap-south-1
```

---

## Infrastructure (OpenTofu)

All infrastructure code lives in `infra/opentofu/`. State is saved locally in `terraform.tfstate`.

### Initialize

```bash
cd infra/opentofu
tofu init
```

### Plan changes

```bash
cd infra/opentofu
tofu plan -var-file=dev.tfvars
```

### Apply changes

```bash
cd infra/opentofu
tofu apply -var-file=dev.tfvars
```

### View outputs

```bash
cd infra/opentofu
tofu output                                 # View all outputs
tofu output -raw app_node_public_ips        # EC2 Public IP
tofu output -raw marketplace_db_endpoint    # RDS Postgres Endpoint
```

---

## Deployment Commands

### Deploy to Dev Environment

```bash
# Deploy main branch to CloudVex dev EC2
DEPLOY_ENV=dev DEPLOY_BRANCH=main make install

# Or invoke deploy-dev script directly
bash infra/scripts/deploy-dev.sh main
```

### How Deploy Works

1. Checks local tool prerequisites (`tofu`, `aws`, `ssh`, `scp`) and AWS credentials.
2. Queries AWS CLI for running EC2 instance (`dev-yuvro-marketplace-cloudvex-ec2`).
3. If EC2 isn't running ➔ initializes and applies OpenTofu infrastructure in CloudVex AWS.
4. Reads OpenTofu outputs (RDS host, database credentials, S3 bucket name) and injects them into `backend/.env.dev-secrets`.
5. SCPs `.env.dev-secrets` files to the EC2 server (`/home/ubuntu/yuvro-marketplace-cloudvex/`).
6. SSHs into EC2 instance, clones or pulls latest git branch (`DEPLOY_BRANCH`).
7. Builds Docker images using BuildKit and launches containers with `docker compose -f docker-compose.dev.yml up -d --force-recreate`.
8. Runs Django database migrations.

---

## Remote Operations & Debugging

### SSH into EC2

```bash
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP>
```

### Check Container Status on EC2

```bash
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP> "docker ps"
```

### View Logs on EC2

```bash
# View backend logs
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP> \
  "cd yuvro-marketplace-cloudvex && docker compose -f docker-compose.dev.yml logs -f backend"

# View frontend logs
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP> \
  "cd yuvro-marketplace-cloudvex && docker compose -f docker-compose.dev.yml logs -f frontend"
```

### Run Django Management Commands on EC2

```bash
# Run migrations manually
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP> \
  "docker exec -it yuvro-marketplace-cloudvex-backend-dev python manage.py migrate"

# Create superuser
ssh -i ~/.ssh/cloudvex-yuvro-dev.pem ubuntu@<EC2_PUBLIC_IP> \
  "docker exec -it yuvro-marketplace-cloudvex-backend-dev python manage.py createsuperuser"
```
