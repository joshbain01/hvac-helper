# Weekly Reporting Dashboard + Health Check

## Type
AFK

## Assigned Agents
- `@agency-engineering-sre` (health check, cron integration)
- `@agency-engineering-backend-architect` (SQLite query aggregations, report generation)

## Reference Docs
- [PRD: Vertical Test Suite — Section 6.2, 11 (Reporting, Functional Requirements)](../../docs/prd-vertical-test-suite.md)
- [Design Tokens](../../tokens/design-tokens.json)

## What to build

Two scripts that make the test suite's results visible and verifiable: a weekly report generator that surfaces pass rates and failure trends, and a health check that confirms the Pi infrastructure is running correctly.

**`tests/scripts/generate_report.py`**

Queries SQLite directly and produces two output files:

`tests/reports/weekly-summary.md` — contains:
- Overall pass rate for the week (PASS / total)
- Pass rate broken down by each dimension (network, power, sensor, OCR, LLM)
- Top 5 failure patterns (most common `failure_reason` + `failure_step` combinations)
- Agent hypothesis queue: count of QUEUED / RUNNING / COMPLETE / CONFIRMED / REFUTED
- List of any CRITICAL anomalies from the week's analysis reports

`tests/reports/weekly-summary.html` — same data, styled using design tokens from `tokens/design-tokens.json`. Use the sunlight high-contrast theme (`#000000` on `#FFFFFF`) since reports may be viewed on a phone in the field.

Example aggregation query the script must run:
```sql
SELECT
  network_cond,
  COUNT(*) as total,
  SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) as passed,
  ROUND(100.0 * SUM(CASE WHEN outcome = 'PASS' THEN 1 ELSE 0 END) / COUNT(*), 1) as pass_rate_pct
FROM test_scenarios
WHERE created_at >= date('now', '-7 days')
GROUP BY network_cond
ORDER BY pass_rate_pct ASC;
```

**`tests/scripts/health_check.py`**

Verifies the Pi infrastructure is healthy. Run manually or add to cron for alerting.

Checks (in order):
1. SQLite DB file exists and is readable at `$DB_PATH`
2. `GET http://localhost:8080/schema` responds with HTTP 200
3. Latest `run_id` in `test_scenarios` was created within the last 26 hours (alerts if stale)
4. `spend_log.json` monthly total is under $20.00

Exit codes:
- `0` = all healthy
- `1` = warning (stale run or 80%+ budget used)
- `2` = critical (DB unreachable or API down)

```bash
# Example output
✓ SQLite DB accessible (/data/test_telemetry.db)
✓ FastAPI middleware responding (GET /schema → 200)
⚠ Last run: 28 hours ago (expected: ≤ 26h)
✓ Monthly AI spend: $1.24 / $20.00 (6.2%)
Exit: 1 (warning)
```

## Acceptance criteria

- [ ] `python tests/scripts/generate_report.py` produces both `weekly-summary.md` and `weekly-summary.html` without errors
- [ ] HTML report uses design tokens from `tokens/design-tokens.json` for colors and typography
- [ ] Per-dimension pass rate table is accurate against the test SQLite data (validated with a seeded test DB)
- [ ] Top 5 failure patterns correctly identifies the most frequent `failure_reason` combinations
- [ ] Hypothesis queue status reflects current `agent_hypotheses` table counts
- [ ] `health_check.py` exits `0` when all checks pass
- [ ] `health_check.py` exits `2` when `GET /schema` times out or DB is missing
- [ ] `health_check.py` exits `1` when last run is older than 26 hours
- [ ] `health_check.py` exits `1` when monthly spend exceeds $16.00 (80% of $20 ceiling)

## Blocked by

- [0035 — Vertical Workflow Test Runner — Phase 1A](./0035-test-runner-phase-1a.md)
- [0037 — Kimi K2.5 Daily Analysis Pipeline](./0037-ai-analysis-pipeline.md)
- [0038 — Docker Compose Containers + Raspberry Pi Setup](./0038-docker-pi-setup.md)

## Labels
enhancement, ready-for-agent

