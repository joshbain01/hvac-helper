# 10-Tech Closed Beta Recruitment & Baseline Logging

## Type
HITL

## Assigned Agents
- `/agency-ux-researcher` (beta feedback loops, surveys design)
- `/agency-product-manager` (ROI performance readouts definition)

## Reference Docs
- [go-to-market-v0.md - Section 4 (Closed Beta Plan)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L148)

## Prototype Lessons & Context

Closed beta will run the physical prototypes through the multi-attempt BLE connection cycles and outbox persistence simulated in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L711-L734).

This task corresponds to the existing [Mobile Camera Scanner & OCR Flow](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/ui-ocr-scanner) prototype.

## What to build
Recruit 10 field technicians across 3 HVAC service businesses for the Closed Beta phase. Establish baseline performance logging for traditional methods (capture time, error rates, admin overhead) before deploying the physical tools in Week 2.

## Acceptance criteria
- [ ] 10 active residential technicians are enrolled in the 6-week beta program.
- [ ] Baseline logs are completed: record traditional capture times (target baseline: 12 minutes) and incomplete record rates (target baseline: 22%).
- [ ] Signed pilot-partner agreements are obtained, detailing equipment returns and conversion purchase options.

## Blocked by
[0025-observational-field-shadowing.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0025-observational-field-shadowing.md)

## User stories covered
N/A (UX & Sales Proof)

## Testing Guidance

### Unit Testing
- **Applicant Screening**: Test filtering algorithms for candidate selection.
- **Survey persistence**: Verify SQLite storage of questionnaire feedback.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Monitor signup page performance and loading times.
- **Behavioral & Data Baseline**:
  - Capture and freeze recruitment screening questionnaires.

### Integration & Manual Verification
- **Technician Onboarding**: Verify onboarding flows and check support channels.
- **Kit Tracking**: Confirm that beta kits are mapped to correct candidates.

## Definition of Done (DoD)
- [ ] **Beta Pool**: 10 qualified technicians are recruited and onboarded.
- [ ] **Contract Completion**: Non-disclosure agreements and beta terms are signed.
- [ ] **Kit Distribution**: Hardware tracker logs confirm delivery of all beta units.
