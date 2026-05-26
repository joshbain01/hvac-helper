# PRD: HVAC Helper — Vertical Test Suite & AI-Driven Observability Platform

**Status**: Draft  
**Date**: 2026-05-25  
**Author**: AgentsOrchestrator (via `/grill-me` session)  
**Depends On**: [ADR-0014 Real-Time Telemetry](../docs/adr/0014-real-time-usage-and-reliability-telemetry.md), [PRD v2](../docs/PRD.md)

---

## 1. Problem Statement

The current prototype suite validates isolated design questions through interactive simulations. There is no automated, repeatable, evidence-producing test infrastructure that:

- Exercises complete user workflows end-to-end
- Runs the full combinatoric space of environmental edge cases
- Stores structured results in a queryable format
- Enables AI agents to mine data for anomalies and propose new test hypotheses

Without this, the Closed Beta (July–August 2026) ships with untested failure modes in BLE sync recovery, Outbox idempotency, and OTA rollback — risks that surface as data loss or bricked devices in the field.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target | Window |
|------|--------|--------|--------|
| Beta safety | Zero data-loss bugs in field | 0 Outbox corruption events | 60 days post-Beta launch |
| Coverage | Scenario pass rate | ≥ 95% of 360 scenarios pass before Beta | Week 3 gate |
| Anomaly detection | Agent-discovered issues before Beta | ≥ 3 novel edge cases surfaced by agents | Pre-Beta |
| Cost | Monthly AI analysis spend | ≤ $20/month | Ongoing |
| Observability | Telemetry completeness | Every scenario emits ADR-0014 compliant events | From Week 1 |

---

## 3. Non-Goals

- This is **not** a hardware durability test suite (salt-spray, 100k-cycle mechanical tests — post-Beta)
- This is **not** a load/performance test suite (database scaling under 10k technicians — post-Beta)
- This does **not** replace field Beta feedback — it prepares the product to survive Beta
- This does **not** test the physical ESP32 silicon — it simulates device behavior in software

---

## 4. Core Concept: Vertical Workflow Scenarios

### 4.1 Philosophy

Tests are structured as **complete user journeys** (vertical slices), not isolated component tests. Each scenario exercises the full stack — device simulation → mobile app → cloud API — under a specific combination of environmental conditions.

A scenario is defined by:

```
scenario = workflow × network_condition × power_state × sensor_state × ocr_path × llm_path
```

The test harness runs each scenario, emits ADR-0014 telemetry events throughout, stores results in SQLite, and exposes them to AI agents via a FastAPI query interface for analysis.

### 4.2 User Workflows

**Workflow A — Diagnostic-Only**  
Technician captures Before Set measurements only, submits as `DIAGNOSTIC_COMPLETE`.

```
Steps:
1. Device wakes from deep sleep (GPIO interrupt)
2. Technician presses RA → SA → OA → DA buttons (temp/humidity captured)
3. Turns SL encoder → pushes to capture suction pipe temp + saturation
4. Turns LL encoder → pushes to capture liquid pipe temp + saturation
5. Mobile app assembles Before Set Draft
6. Technician taps "Submit (Diagnostic)"
7. App validates Before Set completeness
8. Snapshot transitions: Draft → Finalized → Outbox
9. BLE sync to device confirms receipt
10. App uploads snapshot to cloud API
```

**Workflow B — Full Repair Cycle** _(Primary — highest risk)_  
Technician captures full Before + After sets with OCR, LLM notes, and consumables.

```
Steps:
1. Device wakes from deep sleep
2. BEFORE/AFTER switch set to BEFORE
3. All 6 Before Set data points captured (buttons + encoders)
4. Mobile: Camera OCR scan of equipment service tag
5. Mobile: Technician dictates service notes
6. On-device LLM expands notes to professional description
7. LLM parses notes → prompts for consumables confirmation
8. BEFORE/AFTER switch toggled to AFTER
9. All 6 After Set data points captured
10. App calculates deltas (Delta T, Superheat, Subcooling before/after)
11. Technician taps "Submit (Completed)"
12. Snapshot transitions: Draft → Finalized → Outbox
13. BLE retransmission of all cached values triggered by AFTER switch toggle
14. App uploads snapshot + media attachments to cloud API
15. Cloud fires ServiceTitan/Housecall Pro parts-order trigger
```

**Workflow C — Offline Capture + Delayed Sync** _(Critical — Outbox risk)_  
Technician completes Workflow B with no network at finalization time.

```
Steps 1–12: Same as Workflow B
13. Network unavailable at step 13
14. App queues Finalized snapshot in Outbox (SQLite persistence)
15. App retries sync every 60 seconds (background worker)
16. [DELAY: 0–2 hours depending on scenario parameter]
17. Network becomes available
18. Outbox worker detects connectivity
19. App uploads queued snapshot (idempotency key validated server-side)
20. Snapshot transitions: Outbox → Synced
21. Cloud fires CRM trigger
```

**Workflow D — Revision / Correction** _(Post-Beta priority)_  
Technician realizes a finalized snapshot has an error, creates a corrected revision.

```
Steps:
1. Technician opens previously Synced snapshot in app
2. Taps "Create Revision"
3. App clones all parent snapshot data (measurements + calculations)
4. Technician corrects specific field (e.g., model number from OCR error)
5. New snapshot created with incremented revision_number + parent_id link
6. Revision transitions: Draft → Finalized → Outbox → Synced
7. Cloud stores revision as new audit record (parent preserved)
```

---

