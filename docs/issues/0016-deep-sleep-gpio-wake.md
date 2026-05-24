# Deep Sleep & GPIO Interrupt Wake

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (Low power state entry, ESP32 EXT1 wakeup setup, current audit)

## Reference Docs
- [PRD.md - Section 6.2 & 8.2 (Power-Save & GPIO Wake)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L126-L134)
- [CONTEXT.md - Physical Switch & Button terms](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md#L47)

## Prototype Lessons & Context

The prototype simulates system inactivity and timeout clocks. In production, this must map to the ESP32 entering deep sleep mode (`esp_deep_sleep_start()`) to meet power conservation requirements.

This task is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

## What to build
Configure the ESP32 deep-sleep power states. If no button is pressed or dial is rotated within 5 seconds after a snapshot finalization or period of inactivity, save states to NVS and enter deep sleep. Configure the EXT1 GPIO wake-up mask to wake the device instantly when any of the 4 tactile buttons or 2 rotary encoder switches is pressed.

## Acceptance criteria
- [ ] Inactivity timer triggers deep sleep entry after 5 seconds of idle behavior.
- [ ] Active measurement sets are saved to NVS prior to entering deep sleep.
- [ ] Wake-up is configured using the EXT1 sleep wake mask mapping all 6 input switch GPIOs.
- [ ] Pressing any physical button or encoder push-dial wakes the device and recovers state in under 1 second.
- [ ] Verification: Measure ESP32 current draw during deep sleep to ensure battery targets are satisfied.

## Blocked by
[0015-watchdog-timer-nvs-recovery.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0015-watchdog-timer-nvs-recovery.md)

## User stories covered
N/A (Firmware power saving requirements)

## Testing Guidance

### Unit Testing
- **Wake Configuration**: Verify low-power register configurations, wake sources, and pin map triggers.
- **RTC Memory Variables**: Test boot counters and diagnostic logs in RTC slow memory.
- **Shutdown Handlers**: Verify device state is flushed to storage prior to sleep mode entry.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure deep sleep current consumption (verify $\le$ 50$\mu$A using precision multimeter/power analyzer).
  - Measure system boot latency from deep sleep to fully operational status.
- **Behavioral & Data Baseline**:
  - Snapshot the current draw profile to serve as a power footprint reference.

### Integration & Manual Verification
- **Sleep Trigger**: Trigger deep sleep mode (simulate timeout), verify the current drop, and check that pressing GPIO pins wakes the device instantly.
- **Data Continuity**: Confirm the device restores active session values upon waking.

## Definition of Done (DoD)
- [ ] **Power footrpint**: Deep sleep current draw confirmed to fit target boundaries ($\le$ 50$\mu$A).
- [ ] **Unit Tests**: Low-power configuration registries and RTC storage tests pass.
- [ ] **Wake Integrity**: Waking the device does not cause screen flicker or system reset.
