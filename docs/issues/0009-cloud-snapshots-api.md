# Local Office Server Snapshots API & HMAC Auth

## Type
AFK

## Assigned Agents
- `/agency-backend-architect` (Express/Node API, SQLite schema modeling)
- `/agency-security-engineer` (HMAC signature verification, Cloudflare Tunnel config)

## Reference Docs
- [PRD.md - Section 6.4 & 8.3 (API & Transport Security)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L152-L161)
- [api-v1-snapshots.md - API Specification](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md)
- [ADR 0013: Cloudless WAN Sync via Local Office Server & Secure Tunnels](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0013-local-lan-sync-for-office.md)

## Prototype Lessons & Context
Ensure the API structure matches the JSON schema validation modeled in [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md). The backend represents the local master database where Outbox sync uploads complete.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [FSM Webhook Integration & Custom Fields Mapper](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#6-planned-fsm-webhook-integration--custom-fields-mapper-logic-prototype) (`prototype/logic-fsm-sync`) prototype.

## What to build
Design and build the Node/Express local office sync server. Establish the POST `/api/v1/snapshots` endpoint with schema validation checking the incoming payload structure, HMAC-SHA256 signature security (validating request timestamps within a 300s window), local compressed photo storage directory, and daily automated database and image compression backups. Expose the API to the public internet securely using Cloudflare Tunnels (`cloudflared`).

## Acceptance criteria
- [ ] Local sync REST endpoint POST `/api/v1/snapshots` is developed on an Express/Node server and persists records in a local SQLite master database.
- [ ] Incoming JSON payloads are validated against the formal schema structure defined in [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md).
- [ ] API request authentication is handled via HMAC-SHA256 signature verification with a 300-second window to prevent replay attacks.
- [ ] Office server processes and saves compressed photo uploads in a local directory.
- [ ] Daily automated database backup and image compression archive task is scheduled.
- [ ] Endpoint deactivation/technician offboarding capability is implemented (administrators can revoke keys).
- [ ] Endpoint can be accessed securely from the WAN via Cloudflare Tunnel daemon routing.

## Blocked by
[0008-snapshot-finalization-outbox.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0008-snapshot-finalization-outbox.md)

## User stories covered
User Story 14 (Process Invoices and Claims)

## Testing Guidance

### Unit Testing
- **API Controllers**: Supertest/Jest tests checking snapshot POST/GET handlers and auth validation.
- **Input Sanitization**: Validate request body validators reject missing variables or wrong schema formats.
- **Error Handlers**: Check status codes (400, 401, 403, 500) and response formats.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure API request throughput (RPS) and latency benchmarks (mean, p95 $\le$ 200ms) under simulated load.
  - Track database connection pool saturation rate under concurrent writes.
- **Behavioral & Data Baseline**:
  - Freeze an OpenAPI spec document matching the live route behavior to detect schema regressions.

### Integration & Manual Verification
- **E2E Sync**: Transmit snapshots from a mobile client and verify the persistence inside the cloud database.
- **Auth Rejection**: Attempt requests with invalid tokens and verify they are blocked with code 401.

## Definition of Done (DoD)
- [ ] **API Security**: Verified that CORS policies, helmet headers, and database credentials are secure.
- [ ] **Unit Tests**: API routing, payload parsing, and validator tests pass.
- [ ] **OpenAPI Sync**: Verification that API schemas match [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md) properties.