## 5. Scenario Matrix (360 Scenarios)

Each scenario is a combination of one value from each dimension:

### Dimension 1: Network Condition (5 values)
| Code | Description |
|------|-------------|
| `NET_NORMAL` | Full bandwidth, <50ms latency |
| `NET_LOSS_5` | 5% BLE packet loss injected at the mock device |
| `NET_LOSS_20` | 20% BLE packet loss injected |
| `NET_OFFLINE_2H` | App goes fully offline at Outbox queue time for 2 hours |
| `NET_RF_INTERFERENCE` | RSSI injected at -90dBm; BLE reconnects 3 times before success |

### Dimension 2: Power State (3 values)
| Code | Description |
|------|-------------|
| `PWR_CONTINUOUS` | Device stays awake throughout capture |
| `PWR_SLEEP_1` | Device enters deep sleep once (between Before and After capture) |
| `PWR_SLEEP_3` | Device enters deep sleep 3 times; NVS cache must survive each |

### Dimension 3: Sensor State (4 values)
| Code | Description |
|------|-------------|
| `SENS_NORMAL` | All sensors reading nominal values |
| `SENS_SHT40_DRIFT` | SHT40 ±5°F drift injected; affects RA, SA readings |
| `SENS_CLAMP_DISCONNECTED` | SL clamp probe disconnected; LED fault state expected |
| `SENS_BOTH_FAULT` | SHT40 drift + clamp disconnected simultaneously |

### Dimension 4: OCR Path (2 values)
| Code | Description |
|------|-------------|
| `OCR_SUCCESS` | OCR correctly extracts model + serial from tag image |
| `OCR_BYPASS` | OCR fails; technician manually types model + serial |

### Dimension 5: LLM Path (3 values)
| Code | Description |
|------|-------------|
| `LLM_SUCCESS` | On-device LLM successfully expands notes |
| `LLM_OOM` | On-device LLM hits OOM limit; app falls back to cloud |
| `LLM_CLOUD_FALLBACK` | On-device model not available; cloud API used from the start |

### Total: 5 × 3 × 4 × 2 × 3 = **360 scenarios per workflow**

### Execution Phasing

| Phase | Scenarios | When | Purpose |
|-------|-----------|------|---------|
| **1A — Harness Validation** | 60 (critical path) | Week 1 | Validate test infrastructure works |
| **1B — Full Battery** | 360 nightly | Weeks 2–3 | Surface anomalies before Beta |
| **2 — Agent-Extended** | 360 + agent-proposed | Post-Beta | Continuous hardening |

**Phase 1A selection** — 60 scenarios covering:
- All 5 network conditions × Workflow B × `PWR_CONTINUOUS` × `SENS_NORMAL` × `OCR_SUCCESS` × `LLM_SUCCESS` (5 scenarios)
- All 3 power states × Workflow C × `NET_NORMAL` × `SENS_NORMAL` × `OCR_SUCCESS` × `LLM_SUCCESS` (3 scenarios)
- Complete 6×6 fault matrix: all `SENS_*` × all `NET_*` × Workflow B × `PWR_CONTINUOUS` × `OCR_SUCCESS` × `LLM_SUCCESS` (20 scenarios)
- Full LLM fallback paths: all 3 LLM × 2 OCR × Workflow B × remaining (12 scenarios)
- Offline sync edge cases: Workflow C × `NET_OFFLINE_2H` × all power states × `SENS_NORMAL` × both OCR (6 scenarios)
- OTA rollback safety: Workflow B mid-capture interrupt × `NET_LOSS_20` × `PWR_SLEEP_1` (14 scenarios to total 60)

---

## 6. Infrastructure Architecture

### 6.1 Physical Infrastructure

**Raspberry Pi 5** running Docker Engine with three containers managed by Docker Compose:

| Container | Image | Purpose |
|-----------|-------|---------|
| `hvac-harness` | Python 3.12-slim | Test harness + BLE simulator (Bleak) |
| `hvac-api` | Python 3.12-slim | FastAPI middleware (port 8080, persistent) |
| Shared volume | `/opt/hvac-tests/data` | SQLite telemetry DB + reports (bind mount) |

```
┌─────────────────────────────────────────────────────┐
│                  Raspberry Pi 5                      │
│                                                      │
│  ┌──── Docker Compose ───────────────────────────┐  │
│  │                                               │  │
│  │  ┌───────────────────┐  ┌──────────────────┐  │  │
│  │  │  hvac-harness     │  │  hvac-api        │  │  │
│  │  │  (test runner     │  │  (FastAPI        │  │  │
│  │  │  + BLE sim)       │  │  port 8080)      │  │  │
│  │  └────────┬──────────┘  └────────┬─────────┘  │  │
│  │           │                      │             │  │
│  │           └──────────┬───────────┘             │  │
│  │                      ▼                         │  │
│  │          ┌───────────────────────┐             │  │
│  │          │  /data volume         │             │  │
│  │          │  test_telemetry.db    │             │  │
│  │          │  reports/             │             │  │
│  │          └───────────────────────┘             │  │
│  └───────────────────────────────────────────────┘  │
│                                    │                 │
└────────────────────────────────────┼─────────────────┘
                                     │ HTTPS
                              ┌──────▼──────┐
                              │ AI Agents   │
                              │ (VS Code,   │
                              │  Kimi K2.5) │
                              └─────────────┘
```

**Docker Compose file**: `tests/docker-compose.yml`

