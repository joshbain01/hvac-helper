# On-Device LLM Note Expansion

## Type
AFK

## Assigned Agents
- `/agency-ai-engineer` (Model deployment, ZDR gateway routing, prompt engineering)
- `/agency-mobile-app-builder` (Voice interface, text editor integration)
- `/agency-compliance-auditor` (Zero Data Retention verification)

## Reference Docs
- [PRD.md - Section 4 & 6 (LLM & RAG architecture)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L56)
- [CONTEXT.md - LLM Interaction definition](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L89)
- [ADR 0006: LLM Hosting: Cloud vs. On-Device](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0006-llm-hosting-cloud-vs-on-device.md)

## Prototype Lessons & Context
Ensure that note finalization behavior matches the validation checklist. The prototype [validateSnapshot](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L598-L601) enforces that `technician_notes` are populated before finalization is allowed.

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
