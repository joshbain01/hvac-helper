# Bare-Metal Hardware Verification & Electrical Self-Test

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (electrical test script implementation)
- `/agency-code-reviewer` (review test script coverage)

## Reference Docs
- [PRD.md - Section 5 (Firmware requirements)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L74)
- [CONTEXT.md - Physical Switch & Button terms](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md#L47)

## Prototype Lessons & Context
Write a basic test suite that mimics the state changes of the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js) but interacts with the real physical GPIO pins and I2C registers.

## What to build
Flash a lightweight hardware diagnostic script onto the assembled ESP32. The script must query registers and log interrupts to verify the electrical connections of all physical inputs (buttons, encoders, switch) and outputs (OLED, LEDs).

## Acceptance criteria
- [ ] An I2C scan detects the active SHT3x sensor and SSD1306 OLED display addresses.
- [ ] Test script prints to UART console when each of the 4 tactile buttons is pressed.
- [ ] Rotating the SL and LL encoders registers directional increments/decrements in console.
- [ ] Toggling the BEFORE/AFTER switch registers HIGH/LOW logic states.
- [ ] All 6 Progress LEDs are toggled successfully (Green, Yellow, Flashing Yellow, and Off).
- [ ] Battery voltage divisor ADC read yields values matching the physical multimeter reading.

## Blocked by
[0021-hardware-assembly.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0021-hardware-assembly.md)

## User stories covered
N/A (Hardware validation)