```yaml
services:
  hvac-harness:
    build: ./harness
    volumes:
      - test-data:/data
      - /var/run/dbus:/var/run/dbus  # BLE access on Pi
    privileged: true                  # Required for Bleak BLE on Linux
    env_file: .env
    profiles: [run]

  hvac-api:
    build: ./api
    ports:
      - "8080:8080"
    volumes:
      - test-data:/data:ro            # Read-only DB access
    env_file: .env
    restart: unless-stopped

volumes:
  test-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/hvac-tests/data
```

### 6.2 Cron Schedule

The cron triggers `docker compose run` against the harness container. The `hvac-api` container runs continuously as a persistent service (started separately via `docker compose up -d hvac-api`).

```bash
# /etc/cron.d/hvac-test-suite
# Run Phase 1A (60 scenarios) weekdays at 06:00
0 6 * * 1-5 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python runner.py --phase 1a >> /var/log/hvac-tests/daily.log 2>&1

# Run full 360 scenarios every Saturday at 06:00
0 6 * * 6 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python runner.py --phase 1b >> /var/log/hvac-tests/weekly.log 2>&1

# AI analysis runs 30 minutes after daily suite
30 6 * * 1-5 pi cd /opt/hvac-tests && docker compose run --rm hvac-harness python agent_analysis.py >> /var/log/hvac-tests/analysis.log 2>&1
```

### 6.3 AI Model Configuration

**Primary**: Kimi K2.5 via OpenRouter  
**Rationale**: $0.60/M input, $0.10/M cached, $3.00/M output. 262K symmetric context window handles full telemetry dataset in a single call. Auto-caching means repeated system prompts cost ~$0.10/M after first run.

**Hard constraints** (enforced in every API call):
```python
KIMI_CONFIG = {
    "model": "moonshotai/kimi-k2.5",
    "max_tokens": 1500,          # Verbosity tax mitigation — critical
    "temperature": 0.2,          # Deterministic analysis
    "base_url": "https://openrouter.ai/api/v1",
}
```

**Monthly budget estimate**:
```
Nightly anomaly scan:    20 runs × 8K input × $0.10/M cached  = $0.016
                         20 runs × 1.5K output × $3.00/M      = $0.090
Agent hypothesis gen:    50 calls × 3K input × $0.60/M        = $0.090
                         50 calls × 1.5K output × $3.00/M     = $0.225
Weekly pattern mining:   4 runs × 15K input × $0.60/M         = $0.036
                         4 runs × 1.5K output × $3.00/M       = $0.018
─────────────────────────────────────────────────────────────────────
ESTIMATED TOTAL                                                = ~$0.475/month
BUDGET CEILING                                                 = $20.00/month
```

---

## 7. Telemetry Schema

All test scenarios emit events using the exact ADR-0014 schema. This ensures test telemetry is structurally identical to production telemetry — agents learn from both.

### 7.1 `telemetry_logs` Table (ADR-0014 compliant)

```sql
CREATE TABLE telemetry_logs (
  event_id          TEXT PRIMARY KEY,          -- UUID
  device_hash       TEXT NOT NULL,             -- Salted SHA-256 of scenario_id
  event_type        TEXT NOT NULL,             -- CONNECTIVITY | OCR | SYNC | LLM | HARDWARE
  event_name        TEXT NOT NULL,             -- BLE_DISCONNECT | SYNC_FAILURE | etc.
  duration_ms       INTEGER,                   -- nullable
  payload           TEXT NOT NULL,             -- JSON
  timestamp         TEXT NOT NULL              -- ISO8601 UTC, millisecond precision
);
```

### 7.2 `test_scenarios` Table (Test-specific, separate table)

```sql
CREATE TABLE test_scenarios (
  scenario_id       TEXT PRIMARY KEY,          -- UUID
  run_id            TEXT NOT NULL,             -- Groups all scenarios in one nightly run
  workflow          TEXT NOT NULL,             -- A | B | C | D
  network_cond      TEXT NOT NULL,             -- NET_NORMAL | NET_LOSS_5 | ...
  power_state       TEXT NOT NULL,             -- PWR_CONTINUOUS | PWR_SLEEP_1 | PWR_SLEEP_3
  sensor_state      TEXT NOT NULL,             -- SENS_NORMAL | SENS_SHT40_DRIFT | ...
  ocr_path          TEXT NOT NULL,             -- OCR_SUCCESS | OCR_BYPASS
  llm_path          TEXT NOT NULL,             -- LLM_SUCCESS | LLM_OOM | LLM_CLOUD_FALLBACK
  outcome           TEXT NOT NULL,             -- PASS | FAIL | ERROR
  failure_step      INTEGER,                   -- Step number where failure occurred (nullable)
  failure_reason    TEXT,                      -- Description of failure (nullable)
  total_duration_ms INTEGER NOT NULL,          -- Wall clock time for full scenario
  snapshot_id       TEXT,                      -- UUID of the Snapshot produced (nullable)
  data_integrity    INTEGER NOT NULL,          -- 1 = snapshot data correct, 0 = corruption detected
  created_at        TEXT NOT NULL              -- ISO8601 UTC
);
```

### 7.3 `agent_hypotheses` Table (Discovery mechanism)

