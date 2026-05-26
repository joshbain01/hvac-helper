# Production Testing Strategy: HVAC Helper Pro

**Author**: Testing & QA Specialist  
**Date**: May 2026  
**Status**: Strategic Recommendations — Implement in Phases

---

## Executive Summary

To build production-grade testing for HVAC Helper, you must implement **4 test layers** across **firmware, mobile, and system boundaries**. The critical path is:

1. **Prototype Phase**: Unit + integration tests with real hardware (ESP32 dev kit + BLE emulator)
2. **Beta Phase**: System tests + environmental stress using a **digital twin** for accelerated edge case validation
3. **Pre-Production**: Field tests with real HVAC equipment and operator variability
4. **Post-Launch**: Regression suite + telemetry-driven bug discovery

The cost difference between catching a BLE reconnection bug in the lab (1 hour fix) vs. in the field (8-hour dispatch) is roughly **10–100x**. Digital twins and automated testing shift bugs left.

---

## Part 1: Production Testing Suite Architecture

### What Mature Hardware Companies Do

**Harman (Audio/Automotive)**, **DJI (Drones)**, and **Zypher (Embedded Medical)** structure their test suites as:

```
Unit Tests (60% coverage target)
    ↓
Integration Tests (40% coverage target)
    ↓
System Tests (real hardware, happy path + edge cases)
    ↓
Environmental Stress Tests (temperature, humidity, EMI)
    ↓
Field Trials (real operators, real environments)
    ↓
Regression Suite (automated, runs before each release)
```

### Test Layers for HVAC Helper

#### Layer 1: Unit Tests (Firmware & Mobile Logic)

**Scope**: Individual components in isolation (sensor drivers, state machines, calculations, payload assembly).

**Tools**:
- **ESP-IDF Unity Testing Framework** (built into ESP-IDF): write C unit tests for firmware functions, run on device or in CI.
- **Catch2** or **Google Test (gtest)**: if you break out cross-platform calculation logic into a C++ library.
- **Jest** (JavaScript/TypeScript): test React Native shared logic and validation rules.
- **XCTest** (iOS) + **JUnit** (Android): test platform-specific view logic.

**Example Test Coverage**:
```
Firmware:
  - SHT40 driver: read correct values, handle I2C errors, CRC validation
  - Clamp probe ADC: linearity, noise filtering, overrange detection
  - LED state machine: transitions (off → yellow → green → flash), switch context swap
  - Button debouncing: no duplicate presses within 50ms window
  - Rotary encoder: gray code decoding, direction reliability, push detection
  - BLE payload assembly: field order, byte alignment, CCITT CRC-16
  - Calculation: Superheat = SL_saturation - SL_temp (verify math correctness)
  
Mobile:
  - Snapshot state machine: Draft → Finalized → Synced (no backwards transitions)
  - Timeout logic: expiration window = NOW - capture_time > 20min → invalidate
  - Revision cloning: parent ID set, revision_number incremented, fields deep-copied
  - OCR parsing: regex extraction of model/serial, fallback to manual entry
  - LLM note expansion: prompt injection handling, max output length
  - BLE packet retry: within 3s window, max 3 attempts, backoff strategy
```

**Target**: 70–80% code coverage (realistic for embedded); prioritize critical paths (BLE, state machines, calculations).

#### Layer 2: Integration Tests (Firmware ↔ Mobile ↔ Backend)

**Scope**: Multi-component interactions with controlled conditions (mocked hardware, emulated BLE, test doubles).

**Tools**:
- **Pact** (BLE contract testing): define expected message formats between ESP32 and mobile app, auto-generate stubs.
- **BleakMock** (Python): emulate BLE peripheral on test machine; mobile app connects to mock device, validates command/response pairs.
- **pytest** (Python) + **requests** (REST API testing): validate cloud API contract for snapshot ingestion.
- **Robot Framework**: keyword-driven test automation for complex multi-step flows.
- **Postman/Insomnia**: document API expectations; can be auto-converted to pytest or JavaScript tests.

**Example Integration Test Scenarios**:
```
Scenario 1: Single Data Point Capture + BLE Sync
  1. Press RA button on firmware
  2. Firmware reads SHT40, packages BLE payload
  3. Mobile app receives within 3s, writes to SQLite
  4. Mobile sends confirmation packet to firmware
  5. Firmware updates Progress LED to green
  → Assert: LED state, SQLite row, no BLE retries

Scenario 2: Offline Capture → Reconnect → Sync
  1. Capture all Before Set points (device offline, no BLE pairing)
  2. Measurements stored in firmware sleep cache (NVS)
  3. Mobile app reconnects, presses Before/After switch
  4. Firmware transmits all cached values to app
  5. App finalizes snapshot, queues in Outbox
  6. When Wi-Fi available, sync worker uploads
  → Assert: All 6 data points synced, no duplicates, correct timestamp order

Scenario 3: BLE Packet Loss + Retry
  1. Press SL button (rotary encoder push)
  2. First BLE payload lost (simulated in test harness)
  3. Firmware retries within 3s window
  4. Mobile app receives retry, idempotent write (no duplicate)
  5. Confirmation sent, LED updates to green
  → Assert: Exactly one SQLite row created, correct retry count in logs

Scenario 4: Revision Snapshot (Correction Flow)
  1. Finalize snapshot A with 6 Before + 6 After points
  2. Create Revision B (parent_id = A.id)
  3. Modify single data point in Revision B
  4. Finalize Revision B
  5. Sync both A and B to cloud
  6. Cloud API validates parent ID linkage, audit trail
  → Assert: Both records in PostgreSQL, Revision B.parent_id = A.id, audit log entry
```

**Tools & Libraries**:
- **BleakMock** (Python, cross-platform BLE mocking): https://github.com/dlech/bleak (community extensions for testing)
- **Pact** (contract testing): https://pact.foundation (JavaScript, Python, Go bindings)
- **Robot Framework** (keyword-driven automation): https://robotframework.org
- **pytest-asyncio** (async test support for BLE handlers)

#### Layer 3: System Tests (End-to-End, Real Hardware)

**Scope**: Full stack, real ESP32 device connected to real mobile device, capturing and syncing.

