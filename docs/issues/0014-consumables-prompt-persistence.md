# Consumables Prompt & Persistence

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Drizzle JSON mapping, UI selection lists)
- `/agency-ai-engineer` (LLM prompt engineering for consumable extraction)

## Reference Docs
- [PRD.md - Section 6.3 & 7 (Consumables Prompt)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L135-L151)
- [schema.ts - SQLite Schema (`consumablesItemizedJson`)](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L32)

## Prototype Lessons & Context
Model this off the consumables property array in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L132) which is confirmed and persisted inside the snapshot.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [LLM Work Note & Consumables Checklist](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#3-planned-llm-work-note--consumables-checklist-ui-prototype) (`prototype/ui-llm-notes`) prototype.

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

## Testing Guidance

### Unit Testing
- **Consumables Storage**: Verify SQLite queries for alert thresholds, logs, and prompt states.
- **Trigger Logic**: Validate that prompt conditions trigger exactly when target variables exceed thresholds.
- **Persistence State**: Test alert status variables across simulated app cycles.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record storage write latency under high-frequency notifications.
  - Track memory overhead of the alert listener loop.
- **Behavioral & Data Baseline**:
  - Snapshot the alert prompt configuration layout to ensure consistent text styling.

### Integration & Manual Verification
- **Threshold Alerts**: Simulate low levels of refrigerant and confirm the replenishment prompt displays.
- **Restart Check**: Verify dismissed prompts do not reappear on subsequent app restarts.

## Definition of Done (DoD)
- [ ] **Threshold Precision**: Prompts trigger exactly on threshold limit crossings.
- [ ] **Unit Tests**: Alert triggers and DB storage operations pass unit testing.
- [ ] **Dismissal Persistence**: Verification that prompt status updates in SQLite instantly.
