# HVAC Helper Pro – Logic State Prototype (V3)

This is an interactive console simulator (TUI) designed to validate, test, and model the hardware interfaces, state machines, and local synchronization lifecycles of the HVAC Helper Pro system.

## ❓ The Questions Answered (V3 Updates)

1. **Top-Mounted Single Display**: How do we present 6 sensor channels and calculations side-by-side on a single 128x64 display using 6-character labels instead of confusing acronyms?
2. **Progress Checklist LEDs**: The physical LEDs next to the buttons serve as a visual prompt checklist of what measurements are still missing in the active set:
    *   **Solid Yellow**: Measurement **not** yet captured in the active set (needs attention).
    *   **Solid Green**: Measurement captured and confirmed.
    *   **Flashing Yellow**: Sensor fault/unplugged.
3. **Metadata Preservation**: Refrigerant and nameplate model/serial numbers are snapshot-level fields and remain identical across Before and After phases.
4. **Confirmed Targets**: Once the app scans a nameplate, the confirmed tolerances are pushed back to the device screen, labeled with a `(Conf)` suffix (e.g. `10-14 (Conf)`). Default fallback targets show `(Gen)`.
5. **Revision Inheritance**: Creating a revision clones **all** parent data (including Before and After measurements and calculations) so the technician doesn't have to recapture sensor data.
6. **OCR Manual Override Telemetry**: Adds an `ocr_status` metadata field (`PENDING`, `OCR_SUCCESS`, `MANUAL_OVERRIDE`). If the technician manually overrides model/serial numbers, the status changes to `MANUAL_OVERRIDE` and writes a telemetry event to device NVS logs.
7. **Standalone Operation**: The device calculates Superheat and Subcooling independently. If not synced with the app, it displays generic targets.
8. **Thermodynamic Performance Deltas**: The final CRM sync includes comparative changes (Before vs. After differences) for Delta T, Superheat, and Subcooling.

---

## 🚀 How to Run the Simulator

Run the following command from the repository root:

```bash
npm run prototype:logic-state
```

*Note: Ensure you have Node.js (v16+) installed.*

---

## ⌨️ Simulator Keyboard Shortcuts

### Handheld Device Controls
*   `[1]` **Return Air (RA)**: Capture return air temperature and humidity.
*   `[2]` **Supply Air (SA)**: Capture supply air temperature.
*   `[3]` **Outdoor Ambient (OA)**: Capture outdoor ambient temperature.
*   `[4]` **Discharge Air (DA)**: Capture outdoor discharge temperature.
*   `[5]` **Dial SL Sat Saturation**: Decreases sat dial temp by -2°F.
*   `[6]` **SL Clamp Push (Confirm/Probe)**: Captures suction line pipe temperature.
*   `[7]` **Dial LL Sat Saturation**: Decreases sat dial temp by -5°F.
*   `[8]` **LL Clamp Push (Confirm/Probe)**: Captures liquid line pipe temperature.
*   `[TAB]` **Physical Before/After Switch**: Slides between BEFORE and AFTER mode, swapping display cache and re-syncing over BLE.

### Mobile App & Cloud Simulators
*   `[e]` **Photo Capture (OCR Scan)**: Scans nameplate. Identifies model/serial, loads refrigerant (`R-410A`), sets `ocr_status` to `OCR_SUCCESS`, and pushes factory ranges to device display.
*   `[u]` **OCR Manual Override**: Simulates manually editing equipment details (sets `ocr_status` to `MANUAL_OVERRIDE` and writes telemetry to logs).
*   `[n]` **Add Required Notes**: Captures LLM notes and auto-itemized consumables. (Must be done before finalization).
*   `[f]` **Finalize Snapshot**: Validates completeness. Blocks if notes or before-set data are missing. Pushes to Outbox.
*   `[s]` **Sync Outbox**: Uploads all Outbox snapshots to the cloud server database.
*   `[b]` **Toggle BLE Connection**: Connect/disconnect BLE. When disconnected, BLE icon `📶` disappears, but device still functions.
*   `[x]` **Toggle BLE Failure Mode**: Forces BLE transmission errors.
*   `[y]` **Toggle Sensor Faults**: Simulates a sensor/probe fault (turns button LED flashing yellow, logs failure in NVS).
*   `[o]` **Change Timeout**: Adjusts snapshot timeout window dynamically (10, 20, 30, or 60 minutes).
*   `[t]` **Tick +1 Minute**: Advances simulation clock.
*   `[m]` **Tick Expire (Timeout)**: Advances time past the current timeout window.
*   `[r]` **Create Snapshot Revision**: Creates a parent-linked draft revision inheriting all parent measurements.
*   `[c]` **Reset Simulator**: Resets all variables.
*   `[q]` **Quit**: Exit simulation.
