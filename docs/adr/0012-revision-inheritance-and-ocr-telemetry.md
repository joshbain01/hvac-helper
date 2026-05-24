# 12. Revision Inheritance and OCR Telemetry

**Status**: Accepted  
**Date**: 2026-05-24  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-product-manager` (Product Manager) + `@agency-backend-architect` (Backend Architect)  

## Context

Technicians occasionally need to correct mistakes on completed and finalized service records. 
- In the original design, finalized snapshots were immutable, and corrections required creating a new revision.
- However, if the technician had to re-capture all twelve measurements just to update a note or correct a typo in a model number, the friction would prevent them from submitting updates, leading to stale database records.
- Additionally, equipment model and serial numbers are captured via mobile-app camera OCR. OCR is error-prone due to dirty, scratched, or sun-faded nameplates. We need a way to track OCR failure rates in the field to prioritize model retraining or alternate scanner SDKs.

## Decision

We will implement:
1. **Full Revision Inheritance**:
   - Creating a **Revision** of a finalized snapshot clones all parent snapshot data (including Before Set, After Set, calculations, and metadata).
   - The technician is presented with a fully populated draft where they can modify the notes, consumables, or equipment details without re-capturing any physical measurements.
   - The new revision is linked to the parent snapshot via a `parent_id` field and uploaded as a new audit log.

2. **OCR Status Tracking & Telemetry**:
   - Add an `ocr_status` field to the snapshot schema, with enum values: `PENDING`, `OCR_SUCCESS`, `MANUAL_OVERRIDE`.
   - The status starts as `PENDING`. On a successful scan, it transitions to `OCR_SUCCESS`.
   - If a technician manually overrides the model or serial number fields, the status transitions to `MANUAL_OVERRIDE`.
   - Changing the status to `MANUAL_OVERRIDE` writes a diagnostic log event `OCR_MANUAL_OVERRIDE` in the non-volatile storage (NVS) logs, which is synced to the backend to help product teams measure and improve OCR accuracy over time.

## Hard Questions (5-Year Perspective)

> [!WARNING]
> **1. Data Integrity and Auditing:** If a revision clones all parent data and allows modification, could a technician fraudently edit raw sensor measurements post-service to pass an inspection?
> *Recommended Answer*: No. Raw sensor measurements (`before_set` and `after_set` values) are locked as read-only once a snapshot is finalized. The mobile application UI does not expose edit controls for sensor readings in a revision; it only permits editing notes, consumables, and equipment metadata. The database maintains the parent-child relationship (`parent_id`) for audit traceability.
> 
> **2. Telemetry Ingestion Scale and Cost:** If thousands of devices log every manual override, will it flood our backend and increase cloud hosting costs?
> *Recommended Answer*: The `OCR_MANUAL_OVERRIDE` log event is a lightweight, structured JSON payload (under 100 bytes) containing the anonymized device ID, OCR accuracy metadata (confidence scores), and character length. It is batched with standard diagnostic telemetry, resulting in negligible network and storage costs.
> 
> **3. Offline Cache Constraints:** Since revisions clone all parent data, does this increase the memory footprint of the mobile app's offline SQLite database?
> *Recommended Answer*: Yes, but the impact is minimal. A complete snapshot payload is approximately 1.5 KB. Even with hundreds of offline revisions, the total storage remains under 1 MB, which is well within standard mobile application limits.

## Alternatives Considered

- **Blank-Slate Revisions**: Forcing the technician to recapture all readings. Rejected due to extreme user friction.
- **Delta-Only Revisions**: Uploading only the modified fields. Rejected because it complicates backend query logic (requiring database joins to construct the latest state of a snapshot) and increases API integration bugs.
- **No OCR Telemetry**: Allowing manual overrides without logging. Rejected because we would have no way to quantify how well the on-device scanner performs on real service tags under varying lighting conditions.

## Cost of Being Wrong

If this model creates database inconsistencies or compliance issues:
- **API and Schema Migrations**: Modifying the snapshot schema to move from a parent-child inheritance model to a delta-only model would require major migrations on both the client SQLite and backend databases, taking 2–3 weeks of engineering time.
- **Lost Training Data**: Without manual override telemetry, we lose critical signals needed to optimize our OCR and LLM tag-parsing models.