**Tools**:
- **Detox** (React Native E2E testing): automate iOS/Android app UI, tap buttons, verify screen states, wait for async operations.
- **Espresso** (Android native): UI automation at the Android framework level (if you need platform-specific testing).
- **XCUITest** (iOS native): similar, but for Swift/Objective-C layers.
- **Custom Harness (Python/Node.js)**: control test fixtures (power cycling ESP32, injecting network latency, simulating temperature changes).

**Example System Test Scenarios**:
```
Test: Complete Happy Path (Before → After → Finalize → Sync)
  Hardware Setup:
    - 2× ESP32 devices (primary + backup for parallel testing)
    - iPhone + Android device with app installed
    - Mock HVAC clamp probes (resistive temperature sources)
    - Bluetooth test environment (isolated, low interference)
  
  Steps:
    1. Open app, create new job
    2. Pair app with primary ESP32 (BLE handshake, auth token exchange)
    3. Slide switch to BEFORE position
    4. Press RA button 5 times (should coalesce into single capture)
    5. Press SA, OA, DA buttons
    6. Adjust SL rotary encoder, press push-button
    7. Adjust LL rotary encoder, press push-button
    8. Verify all 6 Progress LEDs green on device
    9. Verify all 6 data points in app SQLite cache
    10. Slide switch to AFTER position
    11. Repeat steps 4–9 for After Set
    12. Tap "Finalize Snapshot" in app
    13. Upload to mock backend (simulate 5s network delay)
    14. Verify snapshot in cloud PostgreSQL with correct state
    15. Verify no data loss, no duplicates, correct calculations (ΔT, SH, SC)
  
  Assertions:
    - 20 BLE messages (10 data points + 10 acks), zero loss
    - Progress LED transitions match expected state machine
    - Timestamp deltas are reasonable (< 1s between button press and LED update)
    - Calculations are mathematically correct
    - SQLite snapshot record has correct parent_id (if revision)
    - Cloud database audit trail matches device telemetry log
```

**Setup Requirements**:
- Dedicated BLE test lab (low RF noise, controlled environment)
- Automated device farm (2–4 ESP32 boards, power cycling capability)
- Mock backend (Node/Express or Python Flask) that logs all requests for verification
- Test data fixtures (pre-loaded HVAC equipment specs, expected sensor ranges)

#### Layer 4: Field Validation Tests

**Scope**: Real HVAC equipment, real technicians, real environmental variability.

**Tools**:
- **In-house telemetry logging** (already designed into your backend): track every button press, BLE transmission, SQLite write, and screen render time.
- **Crash reporting** (Sentry or Bugsnag): auto-capture unhandled exceptions, stack traces, device state.
- **Field survey tools** (Qualtrics or Typeform): capture technician feedback on usability, speed, reliability.
- **Data analysis** (Python pandas, Jupyter notebooks): analyze telemetry logs for failure patterns, latency outliers, sensor calibration drift.

**Example Field Test Campaign**:
```
Cohort: 10 HVAC technicians in Dallas-Fort Worth (high heat, high humidity)
Duration: 2 weeks, 50–60 service calls per technician
Metrics:
  - Button press latency (time from press to LED green): target ≤ 500ms
  - BLE connection reliability: target ≥ 99.5% uptime
  - Sensor accuracy: compare handheld readings vs. reference instruments
  - Thermal stress: device temperature inside tool bag, 100°F+ ambient
  - Humidity resistance: SHT40 calibration drift after 8-hour days in humid environments
  - RF interference: count BLE disconnects when cordless drill active nearby
  - User satisfaction: NPS for device usability, screen readability in sunlight
  - Data completeness: % of snapshots with all 6 Before + 6 After points

Analysis:
  - Plot latency percentiles (p50, p95, p99)
  - Identify service calls with > 1 BLE reconnect
  - Flag sensors with drift > 0.5°F from reference baseline
  - Correlate disconnects with nearby equipment
  - Survey feedback on button feel, switch response time, display contrast
```

---

## Part 2: Hardware Digital Twin Approaches

A **digital twin** is a software model of your device that mimics its sensors, outputs, and state transitions. For an ESP32-based HVAC tool, a digital twin lets you:
- **Simulate sensor faults** (open circuit, out-of-range, slow response)
- **Test edge cases** at scale (1000 power cycles, 10,000 button presses, thermal extremes)
- **Accelerate regression testing** (full test suite in 30 min instead of 8-hour field trial)
- **Train operators** without hardware in the lab

### Simulation Depth Comparison

| Approach | Depth | Speed | Cost | When to Use |
|----------|-------|-------|------|------------|
| **Unit tests only** | Components in isolation | Fast (~100ms) | Low | During active development |
| **Mocked BLE** | Full device logic + stubbed comms | Medium (~1s per test) | Low | Integration, CI/CD |
| **Virtual device (QEMU)** | Full embedded system in QEMU | Slow (~10s per test) | Medium | Deep firmware bugs, power state edge cases |
| **Hardware-in-the-loop (HIL)** | Real device + simulated environment | Slow (~30s per test) | High | Final validation, field anomalies |
| **Field trial** | Real device + real environment | Very slow (days) | Highest | Launch readiness |

### Recommended Approach: Two-Tier Digital Twin

**Tier 1: BLE Message Twin (Mobile/Backend Testing)**  
Scope: Validate mobile app logic and cloud API without touching firmware.

