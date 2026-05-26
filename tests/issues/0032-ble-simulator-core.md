# Mock ESP32 BLE Simulator — Core (Buttons, Encoders, Sensors)

## Type
AFK

## Assigned Agents
- `@agency-engineering-embedded-firmware-engineer` (GATT service layout, BLE protocol fidelity)
- `@agency-engineering-mobile-app-builder` (characteristic format matching the React Native BLE PLX layer)

## Reference Docs
- [PRD: Vertical Test Suite — Section 9 (Mock ESP32 BLE Simulator)](../../docs/prd-vertical-test-suite.md)
- [ADR-0002: BLE 5.0 as Transport](../../docs/adr/0002-ble-5-0-as-transport.md)
- [ADR-0011: Progress Checklist LEDs and Switch](../../docs/adr/0011-progress-checklist-leds-and-switch.md)
- [Prototype: logic-ble-binary](../../prototype/logic-ble-binary/) (BLE binary protocol reference)
- [Prototype: logic-before-after](../../prototype/logic-before-after/) (BEFORE/AFTER context swap reference)

## What to build

A Python Bleak BLE peripheral server (`tests/simulator/mock_device.py`) that impersonates the physical ESP32 handheld device. The test harness uses this simulator to drive the mobile app logic layer through complete user workflows without requiring physical hardware.

This issue covers the **core simulation**: normal device behavior including button presses, encoder rotations, sensor value delivery, and BEFORE/AFTER switch toggling. Fault injection and power state simulation are in issue 0033.

**SimulatorConfig dataclass** (the harness passes this per scenario):
```python
@dataclass
class SimulatorConfig:
    scenario_id: str
    workflow: str               # "A" | "B" | "C" | "D"
    network_cond: str           # "NET_NORMAL" | "NET_LOSS_5" | "NET_LOSS_20" | ...
    power_state: str            # "PWR_CONTINUOUS" | "PWR_SLEEP_1" | "PWR_SLEEP_3"
    sensor_state: str           # "SENS_NORMAL" | "SENS_SHT40_DRIFT" | ...
    sensor_values: SensorValueFixture
    ocr_path: str
    llm_path: str
    packet_loss_pct: float      # 0.0 — handled in 0033
    rssi_override_dbm: int | None
    sleep_trigger_step: int | None
    sleep_duration_ms: int
    corrupt_nvs_on_wake: bool   # handled in 0033
```

**Core behaviors to implement:**
- GATT service advertisement with HVAC Helper service UUID
- Button press characteristics: RA, SA, OA, DA — each delivers `{ button_id, temp_f, humidity_pct, capture_ts }`
- Rotary encoder characteristics: SL, LL — each delivers `{ encoder_id, saturation_temp_f, pipe_temp_f, capture_ts }`
- BEFORE/AFTER switch toggle: context-swap notification + full retransmission of all cached values in selected set
- Sensor value fixture injection: `SENS_NORMAL` delivers nominal values; `SENS_SHT40_DRIFT` injects ±5°F offset on RA/SA

All actions must write ADR-0014 compliant events to the `telemetry_logs` SQLite table:
- `BLE_CONNECT` on client connection (with `rssi_dbm`, `connect_duration_ms`)
- `BUTTON_CAPTURE` on each button press (with `button_id`, `sensor_value`, `capture_duration_ms`)
- `SENSOR_FAULT` when `sensor_state` is not `SENS_NORMAL`

## Acceptance criteria

- [ ] Simulator advertises with the correct HVAC Helper service UUID and is discoverable by Bleak central client
- [ ] All 6 capture events (RA, SA, OA, DA, SL, LL) deliver correctly structured characteristic payloads
- [ ] BEFORE/AFTER switch toggle triggers retransmission of all cached values for the selected set
- [ ] `SENS_SHT40_DRIFT` injects exactly ±5°F on RA and SA temperature values
- [ ] `SENS_CLAMP_DISCONNECTED` delivers null/error value for SL pipe temp and emits `SENSOR_FAULT` telemetry event
- [ ] Every simulated action writes an ADR-0014 compliant `telemetry_logs` row to the configured SQLite DB
- [ ] pytest tests pass for: full 6-button capture sequence, BEFORE/AFTER toggle retransmission, drift injection, sensor fault telemetry event

## Blocked by

- [0030 — Telemetry Schema & SQLite Database Init](./0030-telemetry-schema-db-init.md)

## Labels
enhancement, ready-for-agent

