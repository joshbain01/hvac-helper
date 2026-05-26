-- ADR-0014 compliant (identical to production schema)
CREATE TABLE IF NOT EXISTS telemetry_logs (
  event_id     TEXT PRIMARY KEY,
  device_hash  TEXT NOT NULL,
  event_type   TEXT NOT NULL,  -- CONNECTIVITY | OCR | SYNC | LLM | HARDWARE
  event_name   TEXT NOT NULL,
  duration_ms  INTEGER,
  payload      TEXT NOT NULL,  -- JSON
  timestamp    TEXT NOT NULL   -- ISO8601 UTC, millisecond precision
);

-- Test run metadata (test-specific, not in production)
CREATE TABLE IF NOT EXISTS test_scenarios (
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
CREATE TABLE IF NOT EXISTS agent_hypotheses (
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

-- Indexing strategies
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_event_type ON telemetry_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_event_name ON telemetry_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_timestamp ON telemetry_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_scenario_id ON test_scenarios(scenario_id);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_outcome ON test_scenarios(outcome);
CREATE INDEX IF NOT EXISTS idx_test_scenarios_run_id ON test_scenarios(run_id);
