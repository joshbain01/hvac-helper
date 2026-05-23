# 7. Snapshot Sync Semantics

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Role**: `@agency-engineering-software-architect` (Software Architect)  

## Context

Technicians capture measurement sets (Snapshots) containing a Before Set and an After Set. These must be saved locally and eventually synchronized to the cloud. Because technicians often work in locations without network connectivity, the synchronization mechanism must be highly robust, prevent data loss, support corrections, and maintain an audit log for compliance (e.g., EPA Section 608 requires keeping records for 3 years).

## Decision

We will implement an offline-first state machine for Snapshots:
1. **Draft State**: Saved locally in the client SQLite database; mutable and editable.
2. **On-Device Pre-Structuring**: The technician's notes, dictation, and tag OCR are parsed, structured, and itemized *on-device* using local language models. The technician reviews and validates the completed snapshot locally before submission.
3. **Finalized State**: Once validated, the snapshot becomes **Immutable** on the client and is queued in the persistent local **Outbox** table.
4. **Synced State**: Successfully uploaded to the cloud database. The server API `/api/v1/snapshots` acts as an idempotent replication receiver, immediately queueing the payload into an asynchronous message queue (e.g., AWS SQS or Redis bull-queue) and returning a `202 Accepted` response. Background workers process the queue to perform database persistence and third-party FSM (e.g., ServiceTitan) synchronization. FSM outages/failures trigger automated worker retries with exponential backoff, routing persistent failures to a Dead Letter Queue (DLQ) for administrative intervention.
5. **Revisions**: Once finalized, a snapshot cannot be modified. Any subsequent corrections create a new **Revision** snapshot referencing the parent UUID, preserving an immutable audit trail.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Schema Migration of Un-synced Local Data:** Over five years, the local database schema will evolve. If a technician has un-synced finalized snapshots sitting in their Outbox, and they update the app, we must perform database migrations natively without corrupting the queue.
> 
> **2. Revision Chaining and Out-of-Order Sync:** If a technician works offline and makes multiple corrections to the same service record, the Outbox will contain the original Snapshot plus multiple Revision records. Revisions must be synced sequentially using parent UUID validation to prevent state deadlocks.
> 
> **3. Network Timeout and Duplicate Record Prevention (Idempotency):** If the network drops mid-transmission after the server writes the snapshot but before the client receives confirmation, the client retries. We will enforce idempotency keys (generated on the client during finalization) to prevent duplicate server writes.
> 
> **4. Database Bloat and Retention Enforcement:** Retaining snapshots locally for 3 years (EPA Section 608) will cause local database bloat. We will implement automatic pruning that moves local records older than 90 days to a highly compressed local read-only archive file, keeping the active SQLite table small.

## Alternatives Considered

- **Server-Side LLM Structuring**: The client uploads raw, unstructured notes, and the cloud backend runs LLM expansion and consumables itemization. Rejected because it prevents the technician from validating the structured work record while offline in cell-dead zones.
- **Server-Authoritative Online-Only Sync**: The app requires a live connection to capture or finalize data. Rejected because technicians frequently work in basements and utility rooms with zero reception.
- **Mutable Snapshots with Delta Sync**: Modifying existing snapshots directly and syncing only modified fields. This makes resolving conflict states extremely complex and destroys the audit trail required for EPA compliance.

## Cost of Being Wrong

If our sync semantics fail in production:
- **Data Corruption or Loss**: Technicians will lose hours of captured measurements during updates or sync failures, destroying user trust and delaying customer billing.
- **Regulatory Penalties**: Inability to construct a clean, immutable history of sensor corrections could fail EPA Section 608 audits, resulting in heavy fines for our service partners.
- **Database Bloat Performance Lag**: App search and dashboard queries will slow to a crawl on technicians' phones as database tables grow over years of active use.
