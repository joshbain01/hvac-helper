# Physical Return Air (RA) Button Interrupt & Display Update

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (interrupt handling, display rendering, built-in sensor read)

## Reference Docs
- [PRD.md - Section 6.1 & 7 (RA & Display Description)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L125)
- [CONTEXT.md - Domain Terms: Return Air (RA)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L99)
- [ADR 0010: Single Top Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0010-single-top-display.md)

## Prototype Lessons & Context
Leverage the `captureAirMeasurement("return_air", ...)` structure found in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L356-L389). Note how Return Air captures both Temperature and Relative Humidity, unlike other air channels.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

## What to build
Implement the hardware interrupt routine for the Return Air physical button. When pressed, the ESP32 wakes up (if sleeping), queries the built-in temperature/humidity sensor via I2C, displays the values immediately on the top display, and packages the data point into a BLE packet payload.

## Acceptance criteria
- [ ] GPIO interrupt is configured for the tactile RA button with hardware debouncing (e.g. 50ms) to prevent double triggers.
- [ ] Built-in SHT3x (or equivalent) sensor is successfully queried for temperature and humidity upon button press.
- [ ] ESP32 draws the Return Air metrics immediately to the OLED Top Display (e.g. `RA: 76.2°F / 55.4%`), displaying raw values as formatted in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L249).
- [ ] The data point (temperature, humidity, and boot-relative timestamp) is serialized and pushed to the BLE TX buffer.

## Blocked by
- [0001-esp32-ble-gatt-service.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0001-esp32-ble-gatt-service.md)
- [0022-hardware-electrical-self-test.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0022-hardware-electrical-self-test.md)

## User stories covered
User Story 1 (partial), User Story 2 (partial)

## Testing Guidance

### Unit Testing
- **Interrupt Vector Config**: Test GPIO interrupt registry setup and trigger callbacks.
- **Data Packaging**: Validate that temperature and humidity floating-point calculations match raw analog sensor readings.
- **State Queue**: Test that return air packets are appended properly to the BLE queue.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure the hardware interrupt debounce latency (verify $\le$ 50ms configuration limits double-triggering).
  - Measure current draw spikes (mA) during sleep-to-wake transitions.
  - Record I2C reading acquisition latency for SHT3x queries.
- **Behavioral & Data Baseline**:
  - Capture and freeze a baseline of serial sensor outputs to verify precision consistency under normal operating temperatures.

### Integration & Manual Verification
- **Physical Interrupt**: Press the tactile Return Air (RA) button, verifying it triggers the wake routine and refreshes the display.
- **OLED Layout**: Confirm the Top Display matches format specifications (e.g. `RA: 76.2°F / 55.4%`) and remains readable in direct light.
- **BLE Transmission**: Monitor GATT notification stream on the app to verify RA packets contain correct boot timestamps.

## Definition of Done (DoD)
- [ ] **Debounce Validation**: Debounce logic tested and verified to prevent duplicate triggers on physical button press.
- [ ] **Display Correctness**: The layout conforms to the UI formats specified in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js).
- [ ] **Hardware Release**: Verification that I2C query session is explicitly closed and does not lock up the device bus.
