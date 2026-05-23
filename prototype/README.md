# HVAC Helper Pro – Logic State Prototype

This is a throwaway interactive console prototype designed to flesh out, validate, and test the state machine, hardware interactions, and local synchronization lifecycles of the HVAC Helper Pro system.

## ❓ The Questions Being Answered

1. **Hardware-Software Timing & Timeout Integration**: How do physical button presses, BLE packet transfer latencies, and 20-minute before/after measurement timeouts behave together? If a technician takes 25 minutes to complete a repair, how do we handle point-level expirations?
2. **Offline-First Synchronization Flow**: How do snapshots transition from `DRAFT` to `FINALIZED` (immutable locally, queued in SQLite outbox) to `SYNCED` (processed in cloud database)? How do revisions of finalized snapshots get tracked and linked?

---

## 🚀 How to Run the Prototype

Run the following command from the repository root:

```bash
npm run prototype
```

*Note: Ensure you have Node.js (v16+) installed.*

---

## ⌨️ Simulator Keyboard Shortcuts

### Handheld Device Controls
*   `[1]` **Return Air (RA)**: Capture room air temperature and humidity.
*   `[2]` **Supply Air (SA)**: Capture supply air temperature.
*   `[3]` **Outdoor Ambient (OA)**: Capture condenser entry temperature.
*   `[4]` **Discharge Air (DA)**: Capture condenser exhaust temperature.
*   `[5]` **Dial Suction saturation temperature**: Decrements saturation dial by -2°F (simulates turning the left rotary encoder).
*   `[6]` **Confirm SL (Push encoder dial)**: Captures suction pipe temperature via probe and locks the dial value.
*   `[7]` **Dial Liquid saturation temperature**: Decrements saturation dial by -5°F (simulates turning the right rotary encoder).
*   `[8]` **Confirm LL (Push encoder dial)**: Captures liquid pipe temperature via probe and locks the dial value.
*   `[TAB]` **Toggle active focus**: Switch between capturing the `Before Set` and the `After Set` measurements.

### Companion App & Environment Simulators
*   `[e]` **Mock Photo Capture (OCR)**: Extracts model/serial numbers from the unit nameplate.
*   `[n]` **Mock LLM Note Expansion**: Summarizes the service description and lists consumables.
*   `[f]` **Finalize Snapshot**: Validates inputs. If complete, marks snapshot as immutable and queues it in the Outbox.
*   `[s]` **Sync Outbox**: Uploads all queued snapshots to the cloud server database.
*   `[b]` **Toggle BLE Link**: Connect or disconnect the device-to-phone Bluetooth connection.
*   `[x]` **Toggle BLE Failure Mode**: Simulate packet drops (forces ESP32 NVS logging and error LEDs).
*   `[w]` **Toggle Internet Connection**: Toggle phone network connectivity (WiFi/LTE).
*   `[t]` **Tick Time +1 Minute**: Advances simulation clock.
*   `[m]` **Tick Time +21 Minutes**: Forces the 20-minute individual point timeout to expire.
*   `[r]` **Create Revision**: Create a parent-linked draft of the last finalized snapshot to make edits.
*   `[c]` **Reset Simulator**: Wipe all state and start fresh.
*   `[q]` **Quit**: Exit the simulator.

---

## ⚙️ Core State Rules Validated

1. **Individual Point Expiration**: If a data point is captured and simulated time advances by more than 20 minutes, that specific data point is discarded (removed from the set). The other captured points remain intact.
2. **Calculations**:
    *   `Delta T` requires both RA and SA to display.
    *   `Superheat` requires SL pipe temp and SL dial saturation temp.
    *   `Subcooling` requires LL pipe temp and LL dial saturation temp.
3. **Immutability & Outbox**: Finalizing a snapshot validates that all required parameters are present (either 6 points for before set diagnostic-only, or 12 points for completed before + after sets). Once finalized, the snapshot becomes immutable. Any edits must spawn a new snapshot with an incremented revision number, linked via `parent_id`.
