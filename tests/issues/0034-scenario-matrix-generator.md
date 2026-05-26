# Scenario Matrix Generator (360 Configs)

## Type
AFK

## Assigned Agents
- `@agency-engineering-software-architect` (combinatoric generator, JSON schema validation)

## Reference Docs
- [PRD: Vertical Test Suite — Section 5 (Scenario Matrix)](../../docs/prd-vertical-test-suite.md)

## What to build

A Python script (`tests/scenarios/generate_matrix.py`) that generates all 360 scenario JSON files — one per unique combination of the 5 test dimensions. The test runner (issue 0035) loads these files to know what to execute.

**The 5 dimensions (5 × 3 × 4 × 2 × 3 = 360):**
```python
WORKFLOWS       = ["A", "B", "C", "D"]           # 4 — but only A/B/C for Phase 1
NETWORK_CONDS   = ["NET_NORMAL", "NET_LOSS_5", "NET_LOSS_20", "NET_OFFLINE_2H", "NET_RF_INTERFERENCE"]  # 5
POWER_STATES    = ["PWR_CONTINUOUS", "PWR_SLEEP_1", "PWR_SLEEP_3"]  # 3
SENSOR_STATES   = ["SENS_NORMAL", "SENS_SHT40_DRIFT", "SENS_CLAMP_DISCONNECTED", "SENS_BOTH_FAULT"]  # 4
OCR_PATHS       = ["OCR_SUCCESS", "OCR_BYPASS"]   # 2
LLM_PATHS       = ["LLM_SUCCESS", "LLM_OOM", "LLM_CLOUD_FALLBACK"]  # 3
```

Each output JSON file encodes one scenario:
```json
{
  "scenario_id": "uuid-v4",
  "workflow": "B",
  "network_cond": "NET_LOSS_20",
  "power_state": "PWR_SLEEP_1",
  "sensor_state": "SENS_NORMAL",
  "ocr_path": "OCR_SUCCESS",
  "llm_path": "LLM_SUCCESS",
  "phase": "1b",
  "repeat_count": 1
}
```

The generator also produces `tests/scenarios/phase_1a.json` — an index of the 60 critical path scenario IDs that form Phase 1A:
- All 5 network conditions × Workflow B × `PWR_CONTINUOUS` × `SENS_NORMAL` × `OCR_SUCCESS` × `LLM_SUCCESS`
- All 3 power states × Workflow C × `NET_NORMAL` × `SENS_NORMAL` × `OCR_SUCCESS` × `LLM_SUCCESS`
- All `SENS_*` × all `NET_*` × Workflow B × `PWR_CONTINUOUS` × `OCR_SUCCESS` × `LLM_SUCCESS` (20 scenarios)
- All 3 LLM × 2 OCR × Workflow B × `NET_NORMAL` × `PWR_CONTINUOUS` × `SENS_NORMAL` (12 scenarios)
- Workflow C × `NET_OFFLINE_2H` × all power states × `SENS_NORMAL` × both OCR (6 scenarios)
- Workflow B × `NET_LOSS_20` × `PWR_SLEEP_1` × `SENS_NORMAL` × `OCR_SUCCESS` × all LLM (remaining to total 60)

## Acceptance criteria

- [ ] `python tests/scenarios/generate_matrix.py` produces exactly 360 JSON files in `tests/scenarios/matrix/`
- [ ] Every file has a unique `scenario_id` (UUID v4)
- [ ] All 360 combinations are unique (no duplicate dimension combinations)
- [ ] `tests/scenarios/phase_1a.json` contains exactly 60 scenario IDs, all of which exist in `matrix/`
- [ ] All generated JSON files pass schema validation (all 5 dimension values are from the allowed set)
- [ ] Re-running the generator is idempotent (same scenario_ids produced from same seed)
- [ ] pytest test confirms: `len(matrix/) == 360`, all unique, phase_1a has 60 entries

## Blocked by

None — can start immediately