```
┌─────────────────────────────────────────────────────┐
│ Test Harness (Python / Node.js)                     │
│                                                       │
│ ┌──────────────────────────────────────────────┐   │
│ │ Virtual ESP32 Peripheral (BleakMock/GATTly)  │   │
│ │ - Exposes GATT services & characteristics    │   │
│ │ - Responds to mobile app commands            │   │
│ │ - Simulates data point delivery (~100ms)     │   │
│ │ - Injects packet loss (5-20% configurable)   │   │
│ │ - Simulates BLE MTU fragmentation            │   │
│ └──────────────────────────────────────────────┘   │
│           ↓                                           │
│ ┌──────────────────────────────────────────────┐   │
│ │ Telemetry Logger (SQLite in-memory)          │   │
│ │ - Logs all BLE messages (timestamps, payloads) │ │
│ │ - Tracks app → device commands                │   │
│ │ - Records SQLite writes for verification     │   │
│ └──────────────────────────────────────────────┘   │
│           ↓                                           │
│ ┌──────────────────────────────────────────────┐   │
│ │ Assertion Engine                             │   │
│ │ - Verify app state machine transitions       │   │
│ │ - Validate payload format & CRC              │   │
│ │ - Check timestamp ordering & deltas          │   │
│ │ - Assert idempotency under packet loss       │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
- Use **Bleak** (Python BLE library) with async event injection to simulate button presses at specific times
- Define a mock GATT profile matching your firmware's BLE service definition
- Replay recorded BLE packet sequences to test error recovery paths

**Tools**:
- **Bleak** (https://github.com/dlech/bleak): cross-platform BLE client/server, Python async
- **GATTly** (https://github.com/kevinmcalister/gattly): GATT server simulator, simpler than Bleak for testing
- **Custom Python harness** using asyncio to orchestrate timing

**Example Test Script** (Python):
```python
import asyncio
from bleak import BleakServer, BleakClient

class VirtualESP32:
    """Mock ESP32 firmware behavior."""
    
    async def handle_button_press(self, button_id: str):
        # Simulate SHT40 read (10ms), BLE assembly (5ms), transmit (20ms)
        await asyncio.sleep(0.035)
        payload = self._build_ble_payload(button_id)
        # Send to connected client
        await self.notify_characteristic(payload)
    
    def _build_ble_payload(self, button_id: str):
        # Returns [device_id, button_id, temp, humidity, timestamp, crc]
        return bytes([0x01, button_id, 76, 55, ...])

async def test_single_button_capture():
    """Integration test: button press → app capture → LED feedback."""
    device = VirtualESP32()
    
    # Simulate 100ms BLE round-trip
    start = time.time()
    await device.handle_button_press(button_id=0x01)  # RA button
    
    # Verify payload arrived in app within 3s window
    assert time.time() - start < 3.0
    assert app_db.query('SELECT * FROM measurements WHERE button_id=1').count() == 1
    assert led_state[0] == 'GREEN'  # LED updated
```

---

**Tier 2: Firmware-in-the-Loop (HIL) Twin (Deep Edge Cases)**  
Scope: Full device state machine, power transitions, sensor faults, deep sleep recovery.

```
┌──────────────────────────────────────────────────────────┐
│ QEMU ESP32 Emulation (Optional, for deep firmware bugs)  │
│                                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ QEMU -M esp32 (emulates CPU, memory, GPIO, I2C)    │ │
│ │ - Runs unmodified ESP-IDF firmware                  │ │
│ │ - Simulates button interrupts (GPIO EXT1)           │ │
│ │ - Tracks watchdog timer (5s), logs resets           │ │
│ │ - Emulates deep sleep / light sleep states          │ │
│ │ - Mock I2C responses for SHT40 & OLED              │ │
│ └─────────────────────────────────────────────────────┘ │
│                 ↓                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Test Fixture Harness (connects to QEMU via GDB)    │ │
│ │ - Inject button press interrupts                    │ │
│ │ - Simulate I2C sensor responses                     │ │
│ │ - Monitor firmware logs (UART capture)              │ │
│ │ - Check NVS (non-volatile storage) contents         │ │
│ │ - Measure CPU time, power state transitions         │ │
│ └─────────────────────────────────────────────────────┘ │
│                 ↓                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Property Checker (automated invariant testing)      │ │
│ │ - After any button press, LED must transition      │ │
│ │ - Watchdog can never be missed                      │ │
│ │ - Before/After switch never leaves stale cache     │ │
│ │ - OTA rollback always completes within 30s          │ │
│ └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Setup** (advanced; optional for beta phase):
```bash
# Install QEMU with ESP32 support
$ git clone https://github.com/espressif/esp-qemu
$ cd esp-qemu && ./configure --target-list=xtensa-softmmu
$ make && make install

# Build firmware for QEMU (no hardware changes)
$ idf.py build  # Standard ESP-IDF build

# Run in QEMU with GDB server
$ qemu-system-xtensa -M esp32 -m 4M \
    -kernel build/bootloader/bootloader.elf \
    -drive file=build/app.bin,if=mtd,format=raw \
    -nographic -s -S

# In another terminal: connect GDB
$ xtensa-esp32-elf-gdb -ex "target remote :1234" build/app.elf
(gdb) set remote memory-write-packet-size 256
(gdb) set remote memory-write-packet-size fixed
(gdb) mon system_reset
(gdb) c
```

**When to Use Tier 2**:
- Investigating watchdog resets that don't reproduce in lab
- Validating deep sleep power sequences under 1000+ cycles
- Testing OTA rollback under network interruptions
- Stress-testing NVS under rapid writes

**Cost**: Higher setup complexity, slower execution, but catches subtle bugs that only appear after long-running stress tests.

---

### Example Digital Twin Test: "BLE Packet Loss Recovery"

```python
# Test: Firmware retries after BLE packet loss, mobile app handles retries idempotently

import pytest
import asyncio
from unittest.mock import AsyncMock, patch
from hvac_mobile.ble_manager import BLEManager
from hvac_firmware_sim import VirtualESP32

@pytest.mark.asyncio
async def test_ble_packet_loss_with_retry():
    """
    Scenario: User presses RA button. First BLE packet is lost.
    Firmware retries within 3s. Mobile app receives duplicate confirmation.
    Expected: App writes exactly one SQLite row, no duplicates.
    """
    
    # Setup virtual device with 20% packet loss on first transmission
    device = VirtualESP32(packet_loss_rate=0.20)
    
    app = BLEManager(virtual_device=device)
    
    # Simulate button press
    payload = await device.emit_button_press(button_id=0x01, attempt=1)  # Lost
    assert payload is None  # Packet lost, no response to app
    
    # Firmware auto-retries within 3s
    payload = await device.emit_button_press(button_id=0x01, attempt=2)  # Success
    assert payload is not None
    
    # App receives payload, writes to SQLite
    row_count_before = app.db.count('measurements')
    await app.on_ble_data_received(payload)
    row_count_after = app.db.count('measurements')
    
    # Assert: exactly one new row, idempotent write
    assert row_count_after == row_count_before + 1
    
    # App sends confirmation back to firmware
    ack_payload = app.create_ack(payload)
    await device.handle_ack(ack_payload)
    
    # Check device state: LED should be green
    assert device.led_state[0x01] == 'GREEN'
    assert device.retry_count[0x01] == 1  # One retry observed
```

