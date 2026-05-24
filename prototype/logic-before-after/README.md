# HVAC Helper Pro - BEFORE/AFTER Switch Context-Swap Prototype

This is an interactive console simulator (TUI) designed to validate the physical BEFORE/AFTER switch behavior, device-side cache pointers, display redraws, BLE recovery notifications, and mobile app mirror state.

## Questions Answered

1. **Immediate Display Pointer Swap**: When the technician slides the physical switch, the handheld should redraw from the selected cache immediately, without waiting for the mobile app.
2. **Separate BEFORE and AFTER Caches**: Captures made in BEFORE mode must not overwrite AFTER mode values, and vice versa.
3. **BLE Recovery Replay**: When the switch moves, the device retransmits the full active cache so the mobile app can recover after missed notifications.
4. **Disconnected Standalone Behavior**: If BLE is disconnected, the device keeps capturing locally and logs missed sync events for later recovery.
5. **Progress LED Semantics**: The active set shows yellow for missing values, green for captured values, and flashing yellow for a simulated sensor fault.
6. **Mobile Mirror Visibility**: The simulator renders both the device cache and the app mirror so stale app state is obvious during BLE interruptions.
7. **NVS Recovery Clues**: Missed syncs and sensor faults are logged as NVS-style events to support later diagnostics.

---

## How to Run the Simulator

Run the following command from the repository root:

```bash
npm run prototype:logic-before-after
```

---

## Simulator Keyboard Shortcuts

### Physical Device Controls

*   `[TAB]` **Slide BEFORE/AFTER Switch**: Swaps the active display pointer and retransmits the selected cache when BLE is connected.
*   `[1]` **Return Air (RA)**: Captures return air temperature and humidity into the active cache.
*   `[2]` **Supply Air (SA)**: Captures supply air temperature into the active cache.
*   `[3]` **Outdoor Ambient (OA)**: Captures outdoor ambient temperature into the active cache.
*   `[4]` **Discharge Air (DA)**: Captures discharge air temperature into the active cache.
*   `[5]` **Suction Line (SL)**: Captures suction pipe temperature and saturation temperature into the active cache.
*   `[6]` **Liquid Line (LL)**: Captures liquid pipe temperature and saturation temperature into the active cache.

### Recovery and Fault Scenarios

*   `[b]` **Toggle BLE Connection**: Disconnects or reconnects BLE. Captures still write to the device cache while disconnected.
*   `[r]` **Replay Active Cache**: Manually retransmits the selected BEFORE or AFTER cache to the mobile app mirror.
*   `[f]` **Cycle Sensor Fault**: Moves a simulated sensor fault through RA, SA, OA, DA, SL, and LL. The active LED state flashes yellow for the faulted slot.
*   `[c]` **Reset Simulator**: Clears caches, app mirror state, sequence counters, and fault state.
*   `[q]` **Quit**: Exits the simulation.

---

## What To Watch

*   The **Top display pointer** should change immediately on `[TAB]`.
*   The **Device cache** should preserve different BEFORE and AFTER values.
*   The **Mobile app mirror** should become stale when BLE is disconnected.
*   The **Last app notification** sequence should advance when retransmission succeeds.
*   The **NVS / recovery log** should capture missed BLE syncs and simulated sensor faults.
