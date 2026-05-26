# FastAPI Read-Only Query Middleware

## Type
AFK

## Assigned Agents
- `@agency-engineering-backend-architect` (API design, security enforcement)

## Reference Docs
- [PRD: Vertical Test Suite — Section 8 (FastAPI Middleware Specification)](../../docs/prd-vertical-test-suite.md)
- [ADR-0014: Real-Time Usage and Reliability Telemetry](../../docs/adr/0014-real-time-usage-and-reliability-telemetry.md)

## What to build

A lightweight FastAPI server (`tests/api/main.py`) that exposes the SQLite telemetry database to remote agents over HTTPS. This is the interface through which AI agents (Kimi K2.5, VS Code Copilot) query test results and submit new hypotheses.

The server enforces read-only access — agents can query the database but cannot write to it directly. All writes go through the test harness only.

**Endpoints:**
```
GET  /schema        → Full SQLite table schema as JSON (for agent introspection)
GET  /scenarios     → Paginated list of scenarios with outcome summary
GET  /runs          → List of run summaries grouped by run_id
GET  /hypotheses    → List of all agent hypotheses and their status
POST /query         → Execute a read-only SQL SELECT query
POST /hypotheses    → Agent submits a new scenario hypothesis for next batch
```

**POST /query request/response:**
```json
// Request
{ "sql": "SELECT scenario_id, outcome FROM test_scenarios WHERE outcome = 'FAIL' LIMIT 20", "description": "Recent failures" }

// Response
{ "rows": [...], "row_count": 17, "execution_ms": 8, "schema_version": "1.0.0" }
```

**POST /hypotheses request:**
```json
{
  "proposed_by": "kimi-k2.5",
  "hypothesis_text": "RF interference + deep sleep causes NVS corruption in 15% of cases",
  "scenario_json": { "workflow": "B", "network_cond": "NET_RF_INTERFERENCE", "power_state": "PWR_SLEEP_1", "sensor_state": "SENS_NORMAL", "ocr_path": "OCR_SUCCESS", "llm_path": "LLM_SUCCESS", "repeat_count": 50 },
  "evidence_query": "SELECT COUNT(*) FROM telemetry_logs WHERE ...",
  "evidence_result": { "count": 14 }
}
```

**Security requirements (all mandatory):**
- Bearer token auth on every endpoint (token from `.env` `API_BEARER_TOKEN`)
- `POST /query`: `SELECT`-only enforcement — reject `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ATTACH`, `PRAGMA` with HTTP 403
- `POST /query`: max 1,000 rows returned, 5-second execution timeout (408 on timeout)
- Rate limiting: max 60 requests/minute per client IP
- DB connection is opened read-only (`sqlite3.connect(uri=True)` with `?mode=ro`)

## Acceptance criteria

- [ ] `GET /schema` returns all 3 table definitions as structured JSON without auth → returns 401
- [ ] `POST /query` with valid Bearer token and `SELECT` query returns rows + row_count + execution_ms
- [ ] `POST /query` with `INSERT` statement returns HTTP 403
- [ ] `POST /query` with `DROP TABLE` returns HTTP 403
- [ ] `POST /query` exceeding 5-second execution returns HTTP 408
- [ ] `POST /hypotheses` with valid `scenario_json` returns 201 and writes to `agent_hypotheses` table
- [ ] `POST /hypotheses` with invalid `scenario_json` dimension value (e.g. `"workflow": "Z"`) returns 422
- [ ] Rate limiter blocks request 61+ from the same IP within 60 seconds with HTTP 429
- [ ] Server starts successfully with `uvicorn tests.api.main:app --host 0.0.0.0 --port 8080`

## Blocked by

- [0030 — Telemetry Schema & SQLite Database Init](./0030-telemetry-schema-db-init.md)
