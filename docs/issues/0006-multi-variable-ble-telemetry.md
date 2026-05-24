# Multi-Variable BLE Telemetry & SQLite Calculations Persistence

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (BLE packet serialization)
- `/agency-mobile-app-builder` (GATT notify handlers, Drizzle ORM mapping)
- `/agency-software-architect` (data boundary definition)

## Reference Docs
- [PRD.md - Section 6.3 & 8.1 (BLE Telemetry)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L135-L141)
- [snapshot-schema.md - Section 1 (Precision & Extensibility)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md#L9)
- [schema.ts - Measurement sets schema definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/mobile/src/db/schema.ts#L52)

## Prototype Lessons & Context

Reference the `transmitDataPoint` telemetry updates in the [state-machine prototype](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L483-L495). Both the raw pipe temperature and the dialed saturation temperature are transmitted and recalculated inside the database records.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Compact Binary BLE Serialization Protocol](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#9-planned-compact-binary-ble-serialization-protocol-logic-prototype) (`prototype/logic-ble-binary`) prototype.

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

## Testing Guidance

### Unit Testing
- **Packet Serialization**: Verify multi-variable packet serialization and data packaging rules.
- **Telemetry Parsers**: Test extraction routines for multiple sensor readings (temperatures, pressures, humidity).
- **Notification Streams**: Test transmission event listeners and queue structures.
- **Reliability Logging**: Test that packet dropouts and bad checksums write telemetry events matching the `CONNECTIVITY` format in ADR 0014.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record serialization CPU overhead and BLE transmission latency profiles.
  - Measure the wireless signal attenuation impact under simulated cabinet enclosures.
- **Behavioral & Data Baseline**:
  - Capture and freeze the byte format layout for BLE notify payloads to prevent downstream serialization parsing errors.
  - Freeze the performance telemetry payload schema.

### Integration & Manual Verification
- **Concurrent Field Updates**: Run the device simulator and confirm multiple variables refresh simultaneously in the React Native UI.
- **Disconnect Recovery**: Manually interrupt the telemetry stream and confirm state recovery on reconnection.
- **Packet Drop Simulation**: Simulate packet failures by injecting garbled packets, and check that the mobile client logs CRC/packet drops to the local SQLite database.

## Definition of Done (DoD)
- [ ] **Schema Compliance**: Payload maps exactly to the [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md) specifications.
- [ ] **Unit Tests**: Packet serialization and parser tests pass.
- [ ] **Transmission Stability**: Live telemetry stream operates for $\ge$ 5 minutes without losing data packets.
- [ ] **Telemetry Audit**: Verified that communication drop rates are successfully logged to SQLite.
