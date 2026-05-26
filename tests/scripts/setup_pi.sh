#!/bin/bash
set -e

echo "=== Starting Raspberry Pi 5 HVAC Helper Test Suite Setup ==="

# 1. Install Docker Engine
if ! [ -x "$(command -v docker)" ]; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
else
    echo "Docker is already installed."
fi

# 2. Add pi user to docker group
if getent group docker >/dev/null; then
    echo "Adding 'pi' user to docker group..."
    sudo usermod -aG docker pi || true
fi

# 3. Create required directories
echo "Creating data and logs directories..."
sudo mkdir -p /opt/hvac-tests/data/
sudo mkdir -p /var/log/hvac-tests/
sudo chown -R 1000:1000 /opt/hvac-tests/data/
sudo chown -R 1000:1000 /var/log/hvac-tests/

# 4. Copy tests directory to /opt/hvac-tests/
echo "Copying application code..."
sudo mkdir -p /opt/hvac-tests/
# Assuming setup script is executed from tests/ or root
if [ -d "tests" ]; then
    sudo cp -r tests/* /opt/hvac-tests/
else
    sudo cp -r * /opt/hvac-tests/
fi

# Copy shared dependencies into harness/ and api/ build contexts
echo "Bundling docker contexts..."
sudo mkdir -p /opt/hvac-tests/harness/db
sudo mkdir -p /opt/hvac-tests/harness/simulator
sudo mkdir -p /opt/hvac-tests/harness/scenarios
sudo mkdir -p /opt/hvac-tests/harness/tests

sudo cp -r /opt/hvac-tests/db/* /opt/hvac-tests/harness/db/
sudo cp -r /opt/hvac-tests/simulator/* /opt/hvac-tests/harness/simulator/
sudo cp -r /opt/hvac-tests/scenarios/* /opt/hvac-tests/harness/scenarios/
sudo cp -r /opt/hvac-tests/analysis/agent_analysis.py /opt/hvac-tests/harness/agent_analysis.py
sudo cp -r /opt/hvac-tests/* /opt/hvac-tests/harness/tests/

sudo mkdir -p /opt/hvac-tests/api/db
sudo cp -r /opt/hvac-tests/db/* /opt/hvac-tests/api/db/
sudo mkdir -p /opt/hvac-tests/api/tests
sudo cp -r /opt/hvac-tests/* /opt/hvac-tests/api/tests/

# Create .env from .env.example if it doesn't exist
if [ ! -f "/opt/hvac-tests/.env" ]; then
    echo "Creating .env file..."
    sudo cp /opt/hvac-tests/.env.example /opt/hvac-tests/.env
    sudo chown 1000:1000 /opt/hvac-tests/.env
fi

# 5. Build and spin up API
echo "Building containers and starting hvac-api..."
cd /opt/hvac-tests
sudo docker compose build
sudo docker compose up -d hvac-api

# 6. Initialize database schema
echo "Initializing database..."
sudo docker compose run --rm hvac-harness python db/init_db.py

# 7. Configure crontabs
echo "Configuring daily and weekly cron jobs..."
sudo tee /etc/cron.d/hvac-test-suite << 'EOF'
# Run Phase 1A (60 scenarios) weekdays at 06:00
0 6 * * 1-5 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python runner.py --phase 1a >> /var/log/hvac-tests/daily.log 2>&1

# Run full 360 scenarios every Saturday at 06:00
0 6 * * 6 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python runner.py --phase 1b >> /var/log/hvac-tests/weekly.log 2>&1

# AI analysis runs 30 minutes after daily suite
30 6 * * 1-5 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python agent_analysis.py >> /var/log/hvac-tests/analysis.log 2>&1
EOF

echo "=== Raspberry Pi Setup Completed Successfully ==="
