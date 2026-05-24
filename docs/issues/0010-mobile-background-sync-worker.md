# Mobile Background Sync Worker & Revision Inheritance

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Background worker task scheduling, Revision UI flow)
- `/agency-backend-architect` (Idempotency and API sync validation)
- `/agency-software-architect` (cloning boundary verification)

## Reference Docs
- [PRD.md - Section 6 & 8 (Offline sync and revisions)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L87)
- [schema.ts - SQLite Schema (outboxQueue)](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L103)
- [ADR 0012: Revision Inheritance and OCR Telemetry](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0012-revision-inheritance-and-ocr-telemetry.md)

## Prototype Lessons & Context
Incorporate the revision inheritance logic from `createRevisionOf` in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L736-L755). When revising, clone all measurements and calculations into the new draft, increment the revision count, and establish a link via the parent ID.

## What to build
Implement background synchronization inside the mobile app to sync snapshots in the outbox. Implement a background worker (App Refresh on iOS / WorkManager on Android) that monitors network connectivity and uploads queued snapshots. Build the client Revision creation feature, allowing technicians to create a new revision of a synced snapshot that inherits all parent measurements and calculations to avoid recapturing data.

## Acceptance criteria
- [ ] Background worker triggers automatically on network recovery, attempting to upload finalized snapshots from `outbox_queue`.
- [ ] Successful upload updates local SQLite status to `Synced` and cleans the outbox queue.
- [ ] Failed uploads increment retry counts and log errors in `outbox_queue.errorMessage`.
- [ ] Creating a snapshot Revision clones all parent readings/calculations, increments the revision count, sets status to `DRAFT`, and references the parent snapshot ID.

## Blocked by
[0009-cloud-snapshots-api.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0009-cloud-snapshots-api.md)

## User stories covered
User Story 8 (complete)
