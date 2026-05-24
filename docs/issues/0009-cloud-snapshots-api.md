# Cloud Backend MVP Snapshots API & JWT Auth

## Type
AFK

## Assigned Agents
- `/agency-backend-architect` (Express/Node API, cloud schema modeling)
- `/agency-security-engineer` (JWT authentication, TLS 1.3 config)

## Reference Docs
- [PRD.md - Section 9 (Technical Considerations / API)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L135)
- [api-v1-snapshots.md - API Specification](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md)
- [ADR 0008: Cloud Authentication](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0008-cloud-auth.md)

## Prototype Lessons & Context
Ensure the API structure matches the JSON schema validation modeled in [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md). The backend represents the destination database where Outbox sync uploads complete.

## What to build
Design and build the Node/Express backend MVP REST API. Establish the POST `/api/v1/snapshots` endpoint, complete with schema validation checking the incoming payload structure, JWT token security, Prometheus monitoring hooks, and JSON structured logging.

## Acceptance criteria
- [ ] REST endpoint POST `/api/v1/snapshots` is developed and handles snapshot uploads.
- [ ] Incoming JSON payloads are validated against the formal schema structure defined in [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md).
- [ ] Endpoint requires authentication using a valid, short-lived JWT token.
- [ ] API includes a structured logging library writing log records in JSON format containing timestamp, level, and requestId.
- [ ] Prometheus health endpoint `/healthz` and `/metrics` are exposed.

## Blocked by
[0008-snapshot-finalization-outbox.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0008-snapshot-finalization-outbox.md)

## User stories covered
User Story 8 (complete)
