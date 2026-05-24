# Mobile App SQLite Draft Persistence & Progress LED State Machine

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (SQLite/Drizzle persistence logic)
- `/agency-embedded-firmware-engineer` (GATT confirm handling, LED GPIO logic)
- `/agency-ux-architect` (design guidelines for color-blind LED readability)
- `/agency-accessibility-auditor` (LED and screen contrast review)

## Reference Docs
- [PRD.md - Section 6 & 8 (Progress LEDs & SQLite)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L87)
- [schema.ts - SQLite Schema Definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts)
- [ADR 0011: Progress Checklist LEDs and Switch](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md)

## Prototype Lessons & Context
Lean on the BLE transmission failure simulation and confirmation state changes modeled in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L436-L499). The LED status turns `GREEN_SOLID` only upon app confirmation; otherwise, it stays `YELLOW_SOLID` and increments failures.

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