---

## Part 3: Available Libraries & Tools

### ESP32 Simulation & Testing

| Tool | Purpose | Language | Notes |
|------|---------|----------|-------|
| **ESP-IDF Unity Framework** | On-device unit testing | C | Built into ESP-IDF; write tests, compile, flash, run on hardware |
| **QEMU with ESP32 support** | Full firmware emulation | C | Slow but accurate; can test deep sleep, power states, watchdog |
| **Twine** (Espressif) | Hardware-in-the-loop testing | C / Python | Proprietary, limited availability; integrates with CI/CD |
| **Catch2** | Cross-platform C++ unit testing | C++ | Better API than Unity; can compile for desktop for quick iteration |
| **Google Test (gtest)** | Industrial-strength C++ testing | C++ | Overkill for firmware, but excellent for shared logic libraries |

**Recommended Setup**: Unity for embedded, extract calculation logic into shared library tested with gtest.

---

### BLE Protocol Testing

| Tool | Purpose | Language | Notes |
|------|---------|----------|-------|
| **Bleak** | BLE client/server (async) | Python | Cross-platform (Windows, Mac, Linux); excellent for test harnesses |
| **nRF Connect Mobile** | BLE protocol analyzer | Mobile app | Great for interactive debugging; packet inspection, GATT browser |
| **Bluetooth LE Protocol Stack Tester (Wireshark ext.)** | Packet-level inspection | Wireshark | View actual over-the-air frames; requires Bluetooth sniffer hardware (~$100–200) |
| **PyBluez** | Older Python BLE library | Python | Lower-level control; less maintained than Bleak |
| **Pact** | Contract-driven testing for BLE messages | Multiple | Define expected message formats; generates stubs for testing |
| **GATTly** | GATT server simulator | JavaScript/Node.js | Lightweight; good for quick mock peripherals |

**Recommended Setup**: Bleak for test harnesses + nRF Connect for interactive debugging + Wireshark sniffer for production validation.

---

### Sensor Simulation

| Tool | Purpose | Language | Notes |
|------|---------|----------|-------|
| **I2C Emulation (PySerial, RPyC)** | Mock I2C slave responses | Python | Simulate SHT40 CRC errors, slow responses, out-of-spec values |
| **Analog Signal Injection (DAC)** | Mock clamp probe ADC inputs | Python (PyDaqMx) or Hardware | Use USB DAC to inject voltage into analog input pins |
| **Temperature Chamber Simulation** | Thermal edge cases without hardware | Python (simulation) | Model Arrhenius equations for sensor drift, condensation thresholds |
| **Jittered Clock Injection** | Test timestamp accuracy under clock skew | QEMU or GDB | Simulate RTC drift (±50 ppm on real hardware) |

**Recommended Setup**: DAC board (~$200) for analog simulation + Python I2C mocking for digital sensors.

---

### Mobile App Testing Frameworks

| Tool | Purpose | Platform | Notes |
|------|---------|----------|-------|
| **Detox** | E2E testing for React Native | iOS/Android | Write tests in JavaScript; runs on real device emulator or simulator |
| **Appium** | Cross-platform mobile automation | iOS/Android | WebDriver-compatible; slower than Detox but more mature |
| **Espresso** | Android native UI testing | Android only | Framework-level control; excellent for complex async flows |
| **XCUITest** | iOS native UI testing | iOS only | Apple's first-party tool; deep OS integration |
| **Firebase Test Lab** | Cloud-based device farm | iOS/Android | Run tests on real devices in Google's data center |
| **BrowserStack** | Paid device farm | iOS/Android | More device variety than Firebase Test Lab |
| **SQLite Inspector** | Verify local database state | All | Use `adb shell` or Xcode debugger to inspect SQLite; write assertions in test code |

**Recommended Setup**: Detox for React Native + Firebase Test Lab for device farm validation.

---

### End-to-End System Testing

| Tool | Purpose | Language | Notes |
|------|---------|----------|-------|
| **Robot Framework** | Keyword-driven automation | Python | Excellent for complex multi-step flows; generates readable test reports |
| **pytest** | Test framework + parameterization | Python | Standard in Python community; good assertion messages |
| **Cypress** | Web UI testing (if you have web dashboard) | JavaScript | Real browser, great DX, excellent debugging |
| **Postman/Insomnia** | REST API testing + documentation | HTTP | Can export to pytest or Newman (CLI) |
| **Newman** | Postman test runner for CI/CD | JavaScript | Integrate Postman collections into GitHub Actions |

**Recommended Setup**: pytest + pytest-asyncio for BLE harness + Robot Framework for multi-device scenarios.

---

### Hardware-in-the-Loop (HIL)

| Tool | Purpose | Notes |
|------|---------|-------|
| **GDB Remote Protocol** | Debug firmware on real device | Use `idf.py monitor` + GDB for breakpoints, memory inspection |
| **JTAG Debugger (J-Link)** | Hardware-level debugging | ~$200 for EDU license; set breakpoints, inspect registers, power trace |
| **Power Profiler Kit II (Nordic)** | Measure firmware power consumption | ~$300; essential for validating deep sleep optimization |
| **Saleae Logic Analyzer** | Capture GPIO, I2C, SPI signals | ~$150–400 depending on channel count; debug timing issues |
| **RF Sniffer (NRF51822 + Wireshark)** | Capture BLE packets over the air | ~$50–100; gives you ground truth on what's on the radio |

**Recommended Setup**: Saleae Logic Analyzer + RF Sniffer for pre-production validation.

---

## Part 4: Edge Cases for HVAC Hardware

### Environmental Stress Vectors

#### 1. Temperature Extremes

**Scenario**: Summer in Dallas; technician working 8–10 hours outside in 95–105°F heat.

