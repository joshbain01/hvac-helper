# ESP32 BLE GATT Service & Mobile App Discovery

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (firmware BLE service design)
- `/agency-mobile-app-builder` (React Native app discovery logic)
- `/agency-security-engineer` (review of Bluetooth pairing security)

## Reference Docs
- [PRD.md - Section 5 & 8 (BLE Requirements)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L74)
- [ADR 0002: BLE 5.0 as Transport](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0002-ble-5-0-as-transport.md)
- [Architecture Diagrams](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/architecture/README.md)

## Prototype Lessons & Context
Review the BLE connection toggle logic in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L17-L20) representing the virtual link state. The device must present a standard BLE GATT service with characteristics matching raw measurements.

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
