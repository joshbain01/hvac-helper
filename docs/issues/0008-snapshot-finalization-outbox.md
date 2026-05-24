# Snapshot Finalization & Local SQLite Outbox Queue

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Outbox logic, finalization UI, timeout checking)
- `/agency-software-architect` (state boundary verification)

## Reference Docs
- [PRD.md - Section 6 (Offline-first / Finalization)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L87)
- [schema.ts - Outbox queue table definition](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L103)
- [ADR 0007: Snapshot Sync Semantics](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0007-snapshot-sync-semantics.md)

## Prototype Lessons & Context
Study the `tickTime` timeout logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L534-L592) (deleting single points after 20 minutes) and the validation rules in [validateSnapshot](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L594-L638) (requiring notes and complete sets before finalization). Also calculate performance deltas.

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
