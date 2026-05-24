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

*   `[s]` **Verify Signature**: Marks the staged image as trusted and eligible for pending boot.
*   `[b]` **Boot Pending**: Boots the pending slot without confirming it.
*   `[t]` **Run Self-Test**: Simulates hardware self-test success on the pending firmware.
*   `[c]` **Confirm Firmware**: Confirms the pending slot only after signature and self-test pass.
*   `[w]` **Watchdog Crash**: Simulates a crash during pending boot and rolls back.
*   `[h]` **Hold RA+SA Rollback**: Simulates physical rollback override during power-up.
*   `[r]` **Reset**: Restores the initial confirmed-slot state.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   The active partition should not change until pending boot is requested.
*   The confirmed partition should not change until self-test and confirmation complete.
*   Watchdog failures during pending boot should clear the pending slot.
*   Physical rollback should always return to the last confirmed slot.
