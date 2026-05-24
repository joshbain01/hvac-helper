# Hardware Watchdog & NVS Reset Recovery

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (ESP32 hardware WDT drivers, NVS storage drivers)
- `/agency-security-engineer` (Secure boot & crash log integrity)

## Reference Docs
- [PRD.md - Section 6.2 (Watchdog & NVS Recovery)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L126-L134)
- [CONTEXT.md - Sleep Caching definition](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md#L63)
- [ADR 0001: ESP32 as MCU](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0001-esp32-as-mcu.md)

## Prototype Lessons & Context

Reference the `nvsLogs` array modeled in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L88) which records system resets and sensor events for persistent post-mortem analysis.

This task is validated by the planned [Partition Swap & Rollback Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#4-planned-partition-swap--rollback-simulator-logic-prototype) (`prototype/logic-rollback`) and [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototypes.

## What to build
Set up the ESP32 hardware watchdog timer (configured for ≈5 seconds). Implement exception hook routines that run when the watchdog is triggered to persist the current active snapshot memory cache to Non-Volatile Storage (NVS). On next boot, recover the snapshot cache from NVS, restore display states, and write the crash cause (watchdog reset, software crash, or power-off) to the NVS diagnostics log.

## Acceptance criteria
- [ ] ESP32 hardware watchdog is active and kicked continuously in the main task loop.
- [ ] A panic/abort hook interceptor writes the in-memory measurements cache to NVS on watchdog triggers.
- [ ] Upon booting, the firmware reads NVS; if a saved snapshot is found, it restores display values and LED checklist states.
- [ ] The boot sequence queries the ESP32 reset cause registers and logs the reset type (e.g. `ESP_RST_WDT`, `ESP_RST_POWERON`) in NVS.

## Blocked by
[0008-snapshot-finalization-outbox.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0008-snapshot-finalization-outbox.md)

## User stories covered
N/A (Firmware error requirements)

## Testing Guidance

### Unit Testing
- **Watchdog Timer Configuration**: Verify watchdog registers, timeout limits, and check-in APIs.
- **State Logging (NVS)**: Test task state persistence to non-volatile storage (NVS) in simulation.
- **NVS Read/Write**: Verify serialization/deserialization of crash states from flash storage.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record watchdog reset firing latency.
  - Monitor peak power spikes (mA) during NVS flash writes.
  - Record system boot time from watchdog crash back to operational NVS state.
- **Behavioral & Data Baseline**:
  - Capture and freeze the NVS registry structure to prevent storage key collisions.

### Integration & Manual Verification
- **Crash Recovery**: Inject a firmware crash, confirm the watchdog triggers reboot, and verify the system resumes execution with restored parameters.
- **LED Alert**: Verify the crash indicator (e.g., debug console/OLED alert) shows correct status.

## Definition of Done (DoD)
- [ ] **Reset Velocity**: System recovers operational capability in $\le$ 3 seconds post-crash.
- [ ] **Unit Tests**: NVS serialization functions and task checklist registers pass testing.
- [ ] **Data Integrity**: NVS sectors verify zero corruption over 100 crash/recovery iterations.
