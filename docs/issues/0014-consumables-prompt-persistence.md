# Consumables Prompt & Persistence

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Drizzle JSON mapping, UI selection lists)
- `/agency-ai-engineer` (LLM prompt engineering for consumable extraction)

## Reference Docs
- [PRD.md - Section 4 & 6 (Consumables requirement)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L59)
- [schema.ts - SQLite Schema (`consumablesItemizedJson`)](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L32)

## Prototype Lessons & Context
Model this off the consumables property array in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L132) which is confirmed and persisted inside the snapshot.

## What to build
Implement the consumables checklist step. After confirming the work description, the app parses the description using LLM logic to suggest consumables used (e.g. refrigerant added, filters, seals). The technician confirms or edits this checklist, and the selections are serialized as JSON and saved under `consumablesItemizedJson` in the SQLite database snapshot record.

## Acceptance criteria
- [ ] LLM processes note descriptions to isolate potential consumables.
- [ ] A checklist of itemized consumables with quantities is presented to the technician.
- [ ] Technician confirms/edits quantities.
- [ ] Final selections serialize to JSON and are stored in the database field `consumables_itemized_json`.

## Blocked by
[0013-on-device-llm-note-expansion.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0013-on-device-llm-note-expansion.md)

## User stories covered
User Story 5 (Consumables Prompt)
