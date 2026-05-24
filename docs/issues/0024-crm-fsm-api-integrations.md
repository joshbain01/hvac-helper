# FSM API Integration Scoping & CRM Partnerships

## Type
HITL

## Assigned Agents
- `/agency-backend-architect` (API integration architecture & data mapping)
- `/agency-outbound-strategist` (FSM app store developer accounts access)

## Reference Docs
- [go-to-market-v0.md - Section 2 & 5 (FSM integration)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L72)
- [ADR 0013: Cloudless WAN Sync via Local Office Server & Secure Tunnels](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0013-local-lan-sync-for-office.md)
- [api-v1-snapshots.md - API Specification](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md)

## Prototype Lessons & Context
The snapshot upload endpoint `/api/v1/snapshots` returns finalized JSON snapshots containing calculation outputs. The integration worker must transform this payload into format expected by ServiceTitan and Housecall Pro APIs.

This task is validated by the planned [FSM Webhook Integration & Custom Fields Mapper](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#6-planned-fsm-webhook-integration--custom-fields-mapper-logic-prototype) (`prototype/logic-fsm-sync`) prototype.

## What to build
Scope direct integration connections with Field Service Management (FSM) platforms (ServiceTitan, Housecall Pro). Apply for developer sandbox accounts, audit developer access fees, and design the webhook mapping structures that sync snapshot fields directly to work order invoices.

## Acceptance criteria
- [ ] Developer sandbox accounts for ServiceTitan and Housecall Pro are successfully registered.
- [ ] FSM API limitations (rate limits, custom field boundaries) are audited and documented.
- [ ] Recurring developer/app store transaction fees are verified and added to the software operating model.
- [ ] Snapshot JSON payload mappings are designed to link serial numbers and before/after charge levels to FSM jobs.

## Blocked by
None - can start immediately

## User stories covered
User Story 8 (Finalize Snapshot & Send to Office - integration)

## Testing Guidance

### Unit Testing
- **CRM Payloads**: Test CRM serialization structures.
- **Webhook Handlers**: Validate webhook request signatures and format checks.
- **Queue Synchronization**: Test webhook retry queues and sync status updates.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure webhook process execution latency and database write speed.
  - Track response latency of third-party CRM APIs under concurrent loads.
- **Behavioral & Data Baseline**:
  - Capture and freeze the outgoing CRM integration payload schema.

### Integration & Manual Verification
- **Live Sync**: Finalize a snapshot in the application, verify it triggers HubSpot syncing, and check fields match.
- **Conflict Handling**: Verify that conflicting technician logs are handled gracefully by the sync engine.

## Definition of Done (DoD)
- [ ] **Payload Conformance**: Payloads match the third-party schema specifications exactly.
- [ ] **Unit Tests**: Serialization modules, webhook handlers, and parsing utilities pass testing.
- [ ] **Token Security**: Verification that API keys are stored in secure environment parameters.
