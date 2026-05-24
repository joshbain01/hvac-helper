# On-Device LLM Note Expansion

## Type
AFK

## Assigned Agents
- `/agency-ai-engineer` (Model deployment, ZDR gateway routing, prompt engineering)
- `/agency-mobile-app-builder` (Voice interface, text editor integration)
- `/agency-compliance-auditor` (Zero Data Retention verification)

## Reference Docs
- [PRD.md - Section 6.3 & 7 (On-Device LLM Note Expansion)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L135-L151)
- [CONTEXT.md - LLM Interaction definition](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L89)
- [ADR 0006: LLM Hosting: Cloud vs. On-Device](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0006-llm-hosting-cloud-vs-on-device.md)

## Prototype Lessons & Context
Ensure that note finalization behavior matches the validation checklist. The prototype [validateSnapshot](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L598-L601) enforces that `technician_notes` are populated before finalization is allowed.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [LLM Work Note & Consumables Checklist](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#3-planned-llm-work-note--consumables-checklist-ui-prototype) (`prototype/ui-llm-notes`) prototype.

## What to build
Integrate on-device language models (Apple native language models / Android AICore system models) to expand free-form technician shorthand notes or voice dictation into structured, professional service descriptions. Establish a backend cloud LLM gateway fallback for older devices configured to enforce Zero Data Retention (ZDR).

## Acceptance criteria
- [ ] Technician can record notes via speech-to-text dictation or shorthand text input.
- [ ] Expansion executes locally on compatible devices; legacy devices fall back to cloud API.
- [ ] Cloud gateway requests enforce Zero Data Retention (no logging, data deletion post-execution).
- [ ] The generated paragraph description is presented to the technician for editing and confirmation before saving to SQLite.

## Blocked by
[0008-snapshot-finalization-outbox.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0008-snapshot-finalization-outbox.md)

## User stories covered
User Story 4 (LLM Interaction for Work Description), User Story 101 (Voice-to-Text & Deferred Input)

## Testing Guidance

### Unit Testing
- **Prompt Engineering**: Test local NLP prompt layouts, verifying baseline variables are correctly bound.
- **Truncation Logic**: Test note length boundary constraints to prevent overflow of context windows.
- **Output Cleanups**: Test sanitization rules that strip LLM markdown/tags from finalized notes.
- **LLM Telemetry Event**: Verify that model loading durations, execution durations, and fallback occurrences generate a valid `LLM` telemetry payload matching ADR 0014 specifications.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure model load time, peak RAM footprint, and inference execution speed benchmarks on target mobile processors.
  - Monitor battery drain spikes during local LLM model execution.
- **Behavioral & Data Baseline**:
  - Freeze a standard set of shorthand notes and evaluate LLM expansion accuracy/semantics comparison scores.
  - Freeze the local LLM telemetry payload schema.

### Integration & Manual Verification
- **Note Expansion**: Type shorthand notes in the wizard, trigger expansion, and verify a readable, structured report outputs.
- **Fallback Flow**: Disable model loading (e.g. simulate low memory device) and verify that system falls back gracefully to raw text.
- **Inference Failure Ingestion**: Simulate an out-of-memory or timeout error during local model inference, and verify that the system generates a `telemetry_logs` record mapping the duration, character count, and fallback status.

## Definition of Done (DoD)
- [ ] **Performance Gate**: Local model execution operates off the main UI thread to prevent UI freezing.
- [ ] **Unit Tests**: Note formatting, parsing, and context binding suites pass Jest.
- [ ] **Memory Ceiling**: Code review confirms LLM memory space does not exceed allocations causing crash-on-low-memory states.
- [ ] **Telemetry Audit**: Verified that LLM execution durations, status results, and OOM fallbacks write structured events to SQLite.
