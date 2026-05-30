#!/bin/bash
# add-pi-key.sh — Register a new Pi's age key into .sops.yaml and re-encrypt.
#
# Run this from your dev machine AFTER running the Ansible playbook on the Pi.
# The playbook generates an age key on the Pi and prints the public key.
# This script automates the registration step.
#
# Usage:
#   ./tests/scripts/add-pi-key.sh <pi-host> [ssh-user] [ssh-port]
#
# Example:
#   ./tests/scripts/add-pi-key.sh pi-lab-01.local
#   ./tests/scripts/add-pi-key.sh 192.168.1.11 josh 22

set -euo pipefail

REMOTE_HOST="${1:-}"
SSH_USER="${2:-josh}"
SSH_PORT="${3:-22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SOPS_YAML="$REPO_ROOT/.sops.yaml"
ENV_ENC="$REPO_ROOT/tests/.env.enc"
AGE_KEY="$HOME/.config/sops/age/keys.txt"

if [ -z "$REMOTE_HOST" ]; then
    echo "Usage: $0 <pi-host> [ssh-user] [ssh-port]"
    exit 1
fi

# ── Fetch Pi's public key ─────────────────────────────────────────────────────
echo "Fetching age public key from ${SSH_USER}@${REMOTE_HOST}..."
PI_PUBKEY=$(ssh -p "$SSH_PORT" "${SSH_USER}@${REMOTE_HOST}" \
    "grep 'public key:' ~/.config/sops/age/keys.txt | awk '{print \$NF}'")

if [ -z "$PI_PUBKEY" ]; then
    echo "ERROR: Could not retrieve age public key from ${REMOTE_HOST}."
    echo "Make sure the Ansible playbook has run on this host first."
    exit 1
fi

echo "  Pi pubkey: $PI_PUBKEY"

# ── Check if already registered ──────────────────────────────────────────────
if grep -q "$PI_PUBKEY" "$SOPS_YAML"; then
    echo "Key already in .sops.yaml — nothing to do."
    exit 0
fi

# ── Append to .sops.yaml ──────────────────────────────────────────────────────
# The age: field is a comma-separated string; append with a comma
CURRENT_KEYS=$(grep "^    age:" "$SOPS_YAML" | sed 's/    age: //')
NEW_KEYS="${CURRENT_KEYS},${PI_PUBKEY}"

sed -i "s|^    age: .*|    age: ${NEW_KEYS}|" "$SOPS_YAML"

echo "Updated .sops.yaml with key for ${REMOTE_HOST}."

# ── Re-encrypt with the new key set ──────────────────────────────────────────
echo "Re-encrypting tests/.env.enc with updated key set..."
SOPS_AGE_KEY_FILE="$AGE_KEY" sops updatekeys --yes "$ENV_ENC"

echo ""
echo "Done. Now commit and push:"
echo "  git add .sops.yaml tests/.env.enc"
echo "  git commit -m 'feat(infra): add age key for ${REMOTE_HOST}'"
echo "  git push"
echo ""
echo "The next auto_deploy.sh cron run on all Pis will decrypt with the updated file."
