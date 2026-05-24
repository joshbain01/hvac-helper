# Rotary Encoder Drivers & OLED Display Feedback

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (Hardware encoder detent handlers & timer drivers)
- `/agency-ux-architect` (OLED screen layout spacing and dynamic number updates)

## Reference Docs
- [PRD.md - Section 6.1 & 7 (Rotary Encoders)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L125)
- [CONTEXT.md - Rotary Encoder & Target Ranges terms](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L51)
- [ADR 0010: Single Top Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0010-single-top-display.md)

## Prototype Lessons & Context
Model encoder temperature dial adjustments off the prototype dial logic in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L422-L434). Increments/decrements should update the local memory dial values (40.0 for SL, 105.0 for LL default).

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

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

## Testing Guidance

### Unit Testing
- **Quadrature Decoding**: Verify encoder signal counting logic, step direction tracking, and rotation rate calculation.
- **UI Menu Cursor**: Test that scroll steps correspond to active OLED menu lists.
- **Acceleration Logic**: Validate cursor acceleration curves under rapid rotation.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record quadrature interrupt handler latency on the ESP32.
  - Measure hardware active current draw during fast cursor selection sequences.
- **Behavioral & Data Baseline**:
  - Capture and freeze key-down and scroll state telemetry outputs to detect regressions.

### Integration & Manual Verification
- **Physical Rotation**: Rotate the physical dial clockwise and counterclockwise to verify selection transitions.
- **Menu Boundary Limits**: Verify the cursor does not wrap around unless explicitly enabled in configuration.
- **Display Update**: Confirm that OLED menus redraw dynamically without ghosting or lagging.

## Definition of Done (DoD)
- [ ] **Zero UI Lag**: Code review confirms OLED redraw triggers are batched to maintain $\ge$ 30 FPS rendering speed during scroll.
- [ ] **Unit Tests**: Driver quadrature logic and velocity acceleration calculations pass tests.
- [ ] **Bouncing Guard**: Verified that electrical bounce does not trigger false back-and-forth selection steps.
