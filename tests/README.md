# HVAC Helper Pro: Vertical Test Suite & AI-Driven Observability

This directory contains the automated vertical workflow test suite and AI-driven observability pipeline for the HVAC Helper Pro IoT device and client application.

## Directory Structure

- `api/`: FastAPI query and ingestion middleware.
- `db/`: Schema definition and DB initialization for test telemetry database (SQLite).
- `harness/`: Core scenario runner driving virtual devices and mobile client state machine.
- `scenarios/`: Combinatoric scenario matrix generator producing all 360 target scenarios.
- `simulator/`: BLE GATT peripheral simulator with packet drop, RF interference, NVS cache state, and sensor fault injection.
- `analysis/`: Daily AI analysis pipeline summarizing failed scenarios and proposing test hypotheses.
- `scripts/`: Provisioning scripts for physical deployment on the Raspberry Pi 5.

## Installation & Raspberry Pi Setup

To deploy the test suite onto a Raspberry Pi 5:

1. **Clone the repository** onto your Raspberry Pi:
   ```bash
   git clone https://github.com/joshbain01/hvac-helper.git
   cd hvac-helper
   ```

2. **Run the automated setup script** (must be run from the repository root):
   ```bash
   chmod +x tests/scripts/setup_pi.sh
   ./tests/scripts/setup_pi.sh
   ```
   *Note: This script will install Docker (if missing), copy application code to `/opt/hvac-tests/`, generate the `.env` file, build containers, initialize the database schema, and set up daily/weekly crontab entries.*

3. **Update the generated `.env` file** at `/opt/hvac-tests/.env` with your OpenRouter credentials and bearer token:
   ```bash
   sudo nano /opt/hvac-tests/.env
   ```
   Provide your values for the environment variables:
   ```env
   API_BEARER_TOKEN=your-secure-auth-token-here
   OPENROUTER_API_KEY=your-openrouter-api-key-here
   KIMI_MODEL=moonshotai/kimi-k2.5
   DB_PATH=/data/test_telemetry.db
   ```

---

## Docker Compose CLI Guide (Raspberry Pi)

All tests, runners, and scripts should be run from `/opt/hvac-tests` using `docker compose`:

```bash
# Navigate to the deployment directory
cd /opt/hvac-tests

# 1. Run Phase 1A (60 critical path scenarios) sequentially
docker compose run --rm hvac-harness python runner.py --phase 1a

# 2. Run Phase 1B (all 360 scenarios) in parallel
docker compose run --rm hvac-harness python runner.py --phase 1b

# 3. Run a specific scenario by scenario_id
docker compose run --rm hvac-harness python runner.py --scenario <scenario_id>

# 4. Trigger the Kimi daily failure analysis pipeline manually
docker compose run --rm hvac-harness python agent_analysis.py

# 5. Generate the Weekly HTML summary report dashboard
docker compose run --rm hvac-harness python scripts/generate_report.py

# 6. Run the CLI infrastructure health check tool
docker compose run --rm hvac-harness python scripts/health_check.py
```

### Checking Logs and Services
- To view logs of the running FastAPI database middleware: `docker compose logs hvac-api`
- To stop the API container: `docker compose down`
- To restart all background services: `docker compose up -d`

---

## Local Development CLI Guide (Non-Docker)

If you are developing locally or testing outside of Docker on a host system with python installed:

```bash
# Run Phase 1A locally
python harness/runner.py --phase 1a

# Run all pytest test files (API, BLE Simulator, Matrix, Pipeline, and Scripts)
python -m pytest tests/
```
