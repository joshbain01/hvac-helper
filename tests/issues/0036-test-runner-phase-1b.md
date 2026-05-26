# Vertical Workflow Test Runner — Phase 1B (Full 360 Scenarios)

## Type
AFK

## Assigned Agents
- `@agency-engineering-software-architect` (concurrency, run time optimization)

## Reference Docs
- [PRD: Vertical Test Suite — Section 5 (Scenario Matrix), Section 11.1 TH-01](../../docs/prd-vertical-test-suite.md)

## What to build

Scale the test runner (built in issue 0035) to execute all 360 scenarios within the 8-hour daily window. The primary challenge is throughput — 360 scenarios must complete between 06:00 and 14:00 on the Raspberry Pi 5.

The key architectural decision is **parallelism**: BLE simulation is software-only (no physical radio), so multiple scenarios can run concurrently as long as they use different virtual BLE addresses and separate SQLite write connections.

**Target throughput:**
- 360 scenarios ÷ 8 hours = 45 scenarios/hour minimum
- Recommended: 4–6 parallel workers, each running one scenario at a time
- Each scenario estimated at 2–8 minutes depending on `NET_OFFLINE_2H` delays

**Implementation approach:**
- Use Python `multiprocessing.Pool` (not threading — Bleak uses asyncio per process)
- Each worker gets an isolated SQLite write connection (WAL mode for concurrent writes)
- BLE virtual addresses are namespaced per worker to avoid conflicts
- Scenarios with `NET_OFFLINE_2H` are scheduled last (they have 2-hour simulated delays — use wall-clock acceleration via mock time)

**Mock time for offline delays:**
`NET_OFFLINE_2H` scenarios simulate a 2-hour offline window. In the test harness, this is accelerated by replacing the Outbox retry scheduler's `time.sleep(60)` with a mock clock that advances 60 seconds per tick instantly. The scenario validates the retry logic fires at the correct simulated intervals, not real wall-clock time.

After completion, writes a full summary report to `/data/reports/YYYY-MM-DD-phase1b.md` including:
- Pass rate by each dimension (network, power, sensor, OCR, LLM)
- Top 10 failure patterns by scenario dimension combination
- Any scenario that failed in Phase 1B but passed in Phase 1A (regression flag)

## Acceptance criteria

- [ ] All 360 scenarios complete within 8 hours on Raspberry Pi 5 hardware
- [ ] Parallel workers do not produce SQLite write conflicts (WAL mode validated under concurrent load)
- [ ] `NET_OFFLINE_2H` scenarios complete in under 10 minutes using mock time acceleration
- [ ] Final pass rate ≥ 95% of 360 scenarios before Closed Beta gate
- [ ] Phase 1B report includes per-dimension pass rates and top 10 failure patterns
- [ ] Scenarios that regress vs. Phase 1A results are explicitly flagged in the report
- [ ] `--phase 1b` flag is the only change needed to run the full battery (no separate config)

## Blocked by

- [0035 — Vertical Workflow Test Runner — Phase 1A](./0035-test-runner-phase-1a.md)
