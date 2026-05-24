# HVAC Helper Pro: API v1 Snapshots Spec

This document details the OpenAPI 3.1.0 specification excerpt for the `POST /api/v1/snapshots` endpoint.

---

## 1. Idempotency & Revision Control Flow

To ensure data integrity in intermittent connectivity field environments, the API implements two core mechanisms:

### A. Idempotency (via `Idempotency-Key` Header)
* The client (mobile app) **MUST** send a unique UUID header named `Idempotency-Key` with every request.
* If a request times out or fails at the network level, the client should retry sending the exact same payload with the **same** `Idempotency-Key`.
* The server caches responses in a fast key-value store (e.g., Redis) with a **24-hour Time-to-Live (TTL)**.
* **Cache Hits (`200 OK`)**: Retried requests return the exact stored status and body from the cache, bypassing database transactions. The header `X-Cache-Lookup: HIT` is appended.
* **Concurrent Lock (`409 Conflict` or custom headers)**: If a duplicate request is received while the first one is still processing, the server blocks execution and warns the client to prevent race conditions.

### B. Revision Control (Optimistic Locking via `revision` Field)
* The server maintains the master copy of the snapshot and tracks modifications via the `revision` field (an integer starting at `1`).
* When the technician edits notes or captures more measurements in the app, the client increments the `revision` field by `1` and submits a new request with a **new** `Idempotency-Key`.
* **Out-of-Order Retries**: If the server receives an incoming request with a `revision` that is less than or equal to the currently stored revision for that `snapshot_id`, it rejects the write with a `409 Conflict` error to prevent overwriting newer changes with stale data.
* **State Locking**: Once a Snapshot status transitions to `COMPLETED` or `DIAGNOSTIC_COMPLETE`, it is considered sealed. Any subsequent updates to that `snapshot_id` will return a `409 Conflict` unless sent with a higher revision to an explicit edit/unlock endpoint (or if allowed by system settings, which is not supported in v1).

---

## 2. OpenAPI Specification (YAML)

