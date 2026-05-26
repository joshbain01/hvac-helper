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

1. Clone or copy the project files to the Pi.
2. Run the automated setup script:
   ```bash
   chmod +x scripts/setup_pi.sh
   ./scripts/setup_pi.sh
   ```
3. Update the generated `.env` file at `/opt/hvac-tests/.env` with your actual OpenRouter keys and tokens:
   ```env
   API_BEARER_TOKEN=secure-auth-token-here
   OPENROUTER_API_KEY=your-openrouter-key-here
   KIMI_MODEL=moonshotai/kimi-k2.5
   DB_PATH=/data/test_telemetry.db
   ```

## CLI Usage Guide

You can run individual scenarios, hypotheses, or full suite phases directly:

```bash
# Run Phase 1A (60 critical path scenarios) sequentially
python harness/runner.py --phase 1a

# Run Phase 1B (all 360 scenarios) in parallel with worker pool
python harness/runner.py --phase 1b

# Run a specific scenario by scenario_id
python harness/runner.py --scenario <scenario_id>

# Run a specific agent-proposed hypothesis
python harness/runner.py --hypothesis <hypothesis_id>
```

## Running the Automated Test Suite

To run all pytest tests verifying the API middleware, simulator, scenario generator, and harness:

```bash
python -m pytest tests/
```