| Component | Risk | Mitigation |
|-----------|------|-----------|
| **SHT40 Sensor** | Drift at extremes (specs: -40 to +125°C, but accuracy degrades at edges) | Implement periodic calibration re-sync from mobile app; alert if deviation > 0.5°F |
| **Li-Po Battery** | Reduced capacity at high temp; faster discharge rate | Monitor battery voltage, reduce LED brightness at high temp, consider thermal cutoff at 60°C case temp |
| **ESP32 CPU** | Thermal throttling above 80°C; reduced clock speed | Measure die temperature via internal sensor; log when throttling occurs |
| **OLED Display** | Response time slowdown; reduced contrast | Test display refresh rate at 0°C and 100°F; spec contrast ratio at extremes |
| **Buttons & Encoders** | Mechanical hysteresis at cold temps; keycap brittleness | Specify operating range for mechanical inputs; test debounce timing at -10°C and 120°F |

**Test Plan**:
```
Test Environment: Environmental chamber (temperature-controlled)
Duration: 50 hours (5 power cycles at each of 5 temperature points)
Points: -10°C, 32°C, 72°F, 95°F, 105°F

Per temperature point:
  1. Power on, let stabilize for 5 min
  2. Run 500 button presses (test debounce, LED response)
  3. Capture all 6 measurement points
  4. Measure SHT40 reading vs. reference thermometer
  5. Check battery voltage (should not drop > 50mV at high temp)
  6. Log any watchdog resets or CPU throttling events
  7. Power off, cool/warm to next test point

Pass Criteria:
  - SHT40 accuracy within ±1.5°C (spec) at all temperatures
  - Button latency (press to LED green) < 500ms at all temperatures
  - Zero unplanned resets due to thermal issues
  - Battery voltage stable within ±5% over 8-hour simulated work day
```

---

#### 2. Humidity & Condensation

**Scenario**: Humidity 70–90% RH inside AC unit cabinets; condensation risk when moving device in/out of cold environments.

| Component | Risk | Mitigation |
|-----------|------|-----------|
| **SHT40 Sensor** | Condensation on sensor, false humidity readings | Implement warm-up cycles (let device run for 2 min before measurement) |
| **Clamp Probes** | Moisture in probe connector; intermittent contact | Sealing & drainage; test with salt-spray chamber |
| **Button Contacts** | Corrosion of micro-switch contacts over months | Gold-plated contacts; conformal coating |
| **I2C/SPI Lines** | Corrosion of traces (uncoated PCB)** | Use conformal coating; implement I2C error retry logic |

**Test Plan**:
```
ASTM B117 Salt-Spray Chamber (500 hours)
  - Assemble device in chamber at 35°C, 95% RH with 5% NaCl fog
  - Every 100 hours: power on, run full snapshot cycle, check for I2C errors
  - After 500 hours: disassemble, inspect for corrosion

IEC 60068 Humidity Cycling
  - Cycle 0–95% RH, 16°C–35°C, 10 cycles (20 days)
  - Check SHT40 calibration drift before/after
  - Measure button contact resistance

Warm-Up Simulation
  - Move device from 5°C freezer to 30°C, 80% RH
  - Wait 0, 30s, 1min, 2min
  - Measure SHT40 reading at each interval
  - Verify reading stabilizes within tolerance by 2 min
```

---

#### 3. RF Interference (EMI/RFI)

**Scenario**: Cordless drill, Wi-Fi router, or 2.4 GHz commercial equipment operating nearby.

| Source | Frequency | Impact | Mitigation |
|--------|-----------|--------|-----------|
| **Cordless Drill** | 2.4 GHz ISM band | BLE packet loss, dropped connections | Implement anti-jam retry logic, fallback to slower BLE PHY (1M vs. 2M) |
| **Wi-Fi Network** | 2.4 GHz (CH 1, 6, 11) | CCA (clear channel assessment) delays | Accept BLE latency jitter; timeout at 3s not 2s |
| **Microwave Oven** | 2.45 GHz, high power | Complete BLE blackout for 100ms bursts | Design for worst-case: tolerate 200ms disconnections |
| **Cell Tower** | 700 MHz, 800 MHz, 1.9 GHz | Usually not 2.4 GHz; low impact | Monitor but likely not a blocker |

**Test Plan**:
```
FCC EMI Test Lab Environment (semi-anechoic chamber)
  1. Establish BLE baseline: ≥99.5% packet delivery rate
  2. Introduce interferer (signal generator at specific frequency/power)
  3. Measure packet loss rate vs. interferer power (CW, modulated)
  4. Log connection drops, reconnection time
  5. Repeat for cordless drill, microwave, Wi-Fi interference
  
Acceptance Criteria:
  - ≥95% packet delivery with +15 dBm interferer at ±20 MHz
  - Reconnection time < 2s after interference stops
  - No unrecoverable device state after interference event
  - Mobile app resilient to connection drop (auto-reconnect)
```

---

#### 4. Power States & Sleep Recovery

**Scenario**: Device goes to deep sleep after 5 min idle; wakes via button press (GPIO EXT1 interrupt); recovers sleep cache.

| State | Risk | Mitigation |
|-------|------|-----------|
| **Deep Sleep** | Lost volatile memory; NVS persistence must work | Implement sleep cache writes after every measurement; verify CRC on wake |
| **Wake Latency** | GPIO EXT1 interrupt may take 50–200ms to execute | Ensure firmware responds within 100ms of button press; test actual latencies |
| **Sleep Cache Swap** | Before/After switch changes context; wrong cache read = data loss | Test 100 switch toggles with full measurement cycle; verify no data corruption |
| **Watchdog During Sleep** | Firmware must keep watchdog fed even in sleep mode | Use task that wakes periodically (every 2s) to pet watchdog |
| **OTA During Sleep** | Device powered down mid-OTA; must fail safely | Test power loss at each OTA partition write; verify rollback partition integrity |