```yaml
openapi: 3.1.0
info:
  title: HVAC Helper Pro Cloud API
  version: 1.0.0
  description: Cloud synchronization endpoints for HVAC troubleshooting measurements.
paths:
  /api/v1/snapshots:
    post:
      summary: Upload or update a service call measurement snapshot
      description: |
        Accepts a technician's HVAC measurements snapshot.
        Enforces idempotency using the mandatory `Idempotency-Key` header.
        Supports creation of drafts, diagnostic-only completions, and full before/after snapshots.
      security:
        - BearerAuth: []
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          description: A unique client-generated UUID to guarantee execution safety across network retries.
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              oneOf:
                - $ref: '#/components/schemas/SnapshotDraft'
                - $ref: '#/components/schemas/SnapshotDiagnosticComplete'
                - $ref: '#/components/schemas/SnapshotCompleted'
      responses:
        '202':
          description: Snapshot accepted and queued for processing successfully.
          headers:
            Idempotency-Key:
              description: Echoes the unique key provided.
              schema:
                type: string
                format: uuid
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/SnapshotDraft'
                  - $ref: '#/components/schemas/SnapshotDiagnosticComplete'
                  - $ref: '#/components/schemas/SnapshotCompleted'
        '200':
          description: Idempotent request. Returns cached original response.
          headers:
            Idempotency-Key:
              schema:
                type: string
                format: uuid
            X-Cache-Lookup:
              description: Indicates an idempotency hit.
              schema:
                type: string
                example: HIT
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/SnapshotDraft'
                  - $ref: '#/components/schemas/SnapshotDiagnosticComplete'
                  - $ref: '#/components/schemas/SnapshotCompleted'
        '400':
          description: Validation error. Returns array of payload errors (e.g. invalid ranges, type mismatches).
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: Unauthorized. Missing or invalid Bearer JWT.
        '409':
          description: Conflict. Sent when trying to overwrite a snapshot with an older revision, or updating a completed snapshot.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '500':
          description: Internal server error.

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    ErrorResponse:
      type: object
      required:
        - error
        - message
      properties:
        error:
          type: string
          example: VALIDATION_FAILED
        message:
          type: string
          example: "return_air.temp must be a number with at most 1 decimal place."
        details:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
                example: "before_set.return_air.temp"
              issue:
                type: string
                example: "Value 72.54 exceeded precision limit."

    # BASE SNAPSHOT STRUCTURE (Used as a starting point)
    SnapshotBase:
      type: object
      required:
        - snapshot_id
        - schema_version
        - status
        - revision
        - technician_id
        - job_id
        - customer_id
        - refrigerant
        - created_at
        - updated_at
      properties:
        snapshot_id:
          type: string
          format: uuid
        schema_version:
          type: integer
          example: 1
        status:
          type: string
          enum: [DRAFT, DIAGNOSTIC_COMPLETE, COMPLETED]
        revision:
          type: integer
          example: 1
        technician_id:
          type: string
          format: uuid
        job_id:
          type: string
          example: "JOB-99281-2026"
        customer_id:
          type: string
          example: "CUST-77491"
        site_id:
          type: string
          example: "SITE-0012"
        device_id:
          type: string
          example: "AA:BB:CC:DD:EE:FF"
        refrigerant:
          type: string
          example: "R-410A"
        technician_epa_license_number:
          type: string
          example: "EPA-608-998811"
        refrigerant_added_lbs:
          type: number
          example: 2.5
        refrigerant_recovered_lbs:
          type: number
          example: 0.0
        recovery_cylinder_id:
          type: string
          example: "CYL-883712"
        leak_inspection_performed:
          type: boolean
          example: true
        leak_verification_method:
          type: string
          example: "electronic"
        initial_verification_status:
          type: string
          enum: [PASSED, FAILED, NOT_APPLICABLE]
          example: "PASSED"
        followup_verification_status:
          type: string
          enum: [PASSED, FAILED, NOT_APPLICABLE]
          example: "NOT_APPLICABLE"
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time
        equipment:
          $ref: '#/components/schemas/Equipment'

    # DRAFT STATE: Optional before/after, data points are drafts (optional fields)
    SnapshotDraft:
      allOf:
        - $ref: '#/components/schemas/SnapshotBase'
        - type: object
          properties:
            status:
              type: string
              enum: [DRAFT]
            before_set:
              $ref: '#/components/schemas/DraftMeasurementSet'
            after_set:
              $ref: '#/components/schemas/DraftMeasurementSet'

    # DIAGNOSTIC STATE: Required equipment and complete before_set, optional after_set
    SnapshotDiagnosticComplete:
      allOf:
        - $ref: '#/components/schemas/SnapshotBase'
        - type: object
          required:
            - before_set
            - equipment
          properties:
            status:
              type: string
              enum: [DIAGNOSTIC_COMPLETE]
            before_set:
              $ref: '#/components/schemas/CompleteMeasurementSet'
            after_set:
              $ref: '#/components/schemas/DraftMeasurementSet'

    # COMPLETED STATE: Required equipment, complete before_set AND complete after_set
    SnapshotCompleted:
      allOf:
        - $ref: '#/components/schemas/SnapshotBase'
        - type: object
          required:
            - before_set
            - after_set
            - equipment
          properties:
            status:
              type: string
              enum: [COMPLETED]
            before_set:
              $ref: '#/components/schemas/CompleteMeasurementSet'
            after_set:
              $ref: '#/components/schemas/CompleteMeasurementSet'

    # EQUIPMENT DEFINITION
    Equipment:
      type: object
      required:
        - model_number
        - serial_number
      properties:
        unit_id:
          type: string
          example: "EQ-88371"
        model_number:
          type: string
          example: "GSXC160361"
        serial_number:
          type: string
          example: "1608298711"
        manufacturer:
          type: string
          example: "Goodman"
        equipment_type:
          type: string
          example: "Split AC Condenser"

    # DRAFT SET: Measurements and calculations are optional
    DraftMeasurementSet:
      type: object
      properties:
        captured_at:
          type: string
          format: date-time
        return_air:
          $ref: '#/components/schemas/ReturnAirDraft'
        supply_air:
          $ref: '#/components/schemas/AirPointDraft'
        outdoor_ambient:
          $ref: '#/components/schemas/AirPointDraft'
        discharge_air:
          $ref: '#/components/schemas/AirPointDraft'
        suction_line:
          $ref: '#/components/schemas/LinePointDraft'
        liquid_line:
          $ref: '#/components/schemas/LinePointDraft'
        calculations:
          $ref: '#/components/schemas/CalculationsSet'

    # COMPLETE SET: All 6 slots and calculations are required
    CompleteMeasurementSet:
      allOf:
        - $ref: '#/components/schemas/DraftMeasurementSet'
        - type: object
          required:
            - captured_at
            - return_air
            - supply_air
            - outdoor_ambient
            - discharge_air
            - suction_line
            - liquid_line
            - calculations
          properties:
            return_air:
              $ref: '#/components/schemas/ReturnAirComplete'
            supply_air:
              $ref: '#/components/schemas/AirPointComplete'
            outdoor_ambient:
              $ref: '#/components/schemas/AirPointComplete'
            discharge_air:
              $ref: '#/components/schemas/AirPointComplete'
            suction_line:
              $ref: '#/components/schemas/LinePointComplete'
            liquid_line:
              $ref: '#/components/schemas/LinePointComplete'

    # POINT DATA SCHEMAS
    ReturnAirDraft:
      type: object
      properties:
        temp:
          type: number
          multipleOf: 0.1
        humidity:
          type: number
          multipleOf: 0.1
        captured_at:
          type: string
          format: date-time
        source:
          type: string
          enum: [sensor, manual_override]

    ReturnAirComplete:
      allOf:
        - $ref: '#/components/schemas/ReturnAirDraft'
        - type: object
          required: [temp, humidity, captured_at, source]

    AirPointDraft:
      type: object
      properties:
        temp:
          type: number
          multipleOf: 0.1
        captured_at:
          type: string
          format: date-time
        source:
          type: string
          enum: [sensor, manual_override]

    AirPointComplete:
      allOf:
        - $ref: '#/components/schemas/AirPointDraft'
        - type: object
          required: [temp, captured_at, source]

    LinePointDraft:
      type: object
      properties:
        pipe_temp:
          type: number
          multipleOf: 0.1
        captured_at:
          type: string
          format: date-time
        source:
          type: string
          enum: [sensor, manual_override]

    LinePointComplete:
      allOf:
        - $ref: '#/components/schemas/LinePointDraft'
        - type: object
          required: [pipe_temp, captured_at, source]

    CalculationsSet:
      type: object
      required:
        - evaporator_delta_t
        - suction_saturation_temp
        - liquid_saturation_temp
        - superheat
        - subcooling
      properties:
        evaporator_delta_t:
          type: number
          multipleOf: 0.1
          example: 11.4
        suction_saturation_temp:
          type: number
          multipleOf: 0.1
          example: 40.0
        liquid_saturation_temp:
          type: number
          multipleOf: 0.1
          example: 105.0
        superheat:
          type: number
          multipleOf: 0.1
          example: 18.0
        subcooling:
          type: number
          multipleOf: 0.1
          example: 17.0
```
