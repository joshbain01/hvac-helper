# Vertical Workflow Test Runner — Phase 1A (60 Scenarios)

## Type
AFK

## Assigned Agents
- `@agency-engineering-software-architect` (harness orchestration, data integrity validation)

## Reference Docs
- [PRD: Vertical Test Suite — Sections 4, 5, 11.1 (Workflows, Scenario Matrix, Requirements)](../../docs/prd-vertical-test-suite.md)
- [Prototype: logic-state](../../prototype/logic-state/) (snapshot state machine reference)
- [Prototype: logic-fsm-sync](../../prototype/logic-fsm-sync/) (cloud sync FSM reference)
- [Prototype: logic-ble-ota](../../prototype/logic-ble-ota/) (OTA transfer reference)

## What to build

The core test harness (`tests/harness/runner.py`) that drives complete user workflow scenarios end-to-end. This issue delivers a working Phase 1A run — 60 critical path scenarios that validate the harness infrastructure itself before scaling to the full 360.

The harness orchestrates three layers for each scenario:
1. **Device layer**: starts the mock BLE simulator (issues 0032/0033) with the scenario's `SimulatorConfig`
2. **App layer**: drives the mobile app's shared React Native logic through each workflow step
3. **Cloud layer**: validates the finalized snapshot arrives at the mock cloud API with correct values

**Per-scenario execution loop:**
```python
def run_scenario(scenario_path: str) -> ScenarioResult:
    config = load_scenario(scenario_path)
    device = MockESP32Device(config)
    app = MobileAppLogicDriver(config)

    device.start()
    app.connect_to(device)

    steps = get_workflow_steps(config.workflow)  # A, B, C, or D
    for step_num, step in enumerate(steps):
        try:
            step.execute(app, device)
        except StepFailure as e:
            return ScenarioResult(outcome="FAIL", failure_step=step_num, reason=str(e))

    integrity = validate_data_integrity(app.finalized_snapshot, config)
    outcome = "PASS" if integrity.valid else "FAIL"

    write_test_scenarios_row(config, outcome, integrity, elapsed_ms)
    return ScenarioResult(outcome=outcome, data_integrity=integrity.valid)
```

**Data integrity validation** (run after every scenario):
- Snapshot arrived at mock cloud API endpoint
- `Delta T = RA_temp - SA_temp` (correct to ±0.1°F)
- `Superheat = SL_pipe_temp - SL_sat_temp` (correct to ±0.1°F)
- `Subcooling = LL_sat_temp - LL_pipe_temp` (correct to ±0.1°F)
- No duplicate `snapshot_id` in the Outbox (idempotency check)
- For Workflow C: snapshot transitioned from Outbox → Synced after network restore

**CLI:**
```bash
python tests/harness/runner.py --phase 1a          # runs 60 critical path scenarios
python tests/harness/runner.py --phase 1b          # runs all 360 (issue 0036)
python tests/harness/runner.py --scenario <id>     # runs one scenario by ID
python tests/harness/runner.py --hypothesis <id>   # runs an agent-proposed hypothesis scenario
```

After completion, writes a summary Markdown report to `/data/reports/YYYY-MM-DD-phase1a.md`.

## Acceptance criteria

- [ ] Phase 1A (60 scenarios) completes without crashing in under 90 minutes
- [ ] Every scenario writes a `test_scenarios` row to SQLite with `outcome`, `failure_step`, `total_duration_ms`, and `data_integrity`
- [ ] Every scenario emits at minimum the ADR-0014 telemetry events listed in PRD Section 7.4
- [ ] Data integrity validator correctly catches a deliberately wrong Delta T calculation (pytest test)
- [ ] Duplicate `snapshot_id` in Outbox is caught and recorded as `outcome: FAIL` with `failure_reason: "idempotency_violation"`
- [ ] Workflow C scenarios that restore network after 2 hours correctly transition snapshot to `Synced`
- [ ] Run summary report is written to `/data/reports/` after completion
- [ ] `--scenario <id>` flag runs a single scenario in isolation (useful for debugging failures)

## Blocked by

- [0030 — Telemetry Schema & SQLite Database Init](./0030-telemetry-schema-db-init.md)
- [0031 — FastAPI Read-Only Query Middleware](./0031-fastapi-query-middleware.md)
- [0033 — Mock ESP32 BLE Simulator — Fault Injection](./0033-ble-simulator-fault-injection.md)
- [0034 — Scenario Matrix Generator](./0034-scenario-matrix-generator.md)
