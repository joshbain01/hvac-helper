#!/bin/bash
# HVAC Helper Auto-Deployment Script
set -e

# Ensure binaries like git and docker are in the PATH when run via cron
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin

# Log file
LOG_FILE="/var/log/hvac-tests/auto_deploy.log"
exec >> $LOG_FILE 2>&1

echo "=========================================================="
echo "[$(date)] Starting auto-deployment sequence..."

REPO_DIR="/opt/hvac-tests"
cd $REPO_DIR

# Pull latest changes from git
echo "[$(date)] Fetching latest changes..."
git fetch origin
git reset --hard origin/main

# Rebuild and restart docker containers
echo "[$(date)] Rebuilding and spinning up containers..."
cd $REPO_DIR/tests
docker compose up -d --build

echo "[$(date)] Deployment successful!"
echo "=========================================================="
