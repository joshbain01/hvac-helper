# Target Tolerances BLE Synchronization

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (GATT configuration writes)
- `/agency-embedded-firmware-engineer` (GATT configuration writes handling, screen redraw)

## Reference Docs
- [PRD.md - Section 6 & 8 (Equipment targets)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L87)
- [CONTEXT.md - Target Ranges definition](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L67)

## Prototype Lessons & Context
Review target syncing logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L216-L240). Scanned equipment must push tolerances (e.g. `10-14 (Conf)`) to the display, replacing default generic targets `(Gen)`.

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
