# Telemetry Schema & SQLite Database Init

## Type
AFK

## Assigned Agents
- `@agency-engineering-backend-architect` (schema design, index strategy)

## Reference Docs
- [ADR-0014: Real-Time Usage and Reliability Telemetry](../../docs/adr/0014-real-time-usage-and-reliability-telemetry.md)
- [PRD: Vertical Test Suite — Section 7 (Telemetry Schema)](../../docs/prd-vertical-test-suite.md)

## What to build

Create the SQLite database schema that all test suite components write to and read from. This is the shared data foundation — every other issue in this test suite depends on it existing first.

Three tables are required. The `telemetry_logs` table must be structurally identical to the ADR-0014 production schema so test telemetry and production telemetry are interchangeable:

```sql
-- ADR-0014 compliant (identical to production schema)
CREATE TABLE telemetry_logs (
  event_id     TEXT PRIMARY KEY,
  device_hash  TEXT NOT NULL,
  event_type   TEXT NOT NULL,  -- CONNECTIVITY | OCR | SYNC | LLM | HARDWARE
  event_name   TEXT NOT NULL,
  duration_ms  INTEGER,
  payload      TEXT NOT NULL,  -- JSON
  timestamp    TEXT NOT NULL   -- ISO8601 UTC, millisecond precision
);

-- Test run metadata (test-specific, not in production)
CREATE TABLE test_scenarios (
  scenario_id       TEXT PRIMARY KEY,
  run_id            TEXT NOT NULL,
  workflow          TEXT NOT NULL,      -- A | B | C | D
  network_cond      TEXT NOT NULL,
  power_state       TEXT NOT NULL,
  sensor_state      TEXT NOT NULL,
  ocr_path          TEXT NOT NULL,
  llm_path          TEXT NOT NULL,
  outcome           TEXT NOT NULL,      -- PASS | FAIL | ERROR
  failure_step      INTEGER,
  failure_reason    TEXT,
  total_duration_ms INTEGER NOT NULL,
  snapshot_id       TEXT,
  data_integrity    INTEGER NOT NULL,   -- 1 = correct, 0 = corruption detected
  created_at        TEXT NOT NULL
);

-- Agent hypothesis queue (discovery mechanism)
CREATE TABLE agent_hypotheses (
  hypothesis_id  TEXT PRIMARY KEY,
  proposed_by    TEXT NOT NULL,
  hypothesis_text TEXT NOT NULL,
  scenario_json  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED | RUNNING | COMPLETE | REJECTED
  evidence_query TEXT,
  evidence_result TEXT,
  test_result    TEXT,   -- CONFIRMED | REFUTED | INCONCLUSIVE
  created_at     TEXT NOT NULL,
  executed_at    TEXT
);
```

Deliver:
- `tests/db/schema.sql` — the CREATE TABLE + CREATE INDEX statements above
- `tests/db/init_db.py` — a Python script that creates the DB file at a configurable path (defaults to `/data/test_telemetry.db`) and applies the schema idempotently (`CREATE TABLE IF NOT EXISTS`)

## Acceptance criteria

- [ ] `tests/db/schema.sql` creates all 3 tables and all required indexes without error on a fresh SQLite file
- [ ] Indexes exist on: `telemetry_logs(event_type)`, `telemetry_logs(event_name)`, `telemetry_logs(timestamp)`, `test_scenarios(scenario_id)`, `test_scenarios(outcome)`, `test_scenarios(run_id)`
- [ ] `tests/db/init_db.py` is idempotent — running it twice on the same DB file does not error or duplicate tables
- [ ] `tests/db/init_db.py --path /custom/path/test.db` creates the DB at the specified path
- [ ] pytest tests pass: schema creates correctly, idempotent re-init succeeds, all 3 tables queryable

## Blocked by

None — can start immediately

## Labels
enhancement, ready-for-agent
