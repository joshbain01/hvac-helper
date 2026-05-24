# HVAC Helper Pro – Logic State Prototype (V3)

This is an interactive console simulator (TUI) designed to validate, test, and model the hardware interfaces, state machines, and local synchronization lifecycles of the HVAC Helper Pro system.

## Questions This Prototype Is Testing

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

## How to Run the Simulator

Run the following command from the repository root:

```bash
npm run prototype:logic-state
```

*Note: Ensure you have Node.js (v16+) installed.*

---

## Simulator Keyboard Shortcuts

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
*   `[u]` **OCR Manual Override**: Simulates manually editing equipment details (sets `ocr_status` to `MANUAL_OVERRIDE` and writes telemetry to NVS logs).
*   `[n]` **Add Required Notes**: Captures LLM notes and auto-itemized consumables. (Must be done before finalization).
*   `[f]` **Finalize Snapshot**: Validates completeness. Blocks if notes or before-set data are missing. Pushes to Outbox.
*   `[s]` **Sync Outbox**: Uploads all Outbox snapshots to the cloud server database.
*   `[b]` **Toggle BLE Connection**: Connect/disconnect BLE. When disconnected, BLE icon `📶` disappears, but device still functions.
*   `[w]` **Toggle Network Connection**: Connect/disconnect internet. Sync `[s]` will fail while offline.
*   `[x]` **Toggle BLE Failure Mode**: Forces BLE transmission errors.
*   `[y]` **Toggle Sensor Faults**: Simulates a sensor/probe fault (turns button LED flashing yellow, logs failure in NVS).
*   `[o]` **Change Timeout**: Adjusts snapshot timeout window dynamically (10, 20, 30, or 60 minutes).
*   `[t]` **Tick +1 Minute**: Advances simulation clock.
*   `[m]` **Tick Expire (Timeout)**: Advances time past the current timeout window.
*   `[r]` **Create Snapshot Revision**: Creates a parent-linked draft revision inheriting all parent measurements.
*   `[c]` **Reset Simulator**: Resets all variables.
*   `[q]` **Quit**: Exit simulation.

---

## What To Watch

*   **Q1**: Look at the OLED display rows. All labels are exactly 6 characters: `Return`, `Supply`, `Ambint`, `Dischg`, `Suctn·`, `Liquid`. The right column fits `Delta T`, `Superht`, `Subcool`, `Refrig·` without truncation. Press `[1]` then `[2]` — watch the values populate without overflowing the box borders.

*   **Q2**: All 6 LEDs start yellow (`Needs Capture`). Press `[1]` — the Return Air LED turns `GREEN (Captured)`. Press `[y]` (toggle fault on Suction Line) and then try `[6]` — the SL LED shows `FLASHING YELLOW (Fault)` and the capture is rejected. All three states should be visually distinct at a glance.

*   **Q3**: Press `[e]` to simulate an OCR scan — Equipment model/serial and Refrigerant populate on the Mobile App panel. Press `[TAB]` to switch to AFTER mode. Verify that Equipment and Refrigerant are still shown with the same values. Press `[TAB]` back to BEFORE — they should be unchanged. These are snapshot-level fields, not phase-specific.

*   **Q4**: On the OLED display, Superheat and Subcooling targets initially show `(Gen)` (generic). Press `[e]` to simulate an OCR nameplate scan. Watch the target labels change to `(Conf)` with model-specific ranges (e.g. `10-14 (Conf)`). The `(Conf)` suffix confirms the device is using app-validated factory tolerances rather than defaults.

*   **Q5**: Complete a Before-only flow: capture sensors `[1][2][3][4][5][6][7][8]`, add notes `[n]`, scan nameplate `[e]`, finalize `[f]`, sync `[s]`. Then press `[r]` to create a Revision. The new draft should show `Revision: 2` and all Before sensor readings should already appear as captured — the technician only needs to capture the After set.

*   **Q6**: Press `[u]` (OCR Manual Override) — the Device NVS Telemetry section at the bottom of the display should immediately show a new `OCR_MANUAL_OVERRIDE` entry with the model and serial that were typed. Press `[y]` and then try capturing `[6]` (SL with fault active) — a `SENSOR_FAULT` entry should appear. Press `[m]` (tick expire) after capturing a reading — a `POINT_EXPIRED` entry should appear. All three telemetry event types should be visually distinguishable in the log.

*   **Q7**: Press `[b]` to disconnect BLE — the 📶 icon disappears from the OLED. Capture sensors `[1][2][5][6][7][8]` — readings appear in the OLED display and Superheat/Subcooling are calculated in real-time (standalone operation). Check the Mobile App panel — all data points still show `Missing` because nothing was transmitted. Reconnect with `[b]` and press `[TAB]` to resync — the app-side values should now populate.

*   **Q8**: Complete the full flow: capture all Before sensors `[1][2][3][4][5][6][7][8]`, press `[TAB]`, capture all After sensors `[1][2][3][4][5][6][7][8]`, scan nameplate `[e]`, add notes `[n]`, then finalize `[f]`. Before finalizing, the Performance Delta Summary should appear on the Mobile App panel showing Before vs After values and the signed change (e.g. `+2.3°F`) for Delta T, Superheat, and Subcooling.
