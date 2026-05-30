#!/bin/bash
# HVAC Helper Auto-Deployment Script
set -e

# Log file
LOG_FILE="/var/log/hvac-tests/auto_deploy.log"
exec >> $LOG_FILE 2>&1

echo "=========================================================="
echo "[$(date)] Starting auto-deployment sequence..."

REPO_DIR="/opt/hvac-tests"
cd $REPO_DIR

# Pull latest changes from git
echo "[$(date)] Fetching latest changes..."
git fetch origin main
git reset --hard origin/main

# Rebuild and restart docker containers
echo "[$(date)] Rebuilding and spinning up containers..."
cd $REPO_DIR/tests
docker compose up -d --build

echo "[$(date)] Deployment successful!"
echo "=========================================================="