```sql
CREATE TABLE agent_hypotheses (
  hypothesis_id     TEXT PRIMARY KEY,          -- UUID
  proposed_by       TEXT NOT NULL,             -- Agent name / model identifier
  hypothesis_text   TEXT NOT NULL,             -- Natural language hypothesis
  scenario_json     TEXT NOT NULL,             -- JSON scenario config to test the hypothesis
  status            TEXT NOT NULL DEFAULT 'QUEUED',  -- QUEUED | RUNNING | COMPLETE | REJECTED
  evidence_query    TEXT,                      -- SQL query that motivated the hypothesis
  evidence_result   TEXT,                      -- JSON result of evidence query
  test_result       TEXT,                      -- CONFIRMED | REFUTED | INCONCLUSIVE (nullable)
  created_at        TEXT NOT NULL,
  executed_at       TEXT                       -- nullable
);
```

### 7.4 Key Telemetry Events Emitted Per Scenario

Every scenario emits the following ADR-0014 events at minimum:

| Step | event_type | event_name | Key payload fields |
|------|-----------|-----------|-------------------|
| BLE connect | `CONNECTIVITY` | `BLE_CONNECT` | `rssi_dbm`, `connect_duration_ms` |
| Each button press | `HARDWARE` | `BUTTON_CAPTURE` | `button_id`, `sensor_value`, `capture_duration_ms` |
| BLE packet loss (if injected) | `CONNECTIVITY` | `BLE_DISCONNECT` | `rssi_dbm`, `disconnect_reason_code`, `reconnect_attempt_count` |
| OCR scan | `OCR` | `OCR_SCAN_COMPLETE` | `scan_attempts`, `scan_duration_ms`, `manual_bypass_triggered`, `corrected_fields` |
| LLM expansion | `LLM` | `LLM_EXPANSION` | `input_char_length`, `output_char_length`, `status`, `inference_duration_ms` |
| Snapshot finalize | `SYNC` | `SNAPSHOT_FINALIZED` | `snapshot_id`, `outbox_depth` |
| Outbox sync attempt | `SYNC` | `SYNC_ATTEMPT` | `outbox_depth`, `api_endpoint`, `http_status`, `retry_attempt` |
| Deep sleep | `HARDWARE` | `DEEP_SLEEP_ENTER` | `battery_percentage`, `cached_values_count` |
| Wake from sleep | `HARDWARE` | `DEEP_SLEEP_WAKE` | `sleep_duration_ms`, `nvs_cache_valid` |
| Sensor fault | `HARDWARE` | `SENSOR_FAULT` | `sensor_fault_code`, `battery_percentage` |
| Watchdog reset | `HARDWARE` | `WATCHDOG_RESET` | `watchdog_reset_count`, `reset_reason` |

---

## 8. FastAPI Middleware Specification

Read-only query interface deployed on the Raspberry Pi 5.

### 8.1 Endpoints

```
GET  /schema                   → Returns full SQLite schema as JSON
GET  /scenarios                → Lists all scenarios with outcome summary
GET  /runs                     → Lists all nightly run summaries
GET  /hypotheses               → Lists all agent hypotheses and their status
POST /query                    → Execute a read-only SQL query (SELECT only)
POST /hypotheses               → Agent submits a new scenario hypothesis
```

### 8.2 POST /query Contract

**Request:**
```json
{
  "sql": "SELECT scenario_id, outcome, total_duration_ms FROM test_scenarios WHERE outcome = 'FAIL' ORDER BY created_at DESC LIMIT 20",
  "description": "Find the 20 most recent failures"
}
```

**Response:**
```json
{
  "rows": [...],
  "row_count": 17,
  "execution_ms": 8,
  "schema_version": "1.0.0"
}
```

**Safety rules enforced by middleware:**
- Only `SELECT` statements permitted (write protection)
- Maximum 1,000 rows returned per query
- Query execution timeout: 5 seconds
- No `ATTACH`, `PRAGMA`, or file system access

### 8.3 POST /hypotheses Contract

Agents submit proposed scenarios via JSON. The harness validates schema and queues them for the next nightly batch.

**Request:**
```json
{
  "proposed_by": "kimi-k2.5 via openrouter",
  "hypothesis_text": "BLE reconnection under RF interference (RSSI < -90dBm) combined with PWR_SLEEP_1 causes NVS cache corruption in 15% of cases, resulting in duplicate Before Set values on wake.",
  "evidence_query": "SELECT COUNT(*) FROM telemetry_logs WHERE event_name = 'BLE_DISCONNECT' AND JSON_EXTRACT(payload, '$.rssi_dbm') < -90 AND event_id IN (SELECT event_id FROM telemetry_logs WHERE event_name = 'DEEP_SLEEP_WAKE' AND JSON_EXTRACT(payload, '$.nvs_cache_valid') = 0)",
  "evidence_result": { "count": 14 },
  "scenario_json": {
    "workflow": "B",
    "network_cond": "NET_RF_INTERFERENCE",
    "power_state": "PWR_SLEEP_1",
    "sensor_state": "SENS_NORMAL",
    "ocr_path": "OCR_SUCCESS",
    "llm_path": "LLM_SUCCESS",
    "repeat_count": 50
  }
}
```

---

## 9. Mock ESP32 BLE Simulator

Built with Python + Bleak. Simulates the physical handheld device's BLE GATT service without requiring hardware.

### 9.1 Simulated Behaviors

