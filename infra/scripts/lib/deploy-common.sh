#!/bin/bash
# deploy-common.sh — shared library for yuvro-marketplace deployment scripts

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"; }
print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error()   { echo -e "${RED}  ✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
print_info()    { echo -e "${CYAN}  ℹ $1${NC}"; }
print_step()    { echo -e "${BOLD}  › $1${NC}"; }

# ── timing ───────────────────────────────────────────────────────────────────
DEPLOY_START_TIME=$(date +%s)
elapsed()       { local s=$(( $(date +%s) - DEPLOY_START_TIME )); printf "%dm%02ds" $(( s/60 )) $(( s%60 )); }

# ── config ───────────────────────────────────────────────────────────────────
export AWS_PROFILE="${AWS_PROFILE:-cloudvex-yuvro-marketplace}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/cloudvex-yuvro-dev.pem}"
KEY_PAIR_NAME="${KEY_PAIR_NAME:-cloudvex-yuvro-dev}"
MAX_RETRIES="${MAX_RETRIES:-60}"
RETRY_DELAY="${RETRY_DELAY:-10}"
OPENTOFU_DIR="${OPENTOFU_DIR:-$PROJECT_ROOT/infra/opentofu}"

_get_tofu_raw() {
    local key="$1"
    (
        cd "$OPENTOFU_DIR" 2>/dev/null || exit 1
        local out
        out="$(tofu output -raw "$key" 2>/dev/null)" || true
        if [ -n "$out" ] && [ "$out" != "None" ]; then
            if ! echo "$out" | grep -qiE "error|warning|problem|\.\.\."; then
                echo "$out" | tr -d '\r\n'
                return 0
            fi
        fi
        echo ""
    )
}

_set_kv() {
    local f="$1" key="$2" value="$3"
    [ -z "$value" ] && return 0
    value="$(echo "$value" | tr '\r\n' '  ' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    [ -z "$value" ] && return 0
    [ ! -f "$f" ]   && touch "$f"
    python3 -c "
import sys
f_path, k, v = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(f_path, 'r', encoding='utf-8') as fp:
        lines = fp.read().splitlines()
except FileNotFoundError:
    lines = []

found = False
new_lines = []
for line in lines:
    if line.startswith(f'{k}='):
        new_lines.append(f'{k}={v}')
        found = True
    else:
        new_lines.append(line)

if not found:
    new_lines.append(f'{k}={v}')

with open(f_path, 'w', encoding='utf-8') as fp:
    fp.write('\n'.join(new_lines) + '\n')
" "$f" "$key" "$value"
}

ssh_ec2()  { ssh  -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ServerAliveInterval=60 -o ServerAliveCountMax=30 "$@"; }
scp_ec2()  { scp  -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$@"; }

# ── pre-flight ─────────────────────────────────────────────────────────────────
check_prerequisites() {
    print_header "Checking Prerequisites"
    local missing=0
    for tool in tofu aws ssh scp; do
        command -v $tool &>/dev/null && print_success "$tool found" || { print_error "$tool not installed"; missing=1; }
    done
    aws sts get-caller-identity &>/dev/null \
        && print_success "AWS Account: $(aws sts get-caller-identity --query Account --output text)" \
        || { print_error "AWS credentials not configured — run: aws configure"; missing=1; }
    if [ $missing -eq 1 ]; then print_error "Fix missing tools and retry"; exit 1; fi
}

check_aws_setup() {
    print_header "Checking AWS Setup"
    if aws ec2 describe-key-pairs --key-names "$KEY_PAIR_NAME" --region "$AWS_REGION" &>/dev/null 2>&1; then
        print_success "EC2 key pair '$KEY_PAIR_NAME' exists in AWS"
    else
        print_warning "EC2 key pair '$KEY_PAIR_NAME' does not exist in AWS — creating automatically..."
        mkdir -p "$(dirname "$SSH_KEY_PATH")"
        aws ec2 create-key-pair --key-name "$KEY_PAIR_NAME" --region "$AWS_REGION" --query 'KeyMaterial' --output text > "$SSH_KEY_PATH"
        chmod 400 "$SSH_KEY_PATH"
        print_success "Created key pair '$KEY_PAIR_NAME' in AWS and saved to $SSH_KEY_PATH"
    fi

    if [ ! -f "$SSH_KEY_PATH" ]; then
        print_error "SSH key file not found: $SSH_KEY_PATH"
        exit 1
    fi
    print_success "SSH key exists: $SSH_KEY_PATH"
}

# ── opentofu ──────────────────────────────────────────────────────────────────
init_opentofu() {
    print_header "Initializing OpenTofu"
    cd "$OPENTOFU_DIR"
    [ -d ".terraform" ] && print_warning "Already initialized" || tofu init
    cd "$PROJECT_ROOT"
}

plan_deployment() {
    print_header "Planning Infrastructure"
    local tfvars="$OPENTOFU_DIR/dev.tfvars"
    local tfplan="$OPENTOFU_DIR/tfplan"
    [ -f "$tfvars" ] || { print_error "Missing: $tfvars"; exit 1; }
    cd "$OPENTOFU_DIR"
    tofu plan -var-file="$tfvars" -out="$tfplan"
    print_success "Plan saved"
    cd "$PROJECT_ROOT"
}

apply_deployment() {
    print_header "Applying Infrastructure"
    local tfplan="$OPENTOFU_DIR/tfplan"
    [ -f "$tfplan" ] || { print_error "No plan file — run plan first"; exit 1; }
    cd "$OPENTOFU_DIR"
    tofu apply "$tfplan"
    print_success "Infrastructure deployed"
    cd "$PROJECT_ROOT"
}

get_instance_ip() {
    print_info "Fetching EC2 IP..." >&2
    local ip=""
    if [ -f "$OPENTOFU_DIR/terraform.tfstate" ]; then
        ip="$(_get_tofu_raw app_node_public_ips)"
    fi

    if [ -z "$ip" ] || [ "$ip" = "None" ]; then
        local retries=0
        while [ -z "$ip" ] && [ $retries -lt $MAX_RETRIES ]; do
            ip=$(aws ec2 describe-instances \
                --region "$AWS_REGION" \
                --filters "Name=tag:Name,Values=dev-yuvro-marketplace-cloudvex-ec2" "Name=instance-state-name,Values=running" \
                --query 'Reservations[0].Instances[0].PublicIpAddress' --output text 2>/dev/null || true)
            [ "$ip" = "None" ] && ip=""
            if [ -z "$ip" ]; then
                retries=$((retries+1))
                print_info "Waiting... ($retries/$MAX_RETRIES)" >&2
                sleep $RETRY_DELAY
            fi
        done
    fi
    [ -z "$ip" ] && { print_error "Could not get EC2 IP" >&2; exit 1; }
    print_success "EC2 IP: $ip" >&2
    echo "$ip"
}

wait_for_ssh() {
    local ip=$1
    print_header "Waiting for SSH"
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        ssh_ec2 -o ConnectTimeout=5 "ubuntu@$ip" "echo ok" &>/dev/null \
            && { print_success "SSH ready"; return 0; }
        retries=$((retries+1))
        print_info "Not ready... ($retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done
    print_error "SSH unavailable"; exit 1
}

wait_for_docker() {
    local ip=$1
    print_header "Waiting for Docker"
    local retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        ssh_ec2 -o ConnectTimeout=5 "ubuntu@$ip" \
            "docker info &>/dev/null && echo ok" 2>/dev/null | grep -q ok \
            && { print_success "Docker ready"; return 0; }
        retries=$((retries+1))
        print_info "Not ready... ($retries/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    done
    print_error "Docker unavailable"; exit 1
}

# ── secrets wiring ─────────────────────────────────────────────────────────────
wire_secrets() {
    local tfvars="$OPENTOFU_DIR/dev.tfvars"

    if [ ! -f "$OPENTOFU_DIR/terraform.tfstate" ] && [ ! -d "$OPENTOFU_DIR/.terraform" ]; then
        print_warning "OpenTofu state not available locally — keeping existing secrets files"
        return 0
    fi

    print_step "Reading OpenTofu outputs..."
    S3_BUCKET="$(_get_tofu_raw marketplace_storage_bucket_name)"
    DB_ENDPOINT="$(_get_tofu_raw marketplace_db_endpoint)"
    DB_NAME="$(_get_tofu_raw marketplace_db_name)"
    DB_USER="$(_get_tofu_raw marketplace_db_username)"
    DB_HOST="$(echo "$DB_ENDPOINT" | cut -d: -f1)"
    DB_PASS="$(grep '^db_password' "$tfvars" 2>/dev/null | cut -d= -f2- | tr -d ' "'"'")"

    local backend_secrets="$PROJECT_ROOT/backend/.env.dev-secrets"
    local frontend_secrets="$PROJECT_ROOT/frontend/.env.dev-secrets"

    if [ -n "$DB_HOST" ]; then
        _set_kv "$backend_secrets" "DATABASE_URL" "postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:5436/${DB_NAME}"
        _set_kv "$backend_secrets" "DB_HOST" "$DB_HOST"
        _set_kv "$backend_secrets" "DB_PORT" "5436"
        _set_kv "$backend_secrets" "DB_NAME" "$DB_NAME"
        _set_kv "$backend_secrets" "DB_USER" "$DB_USER"
        _set_kv "$backend_secrets" "DB_PASSWORD" "$DB_PASS"
        print_success "Backend RDS wired: $DB_HOST/$DB_NAME"
    fi

    if [ -n "$S3_BUCKET" ]; then
        _set_kv "$backend_secrets" "AWS_STORAGE_BUCKET_NAME" "$S3_BUCKET"
        print_success "S3 Bucket wired: $S3_BUCKET"
    fi

    local s3_key_id="$(_get_tofu_raw marketplace_storage_access_key_id)"
    local s3_secret_key="$(_get_tofu_raw marketplace_storage_secret_access_key)"
    if [ -n "$s3_key_id" ] && [ "$s3_key_id" != "None" ]; then
        _set_kv "$backend_secrets" "AWS_ACCESS_KEY_ID" "$s3_key_id"
        _set_kv "$backend_secrets" "AWS_SECRET_ACCESS_KEY" "$s3_secret_key"
        print_success "S3 IAM credentials wired"
    fi
}

copy_secrets_to_ec2() {
    local ip=$1
    print_step "Copying environment & secret files to EC2..."
    for sf in backend/.env.dev backend/.env.dev-secrets frontend/.env.dev frontend/.env.dev-secrets; do
        local local_path="$PROJECT_ROOT/$sf"
        if [ -f "$local_path" ]; then
            ssh_ec2 "ubuntu@$ip" "mkdir -p /home/ubuntu/yuvro-marketplace-cloudvex/$(dirname "$sf")"
            scp_ec2 "$local_path" "ubuntu@$ip:/home/ubuntu/yuvro-marketplace-cloudvex/$sf"
            print_success "Copied $sf"
        else
            print_warning "Not found locally: $local_path (skipping)"
        fi
    done
}

# ── core deploy ───────────────────────────────────────────────────────────────
run_deploy() {
    local ip="$1" repo_url="$2" branch="${3:-main}"

    print_header "Deploying [yuvro-marketplace-cloudvex] on branch [$branch]"

    # Check for CloudVex-Yuvro or fallback GitHub deploy key
    local github_key=""
    for k in "$HOME/.ssh/cloudvex-yuvro-ec2-github" "$HOME/.ssh/cloudvex-ec2-github" "$HOME/.ssh/ycode-ec2-github" "$HOME/.ssh/id_rsa"; do
        if [ -f "$k" ]; then github_key="$k"; break; fi
    done

    if [ -n "$github_key" ]; then
        print_step "Copying GitHub deploy key ($github_key)..."
        scp_ec2 "$github_key" "ubuntu@$ip:/home/ubuntu/.ssh/github_deploy_key"
    fi

    wire_secrets

    ssh_ec2 "ubuntu@$ip" bash << DEPLOY_EOF
set -e
T0=\$(date +%s)
elapsed_s() { echo "\$(( \$(date +%s) - T0 ))s"; }

if [ -f /home/ubuntu/.ssh/github_deploy_key ]; then
    chmod 600 /home/ubuntu/.ssh/github_deploy_key
    cat > /home/ubuntu/.ssh/config << 'SSHCFG'
Host github.com
  HostName github.com
  User git
  IdentityFile /home/ubuntu/.ssh/github_deploy_key
  StrictHostKeyChecking no
SSHCFG
    chmod 600 /home/ubuntu/.ssh/config
fi

echo "── git: branch=$branch ─────────────────────────────"
T1=\$(date +%s)
cd /home/ubuntu
if [ -d /home/ubuntu/yuvro-marketplace-cloudvex/.git ]; then
    cd yuvro-marketplace-cloudvex
    git fetch origin
    git checkout -- . 2>/dev/null || true
    git checkout "$branch"
    git pull origin "$branch"
else
    rm -rf /home/ubuntu/yuvro-marketplace-cloudvex
    git clone -b "$branch" "$repo_url" yuvro-marketplace-cloudvex && cd yuvro-marketplace-cloudvex
fi
echo "   ✓ git [elapsed \$(( \$(date +%s)-T1 ))s]"
DEPLOY_EOF

    copy_secrets_to_ec2 "$ip"

    ssh_ec2 "ubuntu@$ip" bash << DEPLOY_EOF
set -e
T0=\$(date +%s)
elapsed_s() { echo "\$(( \$(date +%s) - T0 ))s"; }
cd /home/ubuntu/yuvro-marketplace-cloudvex

echo "── docker build ────────────────────────────────────"
T1=\$(date +%s)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export CACHEBUST=\$(date +%s)

if [ -f frontend/.env.dev ]; then
    set -a
    source frontend/.env.dev
    set +a
fi

docker compose -f docker-compose.dev.yml build --build-arg BUILDKIT_INLINE_CACHE=1

echo "── docker up ───────────────────────────────────────"
docker network create yuvro-marketplace-cloudvex-dev 2>/dev/null || true

# Use dev-ymarketplace compose for EC2 (uses RDS, no local DB)
if [ -f docker-compose.dev-ymarketplace.yml ]; then
    docker compose -f docker-compose.dev-ymarketplace.yml up -d --remove-orphans --force-recreate
else
    # Fallback to docker-compose.dev.yml if in local dev environment
    docker compose -f docker-compose.dev.yml up -d --remove-orphans --force-recreate
fi

echo "── status ──────────────────────────────────────────"
if [ -f docker-compose.dev-ymarketplace.yml ]; then
    docker compose -f docker-compose.dev-ymarketplace.yml ps
else
    docker compose -f docker-compose.dev.yml ps
fi

echo ""
echo "✅ Deployment complete! [total \$(elapsed_s)]"
DEPLOY_EOF

    setup_nginx "$ip"

    print_success "Deployment complete [total elapsed: $(elapsed)]"
}

setup_nginx() {
    local ip="$1"
    print_step "Setting up Nginx & SSL for marketplace.yuvro.ai & backend-marketplace.yuvro.ai..."

    if [ -f "$PROJECT_ROOT/frontend/nginx.ec2.conf" ]; then
        scp_ec2 "$PROJECT_ROOT/frontend/nginx.ec2.conf" "ubuntu@$ip:/tmp/yuvro-marketplace.conf"
    fi

    ssh_ec2 "ubuntu@$ip" bash << 'NGINX_EOF'
set -e
if ! command -v nginx &>/dev/null; then
    sudo apt-get update -q
    sudo apt-get install -y nginx certbot python3-certbot-nginx -q
fi
sudo mkdir -p /var/www/certbot
sudo rm -f /etc/nginx/sites-enabled/default
if [ -f /tmp/yuvro-marketplace.conf ]; then
    sudo mv /tmp/yuvro-marketplace.conf /etc/nginx/sites-available/yuvro-marketplace.conf
    sudo ln -sf /etc/nginx/sites-available/yuvro-marketplace.conf /etc/nginx/sites-enabled/yuvro-marketplace.conf
fi
sudo nginx -t && sudo systemctl reload nginx || sudo systemctl restart nginx

DOMAINS=("marketplace.yuvro.ai" "backend-marketplace.yuvro.ai")
CERT_EMAIL="admin@yuvro.ai"

for domain in "${DOMAINS[@]}"; do
    if [ ! -d "/etc/letsencrypt/live/$domain" ]; then
        echo "🔐 Requesting SSL certificate for $domain..."
        sudo certbot --nginx -d "$domain" --non-interactive --agree-tos --email "$CERT_EMAIL" --redirect || true
    fi
done

sudo nginx -t && sudo systemctl reload nginx
NGINX_EOF
    print_success "Nginx & SSL configured"
}

ensure_infra_and_deploy() {
    local branch="${1:-main}"

    REPO_URL=$(git -C "$PROJECT_ROOT" remote get-url origin 2>/dev/null || echo "")
    [ -z "$REPO_URL" ] && { print_error "Not a git repo or no origin remote"; exit 1; }
    print_success "Repo: $REPO_URL"
    print_success "Branch: $branch"

    check_prerequisites
    check_aws_setup

    local ip=""
    if [ -f "$OPENTOFU_DIR/terraform.tfstate" ]; then
        cd "$OPENTOFU_DIR"
        ip=$(tofu output -raw app_node_public_ips 2>/dev/null || echo "")
        cd "$PROJECT_ROOT" >/dev/null
    fi
    [ "$ip" = "None" ] && ip=""

    if [ -z "$ip" ]; then
        ip=$(aws ec2 describe-instances \
            --region "$AWS_REGION" \
            --filters "Name=tag:Name,Values=dev-yuvro-marketplace-cloudvex-ec2" "Name=instance-state-name,Values=running" \
            --query 'Reservations[0].Instances[0].PublicIpAddress' \
            --output text 2>/dev/null || echo "")
        [ "$ip" = "None" ] && ip=""
    fi

    if [ -n "$ip" ]; then
        print_warning "EC2 already running at $ip — skipping infra provisioning"
    else
        init_opentofu
        plan_deployment
        if [ "${DEPLOY_CONFIRM:-}" = "yes" ]; then
            print_info "Auto-confirming infra creation (DEPLOY_CONFIRM=yes)"
        else
            read -p "Create AWS infrastructure? (yes/no) " -r; echo
            [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]] || { print_info "Cancelled"; exit 0; }
        fi
        apply_deployment
        ip=$(get_instance_ip)
    fi

    wait_for_ssh    "$ip"
    wait_for_docker "$ip"
    run_deploy      "$ip" "$REPO_URL" "$branch"
}
