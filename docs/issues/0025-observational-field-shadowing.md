# Observational Field Shadowing & Ergonomic Audits

## Type
HITL

## Assigned Agents
- `/agency-ux-researcher` (field shadowing and interview methodology)
- `/agency-ux-architect` (mechanical button and LED accessibility recommendations)

## Reference Docs
- [personas.md - Section 3 (8 Critical Field-Behavior Questions)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/personas.md#L55)
- [personas.md - Section 4 & 5 (Persona profiles)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/personas.md#L69)

## Prototype Lessons & Context

Field shadowing will validate the button-press timeouts (20 minutes) modeled in the [prototype state-machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L534) and determine if attics or high-glare environments require display adjustments.

This task corresponds to the existing [Mobile Camera Scanner & OCR Flow](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/ui-ocr-scanner) prototype.

## What to build
Conduct three field-shadowing sessions with residential HVAC service technicians (matching Lead Tech and Apprentice profiles) during active service calls. Evaluate safety glove usage, display readability under bright direct sunlight vs dark attics, and hands-free holding preferences.

## Acceptance criteria
- [ ] Three field-shadowing sessions are completed with detailed logs documenting tech workflows.
- [ ] Audit reports delivered evaluating physical button pressing with leather safety gloves.
- [ ] LED flashing frequency and brightness limits are adjusted to be visible under rooftop glare.
- [ ] Design specifications are finalized for magnetic mounting backs or lanyard attachments to support hands-free climbing.

## Blocked by
None - can start immediately

## User stories covered
N/A (User Research)

## Testing Guidance

### Unit Testing
- **Survey Logic**: Verify shadowing questionnaire options and database insertions.
- **Action Logging**: Test speed-calculation triggers based on user interaction timestamps.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record technician task duration baselines.
- **Behavioral & Data Baseline**:
  - Freeze field research checklists.

### Integration & Manual Verification
- **Shadowing Execution**: Complete field observational sessions with technicians.
- **Feedback Collection**: Verify user interface feedback matches observed task execution bottlenecks.

## Definition of Done (DoD)
- [ ] **Shadowing Completed**: Observation logs are parsed and summarized.
- [ ] **UX Insights**: Backlog tickets are created for critical workflow delays.
- [ ] **Stakeholder Signoff**: Product manager reviews and signs off on insights.