| Behavior | Implementation |
|----------|---------------|
| GATT service advertisement | Bleak server with HVAC Helper service UUID |
| Button press events | Programmatic characteristic writes on schedule |
| Encoder rotation events | Sequence of value delta packets |
| Sensor value delivery | Configurable fixture values (normal or fault-injected) |
| BLE packet loss injection | Random packet drop at configured percentage |
| RF interference simulation | RSSI injection via characteristic metadata |
| Deep sleep simulation | BLE advertisement stop; NVS cache serialized to disk |
| Deep sleep wake | BLE advertisement restart; NVS cache deserialized |
| NVS cache corruption | Optional: corrupt CRC on deserialize for `SENS_BOTH_FAULT` scenarios |
| OTA upload simulation | Chunked binary transfer with configurable failure points |
| Watchdog reset simulation | Abrupt BLE disconnect + reconnect with reset-cause NVS entry |
| BEFORE/AFTER switch toggle | Context-swap characteristic notification + full cache retransmission |

### 9.2 Simulator Config Schema (per scenario)

```python
@dataclass
class SimulatorConfig:
    scenario_id: str
    workflow: str                       # "A" | "B" | "C" | "D"
    network_cond: str                   # "NET_NORMAL" | "NET_LOSS_5" | ...
    power_state: str                    # "PWR_CONTINUOUS" | ...
    sensor_state: str                   # "SENS_NORMAL" | ...
    sensor_values: SensorValueFixture   # Nominal or drift-injected readings
    ocr_path: str                       # "OCR_SUCCESS" | "OCR_BYPASS"
    llm_path: str                       # "LLM_SUCCESS" | "LLM_OOM" | ...
    packet_loss_pct: float              # 0.0 | 0.05 | 0.20
    rssi_override_dbm: int | None       # None = real; -90 = RF interference sim
    sleep_trigger_step: int | None      # Step number to trigger deep sleep
    sleep_duration_ms: int              # Duration before wake
    corrupt_nvs_on_wake: bool           # Whether to inject NVS corruption
```

---

## 10. Agent Discovery System

### 10.1 Three Discovery Modes

**Mode 1: SQL Anomaly Queries (Phase 1)**  
Agent receives nightly run summary, writes targeted SQL queries to investigate failures.

**Mode 2: Pattern Mining (Phase 2)**  
Agent receives full telemetry dump (~8K tokens), identifies statistical correlations across dimensions.

**Mode 3: Hypothesis Testing (Phase 2)**  
Agent proposes new scenario configurations based on discovered patterns. Harness validates schema and queues for next batch.

### 10.2 Daily Analysis Pipeline

```
06:00 — Test harness container starts (cron triggers docker compose run)
08:30 — (estimated completion)
08:35 — agent_analysis.py fires (in harness container)

Step 1: Fetch run summary from /runs (latest)
Step 2: Fetch all FAIL scenarios from /query
Step 3: For each FAIL scenario, fetch associated telemetry_logs
Step 4: Submit to Kimi K2.5 (max_tokens: 1500)
Step 5: Parse agent response for:
         a) Anomaly descriptions
         b) SQL queries for deeper investigation
         c) New hypothesis JSON (if any)
Step 6: Execute follow-up SQL queries via /query
Step 7: If hypothesis proposed → POST to /hypotheses
Step 8: Write analysis report to /data/reports/YYYY-MM-DD.md
```

### 10.3 Token Budget Enforcement

```python
# agent_analysis.py — budget guard
MONTHLY_BUDGET_USD = 20.00
COST_PER_RUN_USD_ESTIMATE = 0.05

def check_budget():
    spent = get_month_to_date_spend()  # reads from local spend_log.json
    if spent + COST_PER_RUN_USD_ESTIMATE > MONTHLY_BUDGET_USD:
        log.warning(f"Budget ceiling reached: ${spent:.2f} spent. Skipping analysis.")
        return False
    return True
```

---

## 11. Functional Requirements

### 11.1 Test Harness

| ID | Requirement | Priority |
|----|-------------|----------|
| TH-01 | Harness executes all 360 scenarios in under 8 hours | Beta-blocker |
| TH-02 | Each scenario emits complete ADR-0014 telemetry events | Beta-blocker |
| TH-03 | `test_scenarios` table records outcome, failure step, data integrity for every run | Beta-blocker |
| TH-04 | Harness validates snapshot calculations (Delta T, Superheat, Subcooling) against expected values | Beta-blocker |
| TH-05 | Phase 1A (60 scenarios) completes in under 90 minutes | Week 1 gate |
| TH-06 | Harness generates a human-readable HTML/Markdown run report | Week 2 |
| TH-07 | Harness accepts JSON scenario definitions from `agent_hypotheses` queue | Phase 2 |

### 11.2 BLE Simulator

| ID | Requirement | Priority |
|----|-------------|----------|
| BLE-01 | Simulator accurately reproduces ESP32 GATT service UUID and characteristic layout | Beta-blocker |
| BLE-02 | Packet loss injection is configurable per-scenario (0%, 5%, 20%) | Beta-blocker |
| BLE-03 | Deep sleep simulation persists NVS cache to disk and restores on wake | Beta-blocker |
| BLE-04 | BEFORE/AFTER switch toggle triggers full cache retransmission | Beta-blocker |
| BLE-05 | OTA upload simulation supports configurable abort points (10%, 50%, 85%, 99%) | Week 3 |
| BLE-06 | Watchdog reset simulation emits proper reset-cause NVS entry on reconnect | Week 3 |

### 11.3 FastAPI Middleware

| ID | Requirement | Priority |
|----|-------------|----------|
| MW-01 | `POST /query` enforces SELECT-only (rejects INSERT, UPDATE, DELETE, DROP) | Week 1 |
| MW-02 | `GET /schema` returns full table schema for agent introspection | Week 1 |
| MW-03 | `POST /hypotheses` validates scenario JSON against schema before accepting | Week 2 |
| MW-04 | All endpoints require API key auth (Bearer token) | Week 1 |
| MW-05 | Rate limiting: max 60 requests/minute per client | Week 1 |

