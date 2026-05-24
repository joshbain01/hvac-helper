# Snapshot Finalization & Local SQLite Outbox Queue

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Outbox logic, finalization UI, timeout checking)
- `/agency-software-architect` (state boundary verification)

## Reference Docs
- [PRD.md - Section 5 & 6.3 (Finalization & Outbox)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L64-L104)
- [schema.ts - Outbox queue table definition](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L103)
- [ADR 0007: Snapshot Sync Semantics](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0007-snapshot-sync-semantics.md)

## Prototype Lessons & Context
Study the `tickTime` timeout logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L534-L592) (deleting single points after 20 minutes) and the validation rules in [validateSnapshot](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L594-L638) (requiring notes and complete sets before finalization). Also calculate performance deltas.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [SQLite Outbox Sync Status & Error States](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#10-planned-sqlite-outbox-sync-status--error-states-ui-prototype) (`prototype/ui-outbox-sync`) prototype.

## What to build
Implement the timeout expiration routine for data points and the finalization validation rules in the mobile application. Ensure individual data points are expired if they exceed the 20-minute window without snapshot finalization. Build the finalization action, which locks the snapshot (immutable), calculates before-to-after performance deltas, and queues the payload into the SQLite `outbox_queue` for cloud sync.

## Acceptance criteria
- [ ] App runs a periodic check (or checks on active capture) to invalidate and delete individual measurements that are older than 20 minutes.
- [ ] Validation prevents snapshot finalization if notes, equipment fields, or required sensor data points are missing (depending on status: `COMPLETED` vs. `DIAGNOSTIC_COMPLETE`).
- [ ] Finalization triggers calculation of thermodynamic Performance Deltas (Before vs. After differences).
- [ ] Finalized snapshots are flagged as immutable in the database and inserted into the SQLite `outbox_queue` table.

## Blocked by
[0007-before-after-switch-interrupt.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0007-before-after-switch-interrupt.md)

## User stories covered
User Story 7 (complete), User Story 8 (partial)

## Testing Guidance

### Unit Testing
- **Outbox Queue Mechanics**: Jest tests validating SQL outbox write, update, and deletion queries.
- **Retry Backoff**: Verify exponential backoff delay intervals and maximum retry limit thresholds.
- **FIFO Ordering**: Test sorting algorithms to ensure snapshots sync in original finalization order.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure outbox transaction speed and batch lookup latency.
  - Benchmark resource usage (memory, SQLite size growth) under simulated offline queue capacity (e.g. 50 queued snapshots).
- **Behavioral & Data Baseline**:
  - Snapshot and freeze the finalized payload schema to prevent schema drift during local queueing.

### Integration & Manual Verification
- **Offline Storage**: Queue 10 finalized snapshots in offline mode, verify local storage persistence, and confirm they sync to the cloud once internet is restored.
- **Conflict Handling**: Verify that duplicate snapshot finalizations are rejected by the database.

## Definition of Done (DoD)
- [ ] **Data Atomicity**: Database transactions for outbox writes are verified to roll back safely on failure.
- [ ] **Unit Tests**: Outbox FIFO, enqueue/dequeue logic, and retry calculations pass tests.
- [ ] **TypeScript Check**: Code builds successfully with zero linting or compiler warnings.
