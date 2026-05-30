#!/bin/bash
# HVAC Helper Auto-Deployment Script
# Runs every 5 min via cron. Pulls origin/main and rebuilds Docker containers
# only when there are new commits. All output goes to LOG_FILE.
#
# Fixes addressed:
#   - set -euo pipefail: fail loudly, not silently
#   - Lock file: prevents overlapping runs if docker build is slow
#   - git safe.directory: prevents "dubious ownership" failure on fresh clones
#   - Skip-if-no-change: compares HEAD to origin/main before rebuilding
#   - docker compose down before up: releases port bindings from prior runs
#   - Structured log levels with timestamps

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
export PATH=/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin

REPO_DIR="/opt/hvac-tests"
LOG_FILE="/var/log/hvac-tests/auto_deploy.log"
LOCK_FILE="/tmp/hvac-deploy.lock"
GIT_REMOTE="origin"
GIT_BRANCH="main"

# ── Logging ───────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] [INFO]  $*" >> "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] [WARN]  $*" >> "$LOG_FILE"; }
err()  { echo "[$(date '+%Y-%m-%d %H:%M:%S %Z')] [ERROR] $*" >> "$LOG_FILE"; }

# Capture all unhandled stderr into the log as well
exec 2>> "$LOG_FILE"

# ── Lock: prevent overlapping runs ───────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE")
    if kill -0 "$LOCK_PID" 2>/dev/null; then
        warn "Previous deploy (PID $LOCK_PID) still running — skipping."
        exit 0
    else
        warn "Stale lock found (PID $LOCK_PID) — removing."
    fi
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ── Main ──────────────────────────────────────────────────────────────────────
log "========== Deploy start (PID $$) =========="

# Guard: prevent "dubious ownership" git failure when directory owner differs
git config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true

cd "$REPO_DIR"

# Snapshot HEAD before fetch to detect whether anything changed
BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

log "Fetching from ${GIT_REMOTE}/${GIT_BRANCH}..."
if ! git fetch "$GIT_REMOTE" "$GIT_BRANCH" >> "$LOG_FILE" 2>&1; then
    err "git fetch failed — check network connectivity and remote access."
    exit 1
fi

REMOTE=$(git rev-parse "${GIT_REMOTE}/${GIT_BRANCH}" 2>/dev/null || echo "unknown")

if [ "$BEFORE" = "$REMOTE" ]; then
    log "No changes (HEAD=${BEFORE:0:8}) — skipping rebuild."
    log "========== Deploy skipped =========="
    exit 0
fi

log "Change detected: ${BEFORE:0:8} → ${REMOTE:0:8}"
git reset --hard "${GIT_REMOTE}/${GIT_BRANCH}" >> "$LOG_FILE" 2>&1
log "Repo updated to $(git rev-parse --short HEAD)."

# ── Secrets: decrypt .env.enc → tests/.env ───────────────────────────────────
# .env.enc is committed (AES256-GCM encrypted with age).
# Each Pi has its own age key at ~/.config/sops/age/keys.txt, registered in
# .sops.yaml. git reset --hard keeps .env.enc current; we decrypt fresh here.
ENV_ENC="$REPO_DIR/tests/.env.enc"
ENV_FILE="$REPO_DIR/tests/.env"
AGE_KEY="$HOME/.config/sops/age/keys.txt"

if [ ! -f "$AGE_KEY" ]; then
    err "Age key not found at $AGE_KEY — run the Ansible playbook to provision this Pi."
    exit 1
fi

if [ ! -f "$ENV_ENC" ]; then
    err "Missing $ENV_ENC — check that secrets were committed to the repo."
    exit 1
fi

log "Decrypting secrets..."
if ! SOPS_AGE_KEY_FILE="$AGE_KEY" sops --decrypt \
        --input-type dotenv --output-type dotenv \
        "$ENV_ENC" > "$ENV_FILE" 2>> "$LOG_FILE"; then
    err "sops decrypt failed — this Pi's age key may not be registered in .sops.yaml."
    err "Run: tests/scripts/add-pi-key.sh <this-host> from your dev machine."
    rm -f "$ENV_FILE"
    exit 1
fi

if grep -q "replace-with-" "$ENV_FILE"; then
    err "$ENV_FILE still contains placeholder values — edit real values via: sops tests/.env.enc"
    rm -f "$ENV_FILE"
    exit 1
fi
log "Secrets decrypted ($(grep -c '=' "$ENV_FILE") vars)."

# ── Docker rebuild ────────────────────────────────────────────────────────────
log "Rebuilding containers..."
cd "$REPO_DIR/tests"

# Bring down first to release port bindings from any prior partial run
if ! docker compose down --remove-orphans >> "$LOG_FILE" 2>&1; then
    warn "docker compose down reported errors — continuing anyway."
fi

if ! docker compose up -d --build >> "$LOG_FILE" 2>&1; then
    err "docker compose up failed."
    exit 1
fi

log "Containers running:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" >> "$LOG_FILE" 2>&1

log "========== Deploy successful: $(git -C "$REPO_DIR" rev-parse --short HEAD) =========="