**Test Plan**:
```
Power State Stress Test (100 cycles):
  1. Capture Before Set (6 measurements)
  2. Verify cache in NVS (checksum)
  3. Deep sleep for 5 min
  4. Button press wakes device
  5. Toggle Before/After switch
  6. Verify Before Set still in cache (no corruption)
  7. Capture After Set
  8. Finalize, power off
  9. Repeat 100 times
  
Watchdog Test (50 cycles):
  1. Initialize watchdog (5s timeout)
  2. Go to deep sleep
  3. Firmware must not reset during sleep
  4. Wake and verify no NVS corruption
  5. Check logs for watchdog pet events
  
OTA Rollback Test (20 cycles):
  1. Start OTA update to partition B
  2. At random byte offset (0–50% of image): cut power
  3. Device boots from partition A (rollback)
  4. Verify partition A still functional
  5. Retry OTA from start; complete successfully
```

---

#### 5. BLE Reconnection Failures

**Scenario**: Phone goes out of range (50+ meters, walls/interference); device and app reconnect after 30s.

| Scenario | Risk | Mitigation |
|----------|------|-----------|
| **Lost BLE Bond** | Reconnection requires re-pairing (crypto handshake) | Persist bonding info in both device & phone; implement fast reconnect path (< 2s) |
| **MTU Renegotiation** | During reconnect, may lose MTU (max 23 → 512 bytes); impacts fragmentation | Test with worst-case MTU (23 bytes); measure reassembly time |
| **Stale Phone Caches** | Phone's BLE stack caches old device address; may fail to re-discover | Implement timeout on phone-side cache; force rediscovery after 5 min disconnection |
| **Mid-Transmission Loss** | BLE packet loss during multi-packet snapshot sync | Use app-level retries (not just BLE layer); checksum each logical message |

**Test Plan**:
```
Range + Interference Stress:
  1. Pair device & phone (Bluetooth security level 2 or 3)
  2. Capture snapshot (all 6 Before Set points)
  3. Walk away; measure RSSI (received signal strength) at each 10m interval
  4. Identify distance where RSSI drops below -80 dBm (typical disconnect threshold)
  5. At that range, toggle: go in/out of range 10 times
  6. Verify device & phone reconnect each time (< 3s)
  7. Check no measurement data lost or duplicated
  8. Repeat with Wi-Fi interference (channel 6 running nearby)

Reconnect Latency:
  - Time from "connection lost" event to "ready for data" state
  - Target: < 2s
  - Log: crypto handshake time, MTU negotiation time, app initialization time
```

---

#### 6. Sensor Faults & Calibration Drift

**Scenario**: Clamp probe disconnects; SHT40 returns error code; external reference device is miscalibrated.

| Fault | Impact | Detection | Recovery |
|-------|--------|-----------|----------|
| **Clamp Probe Open Circuit** | ADC reads max value (4095); SL/LL temp = ??? | Progress LED flashes yellow | Mandatory re-capture; can't finalize with yellow LED |
| **SHT40 I2C Error** | CRC mismatch; sensor unresponsive | I2C transaction fails; retry logic | After 3 retries: use stale value or mark invalid |
| **Button Stuck (Contact Bounce)** | Multiple presses in < 50ms; debounce logic catches this | Firmware logs "bounce detected" | Discard bounced presses; require 50ms gap |
| **Rotary Encoder Noise** | Wrong direction detected; saturation temp increments randomly | Increment/decrement event logged | Require 2 consecutive steps same direction before updating |
| **Display Failure** | OLED unresponsive; device still works but user blind to progress | Display heartbeat fails; log error | LED fallback (all 6 lights flash in sequence = "all captured") |
| **SHT40 Calibration Drift** | After 6 months: reads +2°F above reference | Compare to reference at power-on; manual offset entry | Warn technician if offset > 0.5°F; require acknowledgment |

**Test Plan**:
```
Fault Injection Test Suite (50 faults per sensor):

1. Clamp Probe Open Circuit:
   - Simulate via high-impedance resistor (> 1 MΩ)
   - Verify Progress LED = yellow (flashing)
   - Attempt finalize (should fail)
   - Reconnect probe, re-capture (should succeed)

2. SHT40 I2C Error Injection:
   - Use I2C simulation to return bad CRC
   - Firmware should retry 3x within 100ms
   - After 3 failures: use stale cached value or return error
   - Verify app handles error gracefully

3. Button Contact Bounce:
   - Simulate by rapidly toggling GPIO (10 times in 50ms)
   - Count captured events (should be 1, not 10)
   - Verify no duplicate BLE packets sent

4. Rotary Encoder Noise:
   - Inject random gray-code transitions
   - Require 2 valid transitions in same direction
   - Verify saturation temp doesn't jump erratically
   - Log noise events for telemetry analysis

5. Long-Term Calibration Drift:
   - Expose SHT40 to reference chamber
   - Record offset vs. reference at 3-month intervals
   - Model drift curve (should be < 0.1°F/month linear)
   - Implement auto-correction or alert if slope anomalous
```

---

#### 7. Button Glitches & Encoder Input Noise

**Scenario**: Buttons in high-vibration environment (rough terrain, power tools); rotary encoder shaft flex causes false increments.

| Risk | Source | Detection | Prevention |
|------|--------|-----------|-----------|
| **Contact Bounce** | Mechanical micro-switches; bounces for 5–20ms | Debounce timer; require 50ms low-to-high transition | Hardware: quality switches (Cherry MX or equivalent) |
| **Phantom Increments** | Encoder shaft flex under load; noise in gray-code lines | Track consecutive increments; filter singles | Hardware: stiff shaft coupling; pull-up resistors on GPIO |
| **Double-Click** | User presses button twice within 200ms; counted as one capture | Timeout-based duplicate suppression (200ms window) | Firmware + UI feedback (LED green = "captured, skip") |
| **Stuck Button** | Dirt or mechanical failure; GPIO stuck low | Monitor press duration; timeout if > 5s | Firmware watchdog reset on stuck input |
| **Encoder Detent Slip** | User applies excessive torque; detent skips steps | Track position deltas; alert if > 2 steps per 100ms | Mechanical tuning; test under operator force (< 5 N-m torque spec) |

