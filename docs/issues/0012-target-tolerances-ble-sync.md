# Target Tolerances BLE Synchronization

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (GATT configuration writes)
- `/agency-embedded-firmware-engineer` (GATT configuration writes handling, screen redraw)

## Reference Docs
- [PRD.md - Section 6.1 & 6.3 (Target Tolerances BLE Sync)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L151)
- [CONTEXT.md - Target Ranges definition](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L67)

## Prototype Lessons & Context
Review target syncing logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L216-L240). Scanned equipment must push tolerances (e.g. `10-14 (Conf)`) to the display, replacing default generic targets `(Gen)`.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype.

## What to build
Build the synchronization logic to push target HVAC calculations tolerances from the mobile app back to the physical device screen. Once an equipment tag is successfully scanned and matched, query the target specification, package it, and write it to the ESP32 configuration characteristic. The ESP32 display must redraw to show the specifications, appending a `(Conf)` suffix.

## Acceptance criteria
- [ ] Scanned model numbers map to factory Superheat and Subcooling target specifications.
- [ ] Mobile app transmits target values to the ESP32 configuration GATT characteristic.
- [ ] ESP32 receives targets and draws them on the OLED display (e.g., `SH Target: 10-14 (Conf)`).
- [ ] If no equipment is scanned, display defaults to generic fallback targets labeled with `(Gen)` suffix.

## Blocked by
[0011-mobile-camera-ocr-flow.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0011-mobile-camera-ocr-flow.md)

## User stories covered
N/A (Targets sync requirement)

## Testing Guidance

### Unit Testing
- **Math Tolerance Logic**: Verify calculations for target tolerance boundaries (e.g. subcooling tolerances, target superheat ranges).
- **Status Indicator Rules**: Test status logic mapping to correct indicators (Pass, Warning, Fail).
- **Serialization**: Test binary converters that encode configuration changes for BLE sync.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure tolerance calculation latency.
  - Track BLE payload serialization sizes to avoid packet fragmentation issues.
- **Behavioral & Data Baseline**:
  - Freeze a snapshot of tolerance boundaries and config parameters.

### Integration & Manual Verification
- **Boundary Modification**: Modify tolerance boundaries on the app, send sync, and verify status indicators on the physical device OLED update correctly.
- **OutOfRange Checks**: Inject extreme values on sensors and check that indicator states trigger correctly.

## Definition of Done (DoD)
- [ ] **indicator Precision**: Status indicators precisely trigger at mathematical tolerance boundaries.
- [ ] **Unit Tests**: Math calculation suites and encoders pass unit testing.
- [ ] **Sync speed**: Modified parameters sync to the device and update displays in $\le$ 1s.
