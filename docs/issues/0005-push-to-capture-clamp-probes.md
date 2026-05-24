# Push-to-Capture logic, Clamp Probes, & Local Calculations

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (encoder push interrupts, analog clamp measurements)
- `/agency-software-architect` (on-device mathematical validation)

## Reference Docs
- [PRD.md - Section 8 & 9 (Local Calculations & Encoders)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L110)
- [CONTEXT.md - Evaporator Delta T, Superheat, Subcooling definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L14)
- [ADR 0003: No Built-In Pressure Sensor](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0003-no-built-in-pressure-sensor.md)

## Prototype Lessons & Context
Implement the thermodynamic formulas exactly as written in the prototype [recalculateDeviceMetrics](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L286-L314). Note how Delta T = RA - SA; Superheat = Suction Pipe - Suction Sat; Subcooling = Liquid Sat - Liquid Pipe.

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
