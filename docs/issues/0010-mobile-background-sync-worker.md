# Mobile Background Sync Worker & Revision Inheritance

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Background worker task scheduling, Revision UI flow, sync drawer UI)
- `/agency-backend-architect` (Idempotency and API sync validation, HMAC request signing)
- `/agency-software-architect` (cloning boundary verification)

## Reference Docs
- [PRD.md - Section 5, 6.3 & 8.3 (Background Sync, Revisions, & Auth)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L64-L104)
- [schema.ts - SQLite Schema (outboxQueue)](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L103)
- [ADR 0012: Revision Inheritance and OCR Telemetry](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0012-revision-inheritance-and-ocr-telemetry.md)
- [ADR 0013: Cloudless WAN Sync via Local Office Server & Secure Tunnels](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0013-local-lan-sync-for-office.md)

## Prototype Lessons & Context
Incorporate the revision inheritance logic from `createRevisionOf` in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L736-L755). When revising, clone all measurements and calculations into the new draft, increment the revision count, and establish a link via the parent ID.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [SQLite Outbox Sync Status & Error States](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#10-planned-sqlite-outbox-sync-status--error-states-ui-prototype) (`prototype/ui-outbox-sync`) prototype.

## What to build
Implement background synchronization inside the mobile app to sync snapshots in the outbox to the local office server. Implement a background worker (App Refresh on iOS / WorkManager on Android) that monitors network connectivity and uploads queued snapshots. Build the client Revision creation feature, allowing technicians to create a new revision of a synced snapshot that inherits all parent measurements and calculations.

Additionally, implement active job scope caching (pruning local SQLite records for customers/sites not on the technician's upcoming 7-day schedule), request signature generation (HMAC-SHA256 request signing using the provisioned key and a millisecond timestamp), and an explicit sync drawer UI (with haptic/acoustic feedback).

## Acceptance criteria
- [ ] Background worker triggers automatically on network recovery, attempting to upload finalized snapshots from `outbox_queue`.
- [ ] Outgoing sync payloads are signed using an HMAC-SHA256 signature containing a client-generated millisecond timestamp.
- [ ] Successful upload updates local SQLite status to `Synced` and cleans the outbox queue.
- [ ] Failed uploads increment retry counts and log errors in `outbox_queue.errorMessage`.
- [ ] Creating a snapshot Revision clones all parent readings/calculations, increments the revision count, sets status to `DRAFT`, and references the parent snapshot ID.
- [ ] Local SQLite db prunes historical records and notes for customers/sites not on the technician's upcoming 7-day schedule to prevent bloat.
- [ ] Mobile UI features a sync drawer progress tray showing active sync queue count and progress.
- [ ] Sync completion triggers a dual-tap haptic pulse (150ms) and acoustic chime, while failures display a red warning banner.

## Blocked by
[0009-cloud-snapshots-api.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0009-cloud-snapshots-api.md)

## User stories covered
User Story 11 (Store Snapshots Offline), User Story 12 (Submit Diagnostic-Only Snapshots), User Story 13 (Finalize and Submit Completed Repairs)

## Testing Guidance

### Unit Testing
- **Work Manager Setup**: Verify configuration params (network requirement, battery status) of the background worker.
- **Retry Backoff**: Test that background sync retries increment wait delays exponentially on network failure.
- **State Listeners**: Test execution outcomes when network status changes mid-sync.
- **Sync Telemetry Generation**: Test that sync events (success/latency and HTTP/network failures) output a valid `SYNC` telemetry event mapping to ADR 0014 specifications.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record mobile app battery usage impact when the background sync worker runs.
  - Benchmark database query time for large queue lookups during background execution.
- **Behavioral & Data Baseline**:
  - Freeze the sync session logger payload format to verify sync statistics.
  - Freeze the sync telemetry database payload schema.

### Integration & Manual Verification
- **Background Synchronization**: Finalize snapshots, minimize the app to background, simulate internet restoration, and check database updates on the server.
- **Lock Management**: Confirm SQLite database is not locked by the background process when UI queries run.
- **Sync Failure Ingestion**: Force the mock backend to return 500/503 errors and verify that the worker logs the outbox depth, status code, and retry count to the local SQLite `telemetry_logs` table.

## Definition of Done (DoD)
- [ ] **OS Compliance**: Background sync complies with Apple/Android battery usage guidelines.
- [ ] **Unit Tests**: Sync scheduler configs and retry backoffs pass unit testing.
- [ ] **Data Safety**: Verification that interrupted background sync processes do not lock database files or leave records in corrupt states.
- [ ] **Telemetry Audit**: Verified that sync performance metrics and HTTP failures write structured events to SQLite.
