# Kimi K2.5 Daily Analysis Pipeline + Budget Guard

## Type
AFK

## Assigned Agents
- `@agency-engineering-ai-engineer` (LLM integration, structured output parsing, budget enforcement)

## Reference Docs
- [PRD: Vertical Test Suite — Section 10 (Agent Discovery System), Section 11.4](../../docs/prd-vertical-test-suite.md)
- [ADR-0014: Real-Time Usage and Reliability Telemetry](../../docs/adr/0014-real-time-usage-and-reliability-telemetry.md)

## What to build

An automated analysis script (`tests/analysis/agent_analysis.py`) that runs after each daily test suite via cron. It queries the FastAPI middleware for failures, sends the data to Kimi K2.5 via OpenRouter, and stores the results — including any new test hypotheses the agent proposes.

**Pipeline sequence:**
```
1. Read spend_log.json → abort if monthly spend would exceed $20 ceiling
2. GET /runs → fetch latest run summary
3. POST /query → fetch all FAIL scenarios from latest run
4. POST /query → for each FAIL, fetch its telemetry_logs events
5. Submit bundle to Kimi K2.5 (max_tokens: 1500, temperature: 0.2)
6. Parse structured JSON response
7. Execute follow_up_queries via POST /query
8. Submit hypotheses via POST /hypotheses
9. Write /data/reports/YYYY-MM-DD.json + /data/reports/YYYY-MM-DD.md
10. Append token usage to spend_log.json
```

**Kimi system prompt** (use verbatim — do not paraphrase):
```
You are an expert QA analyst for an IoT hardware product. You receive telemetry from automated test scenarios and must identify:
1. Anomalous patterns that will affect real technicians in the field
2. Correlations between environmental conditions (BLE signal strength, power state, sensor faults) and failure outcomes
3. New test hypotheses to validate

You must respond ONLY with valid JSON in this exact structure:
{
  "anomalies": [
    { "title": "string (max 80 chars)", "description": "string (max 200 chars)", "affected_scenarios": ["id1"], "severity": "CRITICAL|HIGH|MEDIUM|LOW", "user_impact": "string (max 150 chars)" }
  ],
  "follow_up_queries": [
    { "description": "string", "sql": "SELECT ..." }
  ],
  "hypotheses": [
    { "hypothesis_text": "string (max 300 chars)", "scenario_json": { "workflow": "B", "network_cond": "...", "power_state": "...", "sensor_state": "...", "ocr_path": "...", "llm_path": "...", "repeat_count": 20 } }
  ]
}
```

**OpenRouter config** (load from environment variables, never hardcode):
```python
KIMI_CONFIG = {
    "model": "moonshotai/kimi-k2.5",  # from KIMI_MODEL env var
    "max_tokens": 1500,               # CRITICAL: verbosity tax mitigation
    "temperature": 0.2,
    "base_url": "https://openrouter.ai/api/v1",
}
```

**Budget guard** (`tests/analysis/spend_log.json`):
```json
{ "month": "2026-05", "total_usd": 1.24, "runs": [ { "date": "2026-05-25", "input_tokens": 8420, "output_tokens": 1102, "cost_usd": 0.047 } ] }
```
If `total_usd + estimated_run_cost > 20.00`, skip LLM call, log warning to stderr, write a report noting analysis was skipped, exit 0.

## Acceptance criteria

- [ ] Script connects to FastAPI middleware at `localhost:8080` using `API_BEARER_TOKEN` from `.env`
- [ ] Budget guard halts execution (exit 0, no API call) when `spend_log.json` shows $19.50 spent
- [ ] Budget warning is printed to stderr at $18.00 (90% ceiling)
- [ ] Kimi receives the failure bundle and returns valid JSON matching the required structure
- [ ] Malformed or non-JSON response from Kimi is caught, logged, and does not crash the script
- [ ] All `follow_up_queries` are executed via `POST /query` and results appended to the report
- [ ] All `hypotheses` are submitted via `POST /hypotheses` and confirmed with HTTP 201
- [ ] Daily report is written to both `/data/reports/YYYY-MM-DD.json` and `/data/reports/YYYY-MM-DD.md`
- [ ] Token usage and cost are appended to `spend_log.json` after every successful run
- [ ] pytest tests pass for: budget halt, JSON parse error handling, hypothesis submission flow

## Blocked by

- [0030 — Telemetry Schema & SQLite Database Init](./0030-telemetry-schema-db-init.md)
- [0031 — FastAPI Read-Only Query Middleware](./0031-fastapi-query-middleware.md)

## Labels
enhancement, ready-for-agent

