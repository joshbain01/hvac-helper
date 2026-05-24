# ESP32 BLE GATT Service & Mobile App Discovery

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (firmware BLE service design)
- `/agency-mobile-app-builder` (React Native app discovery logic)
- `/agency-security-engineer` (review of Bluetooth pairing security)

## Reference Docs
- [PRD.md - Section 6.2 & 8.1 (BLE Requirements)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L126-L134)
- [ADR 0002: BLE 5.0 as Transport](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0002-ble-5-0-as-transport.md)
- [Architecture Diagrams](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/architecture/README.md)

## Prototype Lessons & Context
Review the BLE connection toggle logic in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L17-L20) representing the virtual link state. The device must present a standard BLE GATT service with characteristics matching raw measurements.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Compact Binary BLE Serialization Protocol](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#9-planned-compact-binary-ble-serialization-protocol-logic-prototype) (`prototype/logic-ble-binary`) prototype.

## What to build
Establish the core communication layer between the ESP32 hardware and the React Native mobile application. Configure the ESP32 BLE GATT server with dedicated read/write and notify characteristics, and build the React Native discovery/link management wrapper using `react-native-ble-plx`. Ensure automatic reconnection is handled robustly in noisy electrical environments.

## Acceptance criteria
- [ ] ESP32 boots, initializes NimBLE stack, and advertises as "HVAC-Helper-Pro" with specific Service UUID.
- [ ] Mobile app BLE service successfully scans, filters, and connects to the target UUID.
- [ ] Establish a notify characteristic for sensor values and a write characteristic for configuration pushes.
- [ ] Implement automatic reconnection logic on the mobile app side: if the link is severed, the app triggers background scanning and re-establishes the connection within 5 seconds of signal recovery.
- [ ] Connection/Disconnection events are exposed via a reactive state manager on the mobile side and draw the BLE icon (`📶`) on the device display.

## Blocked by
None - can start immediately

## User stories covered
User Story 1 (partial - setup)

## Testing Guidance

### Unit Testing
- **NimBLE Stack Config**: Verify BLE GATT service, UUID registrations, and read/write characteristic configurations in simulation.
- **Payload Formatting**: Test payload packaging functions for correctness and bounds safety.
- **Connection Handlers**: Test event callbacks for link status changes (connect, disconnect, auth).
- **Telemetry Event Generation**: Test that BLE disconnect events generate a valid `CONNECTIVITY` telemetry payload mapping to ADR 0014 schemas.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record the NimBLE stack heap consumption (RAM) and peak current draw (mA) during advertising and transmission.
  - Measure connection establishment latency and auto-reconnection speed baseline (should complete within $\le$ 5 seconds).
- **Behavioral & Data Baseline**:
  - Capture and freeze the byte format layout for BLE notify payloads to prevent downstream serialization parsing errors.
  - Freeze the connectivity telemetry record schema in SQLite to detect payload structural changes.

### Integration & Manual Verification
- **App Discovery**: Scan and pair using the React Native mobile app on emulator and physical testing hardware.
- **Reconnection Resiliency**: Manually disconnect BLE transport during active data transmission and confirm reconnection within 5s.
- **Device UI**: Verify that the BLE icon (`📶`) updates on the OLED screen when the connection state toggles.
- **Telemetry Validation**: Manually force a connection drop and verify that a record is generated in the local SQLite `telemetry_logs` table containing the correct error code and RSSI level.

## Definition of Done (DoD)
- [ ] **GATT Conformance**: BLE service successfully advertises under the UUID specified in [PRD.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md).
- [ ] **Unit Tests**: All driver and packet serialization unit tests pass under GCC/ESP-IDF toolchains.
- [ ] **Memory Verification**: No heap leaks detected on NimBLE connection cycles.
- [ ] **Layout QA**: Verified OLED display indicator (`📶`) updates reactively.
- [ ] **Telemetry Audit**: Verified that connection drops write a structured log event to the SQLite database.
