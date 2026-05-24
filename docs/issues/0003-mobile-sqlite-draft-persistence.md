# Mobile App SQLite Draft Persistence & Progress LED State Machine

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (SQLite/Drizzle persistence logic)
- `/agency-embedded-firmware-engineer` (GATT confirm handling, LED GPIO logic)
- `/agency-ux-architect` (design guidelines for color-blind LED readability)
- `/agency-accessibility-auditor` (LED and screen contrast review)

## Reference Docs
- [PRD.md - Section 5 & 6.3 (Snapshot States & Mobile Storage)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L64-L104)
- [schema.ts - SQLite Schema Definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts)
- [ADR 0011: Progress Checklist LEDs and Switch](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md)

## Prototype Lessons & Context

Lean on the BLE transmission failure simulation and confirmation state changes modeled in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L436-L499). The LED status turns `GREEN_SOLID` only upon app confirmation; otherwise, it stays `YELLOW_SOLID` and increments failures.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [SQLite Outbox Sync Status & Error States](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#10-planned-sqlite-outbox-sync-status--error-states-ui-prototype) (`prototype/ui-outbox-sync`) prototype.

## What to build
Integrate the mobile database storage with incoming BLE telemetry notifications. When the mobile app receives a sensor telemetry packet, it creates an active `DRAFT` snapshot record in SQLite (if none exists) and persists the measurement. It must send a confirmation packet back to the ESP32 within 3 seconds. The ESP32 changes the corresponding Progress LED from Yellow to Green only when this confirmation is received.

## Acceptance criteria
- [ ] Incoming BLE data points are stored in SQLite using Drizzle ORM into the `measurement_sets` and `snapshots` tables.
- [ ] Mobile app sends a GATT write confirmation back to the ESP32 indicating receipt.
- [ ] If confirmation is received within the 3s Transfer Latency window, ESP32 turns the RA progress LED to Solid Green.
- [ ] If confirmation fails or timeouts, the LED stays Solid Yellow, and the ESP32 logs a BLE transmission error in its NVS cache.
- [ ] LED colors must adhere to the HSL tailored color rules in the design system to ensure accessibility.

## Blocked by
[0002-ra-button-interrupt.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0002-ra-button-interrupt.md)

## User stories covered
User Story 1 (complete)

## Testing Guidance

### Unit Testing
- **SQLite Operations**: Jest tests validating SQL CRUD statements, table schema integrity, and transaction boundaries.
- **Draft State Logic**: Validate draft fields (missing variables, timestamps, technician ID) before executing database inserts.
- **Schema Migrations**: Test schema updates and verify target migration paths from v1 to v2.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record SQLite write speed benchmark (ms per save/update transaction) under local simulation.
  - Track database file size expansion relative to the number of stored drafts.
- **Behavioral & Data Baseline**:
  - Save and freeze a snapshot of a valid draft SQLite database file schema to automatically check for regressions.

### Integration & Manual Verification
- **Draft Persistence**: Save a troubleshooting draft, force-quit the mobile application, and verify the draft state loads correctly.
- **Data Sync State**: Ensure draft status is marked local and does not sync to the cloud worker until finalization.

## Definition of Done (DoD)
- [ ] **Unit Tests**: SQLite CRUD, draft state managers, and data integrity tests pass.
- [ ] **TypeScript Check**: Code passes strict TypeScript compilation compiler check (`tsc --noEmit`).
- [ ] **Storage Security**: Validate SQLite database file directory utilizes sandbox permissions.
