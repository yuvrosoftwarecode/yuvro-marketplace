#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source shared deploy library
source "$SCRIPT_DIR/lib/deploy-common.sh"

BRANCH="${1:-${DEPLOY_BRANCH:-main}}"
ensure_infra_and_deploy "$BRANCH"
