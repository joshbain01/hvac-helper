#!/bin/bash
set -e

echo "=== Starting Raspberry Pi 5 HVAC Helper Test Suite Setup ==="

# Ensure the script is run from the root of the repository or from tests/
if [ -d "tests" ]; then
    REPO_ROOT=$(pwd)
elif [ -d "../tests" ]; then
    REPO_ROOT=$(dirname $(pwd))
else
    echo "Error: Please run this script from the root of the repository (/opt/hvac-tests)."
    exit 1
fi

echo "Repository root detected at $REPO_ROOT"

# 1. Install Docker Engine
if ! [ -x "$(command -v docker)" ]; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

# 2. Add current user to docker group
ACTUAL_USER="${SUDO_USER:-$(whoami)}"
if [ "$ACTUAL_USER" = "root" ]; then
    ACTUAL_USER=$(logname 2>/dev/null || echo "pi")
fi

if getent group docker >/dev/null; then
    echo "Adding '${ACTUAL_USER}' user to docker group..."
    sudo usermod -aG docker "${ACTUAL_USER}" || true
fi

# 3. Create required directories
echo "Creating data and logs directories..."
sudo mkdir -p /opt/hvac-tests/data/
sudo mkdir -p /var/log/hvac-tests/
sudo chown -R 1000:1000 /opt/hvac-tests/data/
sudo chown -R 1000:1000 /var/log/hvac-tests/

# 4. Set up .env files
echo "Setting up environment variables..."
if [ ! -f "$REPO_ROOT/.env" ]; then
    echo "Creating root .env file from tests/.env.example..."
    sudo cp "$REPO_ROOT/tests/.env.example" "$REPO_ROOT/.env"
    sudo chown 1000:1000 "$REPO_ROOT/.env"
fi

# Halt if placeholders are still present
if grep -q "replace-with-secure-random-token" "$REPO_ROOT/.env"; then
    echo "=========================================================="
    echo "🚨 ERROR: Default placeholders detected in $REPO_ROOT/.env!"
    echo "Please edit the .env file and configure your API_BEARER_TOKEN and OPENROUTER_API_KEY."
    echo "Run this setup script again once configured."
    echo "=========================================================="
    exit 1
fi

if [ ! -f "$REPO_ROOT/tests/.env" ]; then
    echo "Copying .env to tests/ directory..."
    sudo cp "$REPO_ROOT/.env" "$REPO_ROOT/tests/.env"
    sudo chown 1000:1000 "$REPO_ROOT/tests/.env"
fi

# 5. Build and spin up API
echo "Building containers and starting hvac-api..."
cd "$REPO_ROOT/tests"
sudo docker compose build hvac-api hvac-harness
sudo docker compose up -d hvac-api

# 6. Initialize database schema
echo "Initializing database..."
sudo docker compose run --rm hvac-harness python db/init_db.py

# 7. Configure crontabs
echo "Configuring daily and weekly cron jobs..."
sudo tee /etc/cron.d/hvac-test-suite << EOF
# Run Phase 1A (60 scenarios) weekdays at 06:00
0 6 * * 1-5 ${ACTUAL_USER} cd $REPO_ROOT/tests && docker compose run --rm hvac-harness python harness/test_runner.py --phase 1a >> /var/log/hvac-tests/daily.log 2>&1

# Run full 360 scenarios every Saturday at 06:00
0 6 * * 6 ${ACTUAL_USER} cd $REPO_ROOT/tests && docker compose run --rm hvac-harness python harness/test_runner.py --phase 1b >> /var/log/hvac-tests/weekly.log 2>&1

# AI analysis runs 30 minutes after daily suite
30 6 * * 1-5 ${ACTUAL_USER} cd $REPO_ROOT/tests && docker compose run --rm hvac-harness python analysis/agent_analysis.py >> /var/log/hvac-tests/analysis.log 2>&1
EOF

echo "=== Raspberry Pi Setup Completed Successfully ==="
