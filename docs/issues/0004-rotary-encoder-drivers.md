# Rotary Encoder Drivers & OLED Display Feedback

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (Hardware encoder detent handlers & timer drivers)
- `/agency-ux-architect` (OLED screen layout spacing and dynamic number updates)

## Reference Docs
- [PRD.md - Section 8 & 9 (Rotary Encoders)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L110)
- [CONTEXT.md - Rotary Encoder & Target Ranges terms](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L51)
- [ADR 0004: Per-Button Mini-OLEDs vs Single Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0004-per-button-mini-oleds-vs-single-display.md)

## Prototype Lessons & Context
Model encoder temperature dial adjustments off the prototype dial logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L422-L434). Increments/decrements should update the local memory dial values (40.0 for SL, 105.0 for LL default).

## What to build
Implement hardware interrupt handlers and driver logic for the two digital rotary encoders (Suction Line and Liquid Line). Rotating the dials must capture detents, filter out mechanical contact bounce, and increment or decrement the active saturation temperature on the OLED display.

## Acceptance criteria
- [ ] Rotary encoder A/B signals are decoded via hardware timer peripheral (ESP32 PCNT) or GPIO interrupts to calculate direction and step.
- [ ] Rotating the Suction Line dial increments/decrements saturation temperature in steps of 0.5°F or 1.0°F (updating the Top Display field `SL Sat`).
- [ ] Rotating the Liquid Line dial increments/decrements saturation temperature (updating `LL Sat`).
- [ ] Values display dynamically and smoothly on the OLED display with no screen flicker or reading jumps.

## Blocked by
- [0003-mobile-sqlite-draft-persistence.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0003-mobile-sqlite-draft-persistence.md)
- [0022-hardware-electrical-self-test.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0022-hardware-electrical-self-test.md)

## User stories covered
User Story 2 (partial), User Story 6 (partial)
