# HVAC Helper Pro – Logic State Prototype (V2)

This is an interactive console simulator (TUI) designed to validate, test, and model the hardware interfaces, state machines, and local synchronization lifecycles of the HVAC Helper Pro system.

## ❓ The Questions Answered (V2 Updates)

1. **Top-Mounted Single Display (Option B)**: How do we present 6 sensor channels and calculations side-by-side on a single 128x64 display using 6-character labels instead of confusing acronyms?
2. **Standalone Operation**: How does the device function as a standalone calculator when BLE is disconnected? It displays calculations based on dial saturations and probe temperatures without needing an app.
3. **Generic vs. Factory Ranges**: If the app hasn't scanned the service tag, the device displays generic standard defaults (`SH: 8-15`, `SC: 8-12`) labeled `(Gen)`. Once scanned, the app pushes model-specific ranges (e.g. `10-14 (Fact)`) back to the hardware display.
4. **Physical Switch Context-Swap (Option A)**: Toggling the Before/After slide switch context-swaps screen displays (preventing confusion) and re-transmits all currently cached set readings to the mobile app.
5. **Mandatory Notes Check**: Snapshots block finalization unless technician notes are captured.
6. **Thermodynamic Performance Deltas**: The final CRM sync includes comparative changes (Before vs. After differences) for Delta T, Superheat, and Subcooling.

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
*   `[4]` **Discharge Air (DA)**: Capture discharge air temperature.
*   `[5]` **Dial SL Sat Saturation**: Decreases sat dial temp by -2°F.
*   `[6]` **SL Clamp Push (Confirm/Probe)**: Captures suction line pipe temperature.
*   `[7]` **Dial LL Sat Saturation**: Decreases sat dial temp by -5°F.
*   `[8]` **LL Clamp Push (Confirm/Probe)**: Captures liquid line pipe temperature.
*   `[TAB]` **Physical Before/After Switch**: Slids between BEFORE and AFTER mode, swapping display cache and re-syncing over BLE.

### Mobile App & Cloud Simulators
*   `[e]` **Photo Capture (OCR)**: Scans nameplate. Identifies model/serial, loads refrigerant (`R-410A`), and pushes factory ranges to device display.
*   `[n]` **Add Required Notes**: Captures LLM notes and auto-itemized consumables. (Must be done before finalization).
*   `[f]` **Finalize Snapshot**: Validates completeness. Blocks if notes or before-set data are missing. Pushes to Outbox.
*   `[s]` **Sync Outbox**: Uploads all Outbox snapshots to the cloud server database.
*   `[b]` **Toggle BLE Connection**: Connect/disconnect BLE. When disconnected, BLE icon `📶` disappears, but device still functions.
*   `[x]` **Toggle BLE Failure Mode**: Forces BLE transmission errors.
*   `[y]` **Toggle Sensor Faults**: Simulates a sensor/probe fault (turns button LED red, logs failure in NVS).
*   `[o]` **Change Timeout**: Adjusts snapshot timeout window dynamically (10, 20, 30, or 60 minutes).
*   `[t]` **Tick +1 Minute**: Advances simulation clock.
*   `[m]` **Tick Expire**: Advances time past the current timeout window to test point expiration.
*   `[r]` **Create Snapshot Revision**: Creates a parent-linked draft of the last synced snapshot.
*   `[c]` **Reset Simulator**: Resets all variables.
*   `[q]` **Quit**: Exit simulation.
