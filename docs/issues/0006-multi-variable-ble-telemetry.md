# Multi-Variable BLE Telemetry & SQLite Calculations Persistence

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (BLE packet serialization)
- `/agency-mobile-app-builder` (GATT notify handlers, Drizzle ORM mapping)
- `/agency-software-architect` (data boundary definition)

## Reference Docs
- [PRD.md - Section 6 (BLE requirements)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L87)
- [snapshot-schema.md - Section 1 (Precision & Extensibility)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md#L9)
- [schema.ts - Measurement sets schema definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L52)

## Prototype Lessons & Context
Reference the `transmitDataPoint` telemetry updates in the [state-machine prototype](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L483-L495). Both the raw pipe temperature and the dialed saturation temperature are transmitted and recalculated inside the database records.

## What to build
Extend the BLE telemetry packet format to serialize multiple related readings (manual saturation temperatures, clamp pipe temperatures, and calculated thermodynamic outputs). Implement parsing logic in the React Native BLE layer and persist these measurements in the local Drizzle-SQLite database under the appropriate before/after sets.

## Acceptance criteria
- [ ] ESP32 packages SL/LL pipe temperature, saturation temperature, and calculated SH/SC/Delta T into a single binary/JSON payload.
- [ ] Mobile BLE service receives, parses, and validates the multi-variable payload (matching types defined in [schema.ts](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L52)).
- [ ] The parsed variables populate the SQLite `measurement_sets` database table linked to the active Draft snapshot.
- [ ] Mobile UI updates to display raw values, saturation inputs, and firmware-calculated metrics.

## Blocked by
[0005-push-to-capture-clamp-probes.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0005-push-to-capture-clamp-probes.md)

## User stories covered
User Story 2 (complete), User Story 6 (complete)