### 11.4 AI Agent Analysis

| ID | Requirement | Priority |
|----|-------------|----------|
| AG-01 | Agent analysis runs within 30 minutes of nightly test completion | Week 2 |
| AG-02 | Agent produces minimum 3 SQL follow-up queries per analysis run | Week 2 |
| AG-03 | Agent output is structured JSON (anomalies[], hypotheses[], queries_run[]) | Week 2 |
| AG-04 | Monthly token spend is tracked and capped at $20 | Week 1 |
| AG-05 | Analysis reports are stored in `/data/reports/` and queryable by date | Week 2 |

---

## 12. Implementation Phases & Agent Prompts

Each phase has a designated agent and a precise prompt to invoke it.

---

### Phase 1: BLE Mock Device Simulator (Week 1)

**Agent**: `@agency-engineering-embedded-firmware-engineer` + `@agency-engineering-mobile-app-builder`

**Prompt**:
```
You are building a software simulator for an ESP32 BLE peripheral device for the HVAC Helper project.

Context files to read first:
- docs/PRD.md (Section 6.1 Device, Section 6.2 Firmware)
- docs/adr/0002-ble-5-0-as-transport.md
- docs/adr/0011-progress-checklist-leds-and-switch.md
- prototype/logic-ble-binary/ (existing BLE binary protocol prototype)
- prototype/logic-before-after/ (existing BEFORE/AFTER context swap prototype)

Build a Python BLE simulator at: tests/simulator/mock_device.py

It must implement:
1. A Bleak BLE peripheral server exposing the HVAC Helper GATT service
2. SimulatorConfig dataclass as specified in prototype/prd-vertical-test-suite.md Section 9.2
3. Button press simulation for RA, SA, OA, DA buttons with configurable sensor values
4. Rotary encoder simulation for SL and LL with saturation temp + pipe temp
5. BEFORE/AFTER switch toggle with full cache retransmission
6. Packet loss injection at specified percentage (0%, 5%, 20%)
7. RSSI override for RF interference simulation (-90dBm)
8. Deep sleep simulation: stops advertising, serializes NVS cache to disk
9. Deep sleep wake: restarts advertising, deserializes NVS cache
10. Optional NVS cache corruption on wake (corrupt_nvs_on_wake flag)
11. All actions must emit ADR-0014 telemetry events to the telemetry_logs SQLite table

Emit these events at minimum (see prd-vertical-test-suite.md Section 7.4):
- BLE_CONNECT, BLE_DISCONNECT with rssi_dbm and reconnect_attempt_count
- BUTTON_CAPTURE for each button press
- DEEP_SLEEP_ENTER and DEEP_SLEEP_WAKE
- SENSOR_FAULT when sensor_state is not SENS_NORMAL

Tests: Write pytest unit tests at tests/simulator/test_mock_device.py covering:
- Normal button press sequence emits correct telemetry
- Packet loss at 20% triggers BLE_DISCONNECT event
- Deep sleep + wake restores NVS cache correctly
- NVS corruption on wake emits SENSOR_FAULT event
```

---

### Phase 2: SQLite Telemetry Database + FastAPI Middleware (Week 1)

**Agent**: `@agency-engineering-backend-architect`

**Prompt**:
```
You are building the test telemetry database and query middleware for the HVAC Helper test suite.

Context files to read first:
- docs/adr/0014-real-time-usage-and-reliability-telemetry.md (canonical schema)
- prototype/prd-vertical-test-suite.md Sections 7, 8

Build two artifacts:

1. Database setup at: tests/db/schema.sql
   Create tables:
   - telemetry_logs (ADR-0014 compliant, Section 7.1 of PRD)
   - test_scenarios (Section 7.2 of PRD)
   - agent_hypotheses (Section 7.3 of PRD)
   - Add indexes on: event_type, event_name, timestamp, scenario_id, outcome

2. FastAPI app at: tests/api/main.py
   Implement all endpoints from Section 8.1:
   - GET /schema → returns SQLite schema as JSON
   - GET /scenarios → paginated list of scenarios with outcome summary
   - GET /runs → list of nightly run summaries (grouped by run_id)
   - GET /hypotheses → list of all agent hypotheses
   - POST /query → execute read-only SQL (SELECT only — reject all others with 403)
   - POST /hypotheses → accept new hypothesis JSON, validate scenario_json schema

   Security requirements (Section 8.3):
   - Bearer token auth on all endpoints (token stored in .env)
   - POST /query: SELECT-only enforcement, 1000 row limit, 5 second timeout
   - Rate limiting: 60 requests/minute per IP
   - No ATTACH, PRAGMA, or file access allowed in queries

   Return format for POST /query:
   { "rows": [...], "row_count": N, "execution_ms": N, "schema_version": "1.0.0" }

Write pytest tests for:
- SELECT query succeeds and returns correct shape
- INSERT query returns 403
- Query timeout returns 408
- POST /hypotheses validates scenario_json against known dimension values
```

---

### Phase 3: Vertical Workflow Test Runner (Week 2)

**Agent**: `@agency-engineering-software-architect`

