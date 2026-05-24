# Push-to-Capture logic, Clamp Probes, & Local Calculations

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (encoder push interrupts, analog clamp measurements)
- `/agency-software-architect` (on-device mathematical validation)

## Reference Docs
- [PRD.md - Section 6.1, 6.2 & 7 (Clamp Probes & Saturation Dial-in)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L134)
- [CONTEXT.md - Evaporator Delta T, Superheat, Subcooling definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L14)
- [ADR 0003: No Built-In Pressure Sensor](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0003-no-built-in-pressure-sensor.md)

## Prototype Lessons & Context

Implement the thermodynamic formulas exactly as written in the prototype [recalculateDeviceMetrics](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L286-L314). Note how Delta T = RA - SA; Superheat = Suction Pipe - Suction Sat; Subcooling = Liquid Sat - Liquid Pipe.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

## What to build
Implement the push-button switch interrupts on the rotary encoder dials. Pushing a dial locks in the manual saturation temperature, queries the external pipe clamp temperature probe via ADC/one-wire, and performs local calculations on the ESP32. The calculated Delta T, Superheat, and Subcooling are drawn to the OLED Top Display immediately.

## Acceptance criteria
- [ ] Encoder push-buttons trigger a debounced GPIO interrupt.
- [ ] ESP32 reads external clamp probe temperatures (via high-resolution NTC ADC conversion or digital temperature probes).
- [ ] Firmware executes calculations locally: Delta T, Superheat, and Subcooling, formatting with one-decimal precision.
- [ ] OLED Top Display redraws to show calculated metrics (e.g. `SH: 12.5°F`, `SC: 8.2°F`, `DT: 15.0°F`).

## Blocked by
[0004-rotary-encoder-drivers.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0004-rotary-encoder-drivers.md)

## User stories covered
User Story 6 (complete)

## Testing Guidance

### Unit Testing
- **ADC Translation**: Verify raw analog-to-digital converter (ADC) voltage readings map to temperature outputs.
- **Calibration Scaling**: Test calculation offset factors (gain, bias compensation) using mocked voltage streams.
- **Event Dispatcher**: Test button-press captures and verify data point routing.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure current consumption during wireless/analog measurement sampling.
  - Record ADC sampling noise margin and read speed latency.
- **Behavioral & Data Baseline**:
  - Freeze a reference calibration table to detect offset calculation regressions.

### Integration & Manual Verification
- **Clamp Interaction**: Press the clamp push-to-capture button, checking that values immediately register on the OLED.
- **Dual-Channel Verification**: Read return/liquid clamp inputs side-by-side, verifying independent state updates.

## Definition of Done (DoD)
- [ ] **Calibration Check**: Measured temperature values match precision reference standards (accuracy tolerance verified within $\pm$ 0.5°F).
- [ ] **Unit Tests**: Calibration mathematical formulas and ADC translations pass unit testing.
- [ ] **Hardware Release**: Verification that ADC/sampling channels release power lines when inactive.