**Test Plan**:
```
Mechanical Durability (100,000 cycles per button/encoder):
  - Automated test rig (stepper motor driving button/encoder at 1 Hz)
  - Every 10,000 cycles: power cycle device, verify function
  - Log button press latency (time from mechanical press to GPIO interrupt)
  - Measure encoder gray-code error rate (should be 0)
  - After 100k cycles: disassemble, inspect contacts under microscope

Vibration Stress (MIL-STD-810H):
  - Mount device on shaker table
  - Sweep frequency 10–2000 Hz, 5G acceleration RMS, 1 hour
  - Monitor for button phantom presses during vibration
  - Log GPIO state changes with timestamp
  - After test: verify no mechanical damage, contacts intact

Operator Stress Test (Field Trial):
  - 10 technicians, 10 service calls each (100 total calls)
  - Log every button press / encoder rotation with timestamp
  - Calculate actual debounce times, detent slip events
  - Analyze for correlation between operator technique & failures
```

---

#### 8. Snapshot Finalization & Revision Handling

**Scenario**: User finalizes snapshot, loses network, creates revision, then tries to sync both.

| Case | Risk | Validation |
|------|------|-----------|
| **Missing Before Set** | User finalizes after only 3 of 6 Before measurements | Database constraint: can't finalize if any Before point is NULL | Check in app UI: "All 6 Before measurements required" |
| **Missing After Set** | User finalizes without any After measurements | Database constraint: after Set can have NULLs for products not needing repairs | Check: After Set can be created on demand, but finalization only counts if > 0 After measurements |
| **Timeout Expiry** | Measurement captured 25 minutes ago; confirm never arrived | Check `capture_time` vs. `confirm_time`; if diff > 20min, mark measurement invalid | Expire measurement in app; require re-capture within window |
| **Revision Parent Chain** | Revise revision A to create B; revise B to create C; C.parent_id points to B | Enforce: Revision only links to Finalized parent, not another revision | Prevent chain; require user to revise original snapshot |
| **Duplicate Revision Numbers** | Two devices create revisions simultaneously; both try revision_number = 2 | Cloud API assigns revision number server-side at upload time | Mobile app suggests, but cloud is source of truth |

**Test Plan**:
```
State Machine Validation (Jest test suite):

1. test_finalize_missing_before_set():
   - Create snapshot with [RA, SA, OA] (3 of 6 Before measurements)
   - Attempt finalize()
   - Assert: error "All 6 Before measurements required"

2. test_finalize_with_expired_measurement():
   - Capture RA at time T
   - Wait 21 minutes
   - Confirm RA at time T+21min
   - Attempt finalize()
   - Assert: error "Measurement expired, recapture required"

3. test_revision_parent_linkage():
   - Finalize snapshot A
   - Create revision B (parent_id = A.id)
   - Attempt to create revision C from B (parent_id = B.id)
   - Assert: error "Can only revise original snapshot, not another revision"

4. test_offline_finalize_then_sync():
   - Capture all Before + After (app offline)
   - Finalize (stored in Outbox)
   - Reconnect to network
   - Sync snapshot to cloud
   - Assert: Cloud DB has correct snapshot, audit trail shows offline finalization

5. test_duplicate_revision_recovery():
   - Two devices simultaneously create Revision 2 of same snapshot
   - First to sync wins (revision_number = 2)
   - Second device receives conflict; assigned revision_number = 3 server-side
   - Assert: Cloud DB has no duplicates, audit trail shows both attempts
```

---

## Part 5: Recommended Testing Implementation Roadmap

### Phase 1: Prototype (Weeks 1–4)

**Goal**: Validate core firmware and mobile logic; achieve 70% code coverage.

| Task | Owner | Tools | Deliverable |
|------|-------|-------|-------------|
| Firmware unit tests (sensor drivers, calculations) | Firmware Lead | ESP-IDF Unity Framework | 50+ tests covering drivers, state machine, BLE payload assembly |
| Mobile logic unit tests (snapshot state machine, calculations) | Mobile Lead | Jest | 40+ tests for React Native shared logic |
| BLE integration test harness (mocked virtual device) | QA Lead | Bleak (Python) + pytest | 10 integration test scenarios (single point, offline capture, packet loss) |
| Environmental chamber booking | DevOps | N/A | Access to -10°C to +120°F chamber for 40-hour baseline |

**Success Criteria**:
- 70% code coverage (firmware + mobile)
- 0 known P0 bugs
- BLE latency p50 < 300ms, p99 < 800ms (lab conditions)

---

### Phase 2: Beta (Weeks 5–8)

**Goal**: Validate system end-to-end with real hardware; stress test edge cases.

| Task | Owner | Tools | Deliverable |
|------|-------|-------|-------------|
| System E2E test (Detox on real devices) | QA Lead | Detox + Firebase Test Lab | 20 E2E scenarios (happy path, offline sync, revision) |
| BLE digital twin (mock server) | Backend Lead | Bleak + mock API | Simulates 1000 device-app interactions; validates idempotency under packet loss |
| Environmental stress (temperature, humidity, RF) | QA Lead | Chamber + signal generator | 50-hour stress results; SHT40 calibration drift data; RF interference thresholds |
| Field beta trial planning | Product Lead | Logistics | Partner with 5 HVAC technicians; 2-week trial in real environments |
| Crash telemetry instrumentation | Backend Lead | Sentry + custom logging | Backend captures every unhandled exception, device state, telemetry |

**Success Criteria**:
- ≥99% BLE message delivery rate (lab)
- SHT40 accuracy within ±1.5°C across all temperatures
- 0 unplanned device resets during 50-hour stress test
- 10+ field technician hours logged; NPS ≥ 6 (beta)

---

### Phase 3: Pre-Production (Weeks 9–12)

**Goal**: Validate production readiness; identify remaining edge cases.

| Task | Owner | Tools | Deliverable |
|------|-------|-------|-------------|
| Field trial expansion (10 technicians, 4 weeks) | Product Lead | In-house telemetry | 200+ service calls; telemetry analysis report (latency p50/p99, error rates, sensor drift) |
| Regression test suite automation (CI/CD) | QA Lead | GitHub Actions + pytest | Automated suite runs pre-release; 30-min runtime; zero regressions |
| OTA update stress (20 rollback cycles) | Firmware Lead | QEMU + power cycle rig | 100% successful rollback recovery; no partition corruption |
| Mechanical durability test (100k button cycles) | QA Lead | Test rig + microscopy | Button contact integrity post-test; no debounce timing drift |
| Salt-spray corrosion (ASTM B117) | Hardware Lead | Environmental chamber | 500-hour test; inspect for corrosion; assess conformal coating effectiveness |