**Prompt**:
```
You are building the core test harness that runs vertical workflow scenarios for the HVAC Helper test suite.

Context files to read first:
- prototype/prd-vertical-test-suite.md (full document — this is your spec)
- prototype/logic-state/ (existing snapshot state machine prototype)
- prototype/logic-fsm-sync/ (existing cloud sync prototype)
- prototype/logic-ble-ota/ (existing OTA prototype)
- tests/simulator/mock_device.py (BLE simulator you will orchestrate)

Build the test harness at: tests/harness/runner.py

The harness must:
1. Load scenario definitions from tests/scenarios/ (JSON files)
2. For each scenario, instantiate SimulatorConfig and start the mock device
3. Drive the mobile app logic layer through the complete workflow steps (A, B, C, D)
4. Inject network conditions (packet loss, RSSI, offline delays) per scenario config
5. After each workflow, validate data integrity:
   - Snapshot arrived at mock cloud API with correct field values
   - Calculations correct: Delta T = RA_temp - SA_temp, Superheat = SL_pipe - SL_sat, Subcooling = LL_sat - LL_pipe
   - No duplicate snapshots in the Outbox (idempotency check)
   - Revision parent chain is intact for Workflow D
6. Write test_scenarios row to SQLite on completion (pass/fail/error, failure_step, total_duration_ms)
7. Emit all required ADR-0014 telemetry events throughout each step

The 360 scenario matrix (Section 5 of PRD) must be auto-generated:
- Write tests/scenarios/generate_matrix.py that produces all 360 JSON files
- Each JSON file represents one unique combination of the 5 dimensions

Phase execution:
- tests/harness/runner.py --phase 1a → runs the 60 critical path scenarios
- tests/harness/runner.py --phase 1b → runs all 360 scenarios
- tests/harness/runner.py --hypothesis <hypothesis_id> → runs a single agent-proposed scenario

Write pytest tests for the harness itself covering:
- Scenario matrix generates exactly 360 unique scenarios
- Data integrity validator catches a deliberately wrong Delta T calculation
- Duplicate idempotency key is detected as a failure
```

---

### Phase 4: AI Agent Analysis Pipeline (Week 2)

**Agent**: `@agency-engineering-ai-engineer`

**Prompt**:
```
You are building the AI analysis pipeline that runs nightly after the test suite completes for HVAC Helper.

Context files to read first:
- prototype/prd-vertical-test-suite.md Sections 10, 11.4
- docs/adr/0014-real-time-usage-and-reliability-telemetry.md
- tests/db/schema.sql (database schema)

Build the analysis pipeline at: tests/analysis/agent_analysis.py

It must:
1. Connect to the FastAPI middleware at localhost:8080 with Bearer token auth
2. Fetch the latest run summary from GET /runs
3. Fetch all FAIL scenarios from POST /query
4. For each FAIL scenario, fetch its telemetry_logs events
5. Bundle all data and submit to Kimi K2.5 via OpenRouter API

OpenRouter config (load from environment variables):
- OPENROUTER_API_KEY
- KIMI_MODEL = "moonshotai/kimi-k2.5"
- max_tokens = 1500  # CRITICAL: never exceed this — verbosity tax mitigation
- temperature = 0.2

System prompt for Kimi (use this exactly):
---
You are an expert QA analyst for an IoT hardware product. You receive telemetry from automated test scenarios and must identify:
1. Anomalous patterns that will affect real technicians in the field
2. Correlations between environmental conditions (BLE signal strength, power state, sensor faults) and failure outcomes
3. New test hypotheses to validate

You must respond ONLY with valid JSON in this exact structure:
{
  "anomalies": [
    {
      "title": "string (max 80 chars)",
      "description": "string (max 200 chars)",
      "affected_scenarios": ["scenario_id_1", "scenario_id_2"],
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "user_impact": "string (max 150 chars)"
    }
  ],
  "follow_up_queries": [
    {
      "description": "string",
      "sql": "SELECT ..."
    }
  ],
  "hypotheses": [
    {
      "hypothesis_text": "string (max 300 chars)",
      "scenario_json": { "workflow": "B", "network_cond": "...", "power_state": "...", "sensor_state": "...", "ocr_path": "...", "llm_path": "...", "repeat_count": 20 }
    }
  ]
}
---

After receiving Kimi's response:
6. Execute all follow_up_queries via POST /query
7. Submit all hypotheses via POST /hypotheses
8. Write the analysis report to /data/reports/YYYY-MM-DD.json AND /data/reports/YYYY-MM-DD.md
9. Update local spend_log.json with token usage for budget tracking
10. If monthly budget > $18.00 (90% of $20 ceiling), send warning to stderr

Budget enforcement: Read tests/analysis/spend_log.json on startup. If projected cost of current run would exceed $20.00 monthly ceiling, skip LLM analysis, log warning, and exit 0.

Write tests for:
- Budget guard halts execution when spend_log shows $19.50 spent
- Kimi response parser correctly extracts anomalies, queries, and hypotheses
- Malformed JSON from Kimi is caught and logged without crashing
```

---

### Phase 5: Container Setup & Reporting Dashboard (Week 3)

**Agent**: `@agency-engineering-sre`

