# Hardware Watchdog & NVS Reset Recovery

## Type
AFK

## Assigned Agents
- `/agency-embedded-firmware-engineer` (ESP32 hardware WDT drivers, NVS storage drivers)
- `/agency-security-engineer` (Secure boot & crash log integrity)

## Reference Docs
- [PRD.md - Section 5 & 9 (Watchdog & NVS logging)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L76)
- [CONTEXT.md - Sleep Caching definition](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md#L63)
- [ADR 0001: ESP32 as MCU](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0001-esp32-as-mcu.md)

## Prototype Lessons & Context
Reference the `nvsLogs` array modeled in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L88) which records system resets and sensor events for persistent post-mortem analysis.

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