**Success Criteria**:
- Field trial: ≥95% data accuracy (matches reference instruments), ≥ 7 NPS
- Regression suite: 100% pass rate, < 30 min execution
- Zero unrecovered OTA rollbacks
- Button debounce timing stable within ±10ms post-durability test

---

### Phase 4: Post-Launch (Ongoing)

**Goal**: Monitor production behavior; respond to field anomalies.

| Task | Owner | Tools | Deliverable |
|------|-------|-------|-------------|
| Telemetry monitoring (BLE latency, SHT40 calibration drift, error rates) | Backend Lead | Prometheus + Grafana | Real-time dashboards; alerting on thresholds (latency > 1s, sensor drift > 0.5°F) |
| Field anomaly triage (crash reports, technician feedback) | QA Lead | Sentry + customer surveys | Weekly triage meeting; identify patterns (e.g., "BLE disconnects in specific RF environments") |
| Regression test updates (new edge cases discovered in field) | QA Lead | pytest + GitHub Actions | Add tests for field-discovered issues before shipping hotfixes |

**Success Criteria**:
- ≥ 99.5% uptime (device firmware)
- ≤ 0.1% unhandled exception rate
- SHT40 calibration drift ≤ 0.2°F over 6 months (median across fleet)
- Response time to P0 field bugs ≤ 24 hours

---

## Summary: Strategic Implementation Priorities

### Immediate (Next 2 Weeks)

1. **Set up unit test infrastructure**
   - Firmware: ESP-IDF Unity tests for drivers and state machine
   - Mobile: Jest tests for React Native shared logic
   - Target: 70% code coverage

2. **Create BLE integration test harness** (Bleak + mock device)
   - Validate core scenarios (button press → BLE → SQLite)
   - Test under simulated packet loss (5–20%)

3. **Book environmental chamber time**
   - Baseline tests at -10°C, 32°C, 72°C, 95°F, 105°F
   - Measure SHT40 accuracy drift, battery behavior, button latency

### Next 4 Weeks (Beta Readiness)

1. **Build digital twin (BLE mock server)**
   - Simulate 1000+ device-app interactions
   - Validate idempotency, packet loss recovery, offline sync

2. **Expand E2E tests (Detox + real devices)**
   - Happy path (capture → finalize → sync)
   - Offline scenarios (capture offline, sync when reconnected)
   - Revision workflow

3. **Launch field beta trial**
   - 5 HVAC technicians, 2 weeks, real environments
   - Instrument telemetry (button latency, BLE drops, sensor readings)

### Weeks 5–8 (Pre-Production)

1. **Complete 50-hour environmental stress test**
   - Temperature cycling, humidity cycling, RF interference
   - Analyze SHT40 drift, battery degradation, mechanical durability

2. **Expand field trial (10 technicians, 4 weeks, 200+ calls)**
   - Measure data accuracy vs. reference instruments
   - Collect NPS, usability feedback
   - Identify field edge cases

3. **Automated regression suite (CI/CD)**
   - Runs pre-release
   - 30-min runtime
   - Covers all edge cases discovered in field

### Ongoing (Post-Launch)

1. **Real-time telemetry monitoring**
   - Prometheus + Grafana dashboards
   - Alert on latency spikes, sensor drift, error rates

2. **Weekly anomaly triage**
   - Triage field-reported issues
   - Add regression tests for new edge cases

---

## Recommended Tool Stack Summary

| Layer | Tool | Cost | Effort |
|-------|------|------|--------|
| **Firmware Unit Tests** | ESP-IDF Unity Framework | Free | Low |
| **Mobile Unit Tests** | Jest | Free | Low |
| **Integration Tests (BLE)** | Bleak + pytest | Free | Medium |
| **System Tests (E2E)** | Detox + Firebase Test Lab | $0–500/month | Medium |
| **Digital Twin** | Custom Python harness (Bleak-based) | Free | Medium–High |
| **Environmental Testing** | Rental: temp chamber ($500/week) | $2–5k | Medium |
| **RF Interference Testing** | Signal generator (~$2k), Sniffer ($200) | $2–3k | Medium |
| **Mechanical Durability** | Test rig build ($1–5k) + 100k cycle run | $2–5k | Medium |
| **Field Trial Logistics** | Technician time, travel reimbursement | $5–10k | High |
| **CI/CD Integration** | GitHub Actions (free tier) | Free | Low |
| **Telemetry Monitoring** | Sentry free tier + self-hosted Prometheus | $0–500/month | Medium |
| **Hardware Debugging** | JTAG debugger (J-Link EDU ~$200), Logic Analyzer (~$150) | $300–500 | Low |

**Total Budget for Full Testing Suite**: $20–30k (includes environmental chamber rental, RF lab access, field trial logistics).

---

## References & Further Reading

### Real-World Case Studies
- **DJI Phantom Testing Pipeline** (public white papers): Multi-layer testing from unit to field, focus on RF stability in varied environments
- **Harman Automotive Testing** (public talks): Hardware-in-the-loop integration, digital twins for power delivery
- **Zypher Medical Devices** (FDA Class II): Failure Mode & Effects Analysis (FMEA), traceability matrices, field surveillance

### Tools & Standards
- **ESP-IDF Testing Docs**: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/unit-tests.html
- **Bluetooth SIG Test Suite**: https://www.bluetooth.org/docman/handlers/downloaddoc.ashx?doc_id=387948 (qualification test specs)
- **QEMU ESP32 Emulation**: https://github.com/espressif/esp-qemu
- **Bleak (Python BLE)**: https://github.com/dlech/bleak
- **Detox (React Native E2E)**: https://detox.e2e.dev/
- **Robot Framework**: https://robotframework.org/
- **ASTM B117 Salt-Spray Standard**: Industry standard for corrosion testing

---

**Next Steps**: Choose a single tool from Part 3 (recommend: Unit tests + BLE mock harness) and implement by end of week. This locks in your test infrastructure early; all subsequent testing builds on this foundation.
