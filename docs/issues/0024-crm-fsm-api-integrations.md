# FSM API Integration Scoping & CRM Partnerships

## Type
HITL

## Assigned Agents
- `/agency-backend-architect` (API integration architecture & data mapping)
- `/agency-outbound-strategist` (FSM app store developer accounts access)

## Reference Docs
- [go-to-market-v0.md - Section 2 & 5 (FSM integration)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L72)
- [api-v1-snapshots.md - API Specification](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md)

## Prototype Lessons & Context
The snapshot upload endpoint `/api/v1/snapshots` returns finalized JSON snapshots containing calculation outputs. The integration worker must transform this payload into format expected by ServiceTitan and Housecall Pro APIs.

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
