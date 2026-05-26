# Mock ESP32 BLE Simulator — Fault Injection (Packet Loss, Deep Sleep, NVS)

## Type
AFK

## Assigned Agents
- `@agency-engineering-embedded-firmware-engineer` (deep sleep + NVS cache behavior, watchdog reset logic)

## Reference Docs
- [PRD: Vertical Test Suite — Section 9 (Mock ESP32 BLE Simulator)](../../docs/prd-vertical-test-suite.md)
- [ADR-0009: OTA Update Model Signing](../../docs/adr/0009-ota-update-model-signing.md)
- [Prototype: logic-rollback](../../prototype/logic-rollback/) (OTA rollback + boot loop reference)
- [Prototype: logic-ble-ota](../../prototype/logic-ble-ota/) (OTA chunked transfer reference)

## What to build

Extend `tests/simulator/mock_device.py` (built in issue 0032) with all fault injection and power state simulation behaviors. These are the conditions that expose real field bugs — packet loss during OTA, NVS corruption after deep sleep, watchdog resets mid-capture.

**Behaviors to add:**

**Packet loss injection (`NET_LOSS_5`, `NET_LOSS_20`):**
- Randomly drop the configured percentage of outgoing BLE notify packets
- Emit `BLE_DISCONNECT` telemetry event with `rssi_dbm`, `disconnect_reason_code`, `reconnect_attempt_count` when loss triggers a reconnect cycle
- Reconnect must succeed within 3 retry attempts (matching the 3-second BLE latency SLA)

**RF interference simulation (`NET_RF_INTERFERENCE`):**
- Override all RSSI metadata to `-90dBm`
- Force 3 BLE reconnect cycles before stabilizing
- Emit `BLE_DISCONNECT` + `BLE_CONNECT` events per cycle

**Deep sleep simulation (`PWR_SLEEP_1`, `PWR_SLEEP_3`):**
- On `sleep_trigger_step`: stop BLE advertising, serialize NVS cache (all captured values + BEFORE/AFTER switch state) to disk at `/data/nvs_cache_{scenario_id}.json`
- After `sleep_duration_ms`: restart BLE advertising, deserialize NVS cache from disk
- Emit `DEEP_SLEEP_ENTER` (with `battery_percentage`, `cached_values_count`) and `DEEP_SLEEP_WAKE` (with `sleep_duration_ms`, `nvs_cache_valid`)
- `PWR_SLEEP_3`: trigger sleep 3 times at steps defined by the scenario config

**NVS cache corruption (`corrupt_nvs_on_wake: True`):**
- After serializing NVS cache to disk, corrupt the CRC field before deserializing
- Simulator detects CRC mismatch on wake, clears the cache, emits `SENSOR_FAULT` with `sensor_fault_code: "NVS_CRC_MISMATCH"`
- This simulates the scenario where power loss during sleep corrupts the cache

**OTA upload simulation (configurable abort points):**
- Simulate chunked binary OTA transfer with configurable abort at: 10%, 50%, 85%, 99% completion
- On abort: emit `WATCHDOG_RESET` telemetry event, disconnect BLE, reconnect with reset-cause NVS entry
- On successful transfer: emit `OTA_COMPLETE` and require BLE handshake confirmation before partition swap

## Acceptance criteria

- [ ] `NET_LOSS_20` drops approximately 20% of notify packets (±5% tolerance over 100 packets)
- [ ] Packet loss triggers `BLE_DISCONNECT` event with correct `reconnect_attempt_count` in telemetry
- [ ] `NET_RF_INTERFERENCE` injects `-90dBm` RSSI and emits 3 `BLE_DISCONNECT` + `BLE_CONNECT` cycles
- [ ] `PWR_SLEEP_1` serializes NVS cache to disk, stops advertising, then restores on wake with `nvs_cache_valid: true`
- [ ] `corrupt_nvs_on_wake: True` results in `nvs_cache_valid: false` and `SENSOR_FAULT` telemetry event on wake
- [ ] OTA abort at 85% triggers `WATCHDOG_RESET` telemetry event and BLE reconnect with reset-cause entry
- [ ] pytest tests pass for: 20% loss rate, RF interference cycle count, sleep/wake NVS roundtrip, NVS corruption detection, OTA abort at each configured point

## Blocked by

- [0032 — Mock ESP32 BLE Simulator — Core](./0032-ble-simulator-core.md)

## Labels
enhancement, ready-for-agent

