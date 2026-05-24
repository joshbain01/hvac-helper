# HVAC Helper Pro - Partition Swap and Rollback Prototype

This is a throwaway terminal simulator for validating ESP32 OTA boot safety before writing firmware update code.

## Questions This Prototype Is Testing

1. Which state transition should mark a downloaded firmware image as pending but not yet confirmed?
2. Does signature verification happen early enough to prevent an untrusted image from being booted?
3. Does the pending firmware become confirmed only after the power-on self-test passes?
4. When the watchdog fires during a pending boot, does the device roll back to the last confirmed partition?
5. Does the physical RA+SA rollback override remain available even if software confirmation is stuck?

---

## How to Run

```bash
npm run prototype:logic-rollback
```

---

## Simulator Keyboard Shortcuts

*   `[d]` **Download/Stage**: Downloads the candidate image to slot B — enters `STAGED_UNVERIFIED`. No signature check yet; not pending.
*   `[s]` **Verify Signature**: Verifies the staged image — this is the transition that sets `pending`. Requires `[d]` first.
*   `[b]` **Boot Pending**: Boots the pending slot. Blocked with a counter increment if the image is staged but not yet signature-verified.
*   `[t]` **Run Self-Test**: Simulates hardware self-test success on the pending firmware. Required before confirm.
*   `[c]` **Confirm Firmware**: Confirms the pending slot — gated on both signature and self-test. Shows what's missing if either is absent.
*   `[w]` **Watchdog Crash**: Fires the watchdog — rolls active back to last confirmed slot and clears all update state.
*   `[h]` **Hold RA+SA Override**: Physical rollback at power-up — forces active to confirmed regardless of software state. Works in any phase.
*   `[r]` **Reset**: Restores the initial confirmed-slot state.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   **Q1**: Watch the `FSM Phase` label step through `CONFIRMED → STAGED_UNVERIFIED → AWAITING_BOOT` — the `AWAITING_BOOT` transition (after `[s]`) is exactly when pending is set.
*   **Q2**: Press `[d]` to stage, then immediately press `[b]` — the `Blocked boot attempts` counter should increment and the event log should show `[BLOCKED Q2]`. Signature must come first.
*   **Q3**: After `[d]` → `[s]` → `[b]`, press `[c]` without pressing `[t]` first — confirm should be refused with a message naming what's missing.
*   **Q4**: After `[d]` → `[s]` → `[b]`, press `[w]` — active should roll back to the last confirmed slot and all pending state should clear.
*   **Q5**: Get into `PENDING_BOOT` (without running self-test, simulating a stuck confirmation) then press `[h]` — physical override should force rollback regardless of software state.
