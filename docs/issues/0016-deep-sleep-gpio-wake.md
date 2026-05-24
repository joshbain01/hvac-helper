# Deep Sleep & GPIO Interrupt Wake

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (Low power state entry, ESP32 EXT1 wakeup setup, current audit)

## Reference Docs
- [PRD.md - Section 5 & 8 (Power-save mode & wake rules)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L80)
- [CONTEXT.md - Physical Switch & Button terms](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md#L47)

## Prototype Lessons & Context
The prototype simulates system inactivity and timeout clocks. In production, this must map to the ESP32 entering deep sleep mode (`esp_deep_sleep_start()`) to meet power conservation requirements.

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
