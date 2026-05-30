#!/bin/bash
# bootstrap-secrets.sh — Provision secrets to a remote Pi / Linux host.
#
# Run this ONCE from your dev machine after cloning. Never commit .env.
#
# Usage:
#   ./tests/scripts/bootstrap-secrets.sh <host> [ssh-user] [ssh-port]
#
# Examples:
#   ./tests/scripts/bootstrap-secrets.sh openclaw-pi.local
#   ./tests/scripts/bootstrap-secrets.sh 192.168.1.42 pi 2222
#
# What it does:
#   1. Reads .env from the repo root (gitignored — you maintain it locally)
#   2. Validates no placeholder values remain
#   3. SCPs it to /opt/hvac-tests/tests/.env on the remote host
#   4. Verifies the file landed and is readable
#
# For multiple machines, run once per host:
#   for host in pi1 pi2 pi3; do ./tests/scripts/bootstrap-secrets.sh $host; done
#
# Rotating secrets:
#   Edit your local .env, then re-run this script for each affected host.
#   The next auto_deploy.sh cron run will pick up the updated file.
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

REMOTE_HOST="${1:-}"
SSH_USER="${2:-josh}"
SSH_PORT="${3:-22}"
REMOTE_DEST="/opt/hvac-tests/tests/.env"

# Locate repo root (works whether called from repo root or tests/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ENV="$REPO_ROOT/.env"

# ── Validate args ─────────────────────────────────────────────────────────────
if [ -z "$REMOTE_HOST" ]; then
    echo "Usage: $0 <host> [ssh-user] [ssh-port]"
    echo "  host      hostname or IP of the target Pi / Linux machine"
    echo "  ssh-user  SSH username (default: josh)"
    echo "  ssh-port  SSH port     (default: 22)"
    exit 1
fi

# ── Validate local .env ───────────────────────────────────────────────────────
if [ ! -f "$LOCAL_ENV" ]; then
    echo "ERROR: $LOCAL_ENV not found."
    echo "Copy tests/.env.example to .env at the repo root and fill in real values."
    exit 1
fi

PLACEHOLDERS=$(grep -c "replace-with-" "$LOCAL_ENV" || true)
if [ "$PLACEHOLDERS" -gt 0 ]; then
    echo "ERROR: $LOCAL_ENV still has $PLACEHOLDERS placeholder value(s):"
    grep "replace-with-" "$LOCAL_ENV"
    exit 1
fi

ENV_LINES=$(wc -l < "$LOCAL_ENV")
echo "Local .env validated: $ENV_LINES lines, no placeholders."

# ── Confirm before transmitting ───────────────────────────────────────────────
echo ""
echo "  Target : ${SSH_USER}@${REMOTE_HOST}:${SSH_PORT}"
echo "  Dest   : ${REMOTE_DEST}"
echo ""
read -r -p "Push secrets to ${REMOTE_HOST}? [y/N] " CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
    echo "Aborted."
    exit 0
fi

# ── Transfer ──────────────────────────────────────────────────────────────────
echo "Transferring .env ..."
scp -P "$SSH_PORT" "$LOCAL_ENV" "${SSH_USER}@${REMOTE_HOST}:${REMOTE_DEST}"

# ── Verify on remote ──────────────────────────────────────────────────────────
echo "Verifying on remote..."
REMOTE_LINES=$(ssh -p "$SSH_PORT" "${SSH_USER}@${REMOTE_HOST}" \
    "wc -l < '${REMOTE_DEST}' && grep -c 'replace-with-' '${REMOTE_DEST}' || echo 0")

echo "Remote $REMOTE_DEST: $REMOTE_LINES"
echo ""
echo "Done. The next auto_deploy.sh cron run will use the updated secrets."
