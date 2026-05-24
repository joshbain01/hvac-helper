# Physical Hardware Schematic & Pinout Mapping

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (pinout allocation and electrical design review)
- `/agency-security-engineer` (JTAG security review)

## Reference Docs
- [PRD.md - Section 8 & 9 (Solution Overview - Hardware)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L109)
- [ADR 0001: ESP32 as MCU](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0001-esp32-as-mcu.md)
- [ADR 0010: Single Top Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0010-single-top-display.md)
- [ADR 0011: Progress Checklist LEDs and Switch](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md)

## Prototype Lessons & Context
Ensure hardware mapping aligns with the pins required by the physical display and LEDs modeled in the [prototype state-machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L23-L87).

## What to build
Design the complete electrical schematic for the HVAC Helper Pro handheld device. Define the ESP32 GPIO pinout allocations, power supply lines (battery charging, 3.3V LDO regulation, voltage divider for battery fuel check), I2C lines for sensors and the OLED display, digital inputs for buttons and encoders, and analog lines for clamp probes.

## Acceptance criteria
- [ ] Schematic captures ESP32 MCU circuit, programming port (UART), and reset/boot logic.
- [ ] All 4 physical buttons, 2 rotary encoders (pulses + push buttons), and slide switch are mapped to GPIO inputs, avoiding strapping pins (GPIO 0, 2, 5, 12, 15) to guarantee clean boot sequence.
- [ ] Dual-color LEDs (6 pairs = 12 control lines) are assigned to GPIOs or shift registers/LED drivers to optimize pins.
- [ ] I2C bus (OLED + SHT3x sensor) is designed with calculated pull-up resistors (4.7kΩ).
- [ ] Analog inputs for the two external clamp probes (NTC thermistors) include necessary reference voltage dividers.

## Blocked by
None - can start immediately

## User stories covered
N/A (Hardware setup)
