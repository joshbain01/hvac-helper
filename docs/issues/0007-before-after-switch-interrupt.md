# Physical BEFORE/AFTER Switch Interrupt & Sleep Caching Context Swap

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (GPIO interrupts, memory partition cache swapping)
- `/agency-mobile-app-builder` (Context state updates & full telemetry synchronization)

## Reference Docs
- [PRD.md - Section 6.1 & 6.2 (BEFORE/AFTER Switch)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L134)
- [CONTEXT.md - Physical Switch & Sleep Caching definitions](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L63)
- [ADR 0011: Progress Checklist LEDs and Switch](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md)

## Prototype Lessons & Context

Leverage the `togglePhysicalSwitch(position)` code block in the [prototype state machine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L316-L354). Note how the switch position swaps the display context and triggers a re-transmission of all cached values in the selected set.

This task corresponds to the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype and is validated by the planned [Physical BEFORE/AFTER Switch Context-Swap](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#11-planned-physical-beforeafter-switch-context-swap-logic-prototype) (`prototype/logic-before-after`) prototype.

## What to build
Implement the hardware interrupt handler for the physical BEFORE/AFTER slide switch on the ESP32. Toggling the switch swaps the active display cache between the before-repair and after-repair datasets, updates the 6 Progress LEDs to represent the checklist status of the newly selected set, and triggers a BLE re-transmission of all cached values for the active set to ensure synchronization with the app.

## Acceptance criteria
- [ ] Physical BEFORE/AFTER slide switch triggers a GPIO interrupt on the ESP32.
- [ ] Firmware switches the active cache pointer to the selected set (before or after).
- [ ] Display and Progress LEDs context-swap immediately to show values and checklist states of the new set.
- [ ] ESP32 pushes all cached measurements for the newly selected set over BLE to sync with the mobile app (handling cases where the app was disconnected or out-of-sync).

## Blocked by
- [0006-multi-variable-ble-telemetry.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0006-multi-variable-ble-telemetry.md)
- [0022-hardware-electrical-self-test.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0022-hardware-electrical-self-test.md)

## User stories covered
User Story 1 (complete), User Story 7 (partial)

## Testing Guidance

### Unit Testing
- **Toggle State Reading**: Verify GPIO toggle switch registry status and transition listeners.
- **Active State Update**: Validate that state machines toggle between `BEFORE` and `AFTER` snapshot records.
- **Display Routing**: Verify correct layout template rendering triggers.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record the state transition current draw variance and latency.
  - Measure OLED screen swap redraw latency.
- **Behavioral & Data Baseline**:
  - Snapshot the physical switch transition event timing sequence to prevent input bouncing.

### Integration & Manual Verification
- **Physical Toggle**: Flip the physical toggle switch and confirm the OLED display switches immediately between "Before" and "After" views.
- **Indicator Validation**: Verify that the physical LEDs or display markers show the correct state.

## Definition of Done (DoD)
- [ ] **Debounce Stability**: Confirmed that flipping the toggle does not generate multiple event callbacks.
- [ ] **Unit Tests**: State mapping and page layout routing tests pass.
- [ ] **UI Rendering**: Verified that switching views does not cause partial screen rendering or ghosting.