**Prompt**:
```
You are setting up the containerized infrastructure and reporting for the HVAC Helper test suite on a Raspberry Pi 5 running Docker Engine.

Context files to read first:
- docs/prd-vertical-test-suite.md Sections 6.1, 6.2, 6.3

Tasks:

1. Write Dockerfiles at:
   - tests/harness/Dockerfile   (Python 3.12-slim, installs Bleak + pytest + requests + aiohttp)
   - tests/api/Dockerfile       (Python 3.12-slim, installs FastAPI + uvicorn + aiosqlite)
   Both must run as a non-root user (uid 1000).

2. Write tests/docker-compose.yml exactly as specified in PRD Section 6.1:
   - hvac-harness service with privileged: true and /var/run/dbus volume (for BLE)
   - hvac-api service on port 8080 with read-only data volume mount
   - Shared bind-mount volume at /opt/hvac-tests/data

3. Write tests/scripts/setup_pi.sh
   It must:
   - Install Docker Engine on Raspberry Pi OS (curl | sh official script)
   - Add user `pi` to the `docker` group
   - Create /opt/hvac-tests/data/ and /var/log/hvac-tests/ directories
   - Copy tests/ directory to /opt/hvac-tests/
   - Build both Docker images: docker compose build
   - Start the API container as persistent service: docker compose up -d hvac-api
   - Install cron jobs as specified in PRD Section 6.2
   - Initialize SQLite schema: docker compose run --rm hvac-harness python -c "import db; db.init()"
   - Create /opt/hvac-tests/.env from .env.example with placeholder values

2. Write a reporting script at: tests/scripts/generate_report.py
   It queries the SQLite database and generates:
   - tests/reports/weekly-summary.md: scenario pass rate by dimension, top 5 failure patterns, agent hypothesis queue status
   - tests/reports/weekly-summary.html: same data, styled with the project's design tokens from tokens/design-tokens.json

3. Write a health check script at: tests/scripts/health_check.py
   It must verify:
   - SQLite database is writable
   - FastAPI server responds to GET /schema
   - Last nightly run was within 26 hours (alert if not)
   - Monthly token spend is under $20
   Exit code 0 = healthy, 1 = warning, 2 = critical

Document the setup process in tests/README.md including:
- Hardware requirements (Raspberry Pi 5, recommended SD card size)
- Setup steps
- How to query results manually
- How to add a new scenario dimension
```

---

## 13. Success Gates

### Week 1 Gate (Before Week 2 begins)
- [ ] `tests/simulator/mock_device.py` passes all pytest unit tests
- [ ] `tests/db/schema.sql` creates all 3 tables correctly
- [ ] `tests/api/main.py` passes security tests (SELECT-only enforcement)
- [ ] Phase 1A (60 scenarios) executes end-to-end without crashing

### Week 3 Gate (Closed Beta prerequisite)
- [ ] Phase 1B (360 scenarios) completes in under 8 hours
- [ ] ≥ 95% scenario pass rate across all 360
- [ ] AI agent has run ≥ 3 analysis cycles and proposed ≥ 1 hypothesis
- [ ] All proposed hypotheses have been tested and resolved (CONFIRMED/REFUTED/INCONCLUSIVE)
- [ ] Zero unresolved CRITICAL anomalies in the latest analysis report

### Closed Beta Gate (Before first device ships)
- [ ] Workflow C (Offline Sync) has 100% pass rate across all network conditions
- [ ] Watchdog reset scenarios result in correct NVS cache recovery in ≥ 99% of runs
- [ ] No Outbox idempotency failures across any scenario

---

## 14. Open Questions

- Does the Raspberry Pi 5's Bluetooth adapter support simultaneously being a BLE central (connecting to real device for manual testing) and running the BLE simulator server?
- Should test telemetry and production telemetry share the same ADR-0014 event schema version? If the schema evolves, both must be migrated simultaneously.
- Should the weekly HTML report be served by the FastAPI server (accessible from local network) or generated as a static file?
- Does OpenRouter's Kimi K2.5 support streaming responses? If so, we could use SSE for real-time analysis during long runs rather than waiting for completion.

---

## 15. Appendix: Directory Structure

The `tests/` directory lives at the **project root** (`hvac-helper-tool/tests/`), alongside `firmware/`, `mobile/`, and `prototype/`.

```
hvac-helper-tool/
├── firmware/
├── mobile/
├── prototype/
├── docs/
└── tests/                             ← project root
    ├── README.md                      # Setup and usage docs
    ├── docker-compose.yml             # Orchestrates harness + api containers
    ├── .env.example                   # OPENROUTER_API_KEY, API_BEARER_TOKEN
    ├── simulator/
    │   ├── mock_device.py             # BLE ESP32 simulator (Bleak)
    │   └── test_mock_device.py        # pytest unit tests
    ├── db/
    │   └── schema.sql                 # SQLite schema (ADR-0014 compliant)
    ├── api/
    │   ├── Dockerfile                 # Python 3.12-slim, FastAPI + uvicorn
    │   └── main.py                    # FastAPI middleware (read-only, port 8080)
    ├── harness/
    │   ├── Dockerfile                 # Python 3.12-slim, Bleak + pytest + requests
    │   └── runner.py                  # Vertical workflow test runner
    ├── scenarios/
    │   ├── generate_matrix.py         # Generates all 360 scenario JSON files
    │   └── *.json                     # 360 auto-generated scenario definitions
    ├── analysis/
    │   ├── agent_analysis.py          # Kimi K2.5 daily analysis pipeline
    │   └── spend_log.json             # Monthly token budget tracker
    ├── scripts/
    │   ├── setup_pi.sh                # Raspberry Pi 5 Docker setup script
    │   ├── generate_report.py         # Weekly HTML/MD report generator
    │   └── health_check.py            # Infrastructure health check
    └── reports/                       # Mounted from /opt/hvac-tests/data/reports/
        ├── YYYY-MM-DD.json            # Daily AI analysis output
        ├── YYYY-MM-DD.md              # Human-readable daily report
        └── weekly-summary.html        # Weekly dashboard
```
