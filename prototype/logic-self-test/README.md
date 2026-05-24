# HVAC Helper Pro - Hardware Power-On Self-Test Prototype

This is a throwaway terminal simulator for validating firmware POST behavior and degraded operating modes.

## Questions This Prototype Is Testing

1. Which hardware checks must pass before the handheld enters full-service mode?
2. How many component failures can the device tolerate before it should enter degraded standalone mode?
3. Which failure combinations should force service lockout rather than partial operation?
4. Are display, buttons, encoders, BLE, probes, and battery checks visible enough for technician troubleshooting?
5. Does fault injection make the resulting device mode easy to reason about before firmware implementation?

---

## How to Run

```bash
npm run prototype:logic-self-test
```

---

## Simulator Keyboard Shortcuts

*   `[1]` **Display Fault**: Toggles the I2C OLED check failure.
*   `[2]` **Button Fault**: Toggles tactile input failure.
*   `[3]` **Encoder Fault**: Toggles rotary encoder failure.
*   `[4]` **BLE Fault**: Toggles BLE radio advertising failure.
*   `[5]` **Probe Fault**: Toggles clamp probe reading failure.
*   `[6]` **Battery Fault**: Toggles charger/battery telemetry failure.
*   `[p]` **Run POST**: Runs all checks and computes the resulting device mode.
*   `[r]` **Reset**: Clears injected faults and POST results.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   The mode should remain `NOT_RUN` until POST executes.
*   A clean run should enter `FULL_SERVICE`.
*   One or two failures should enter `DEGRADED_STANDALONE`.
*   Three or more failures should enter `SERVICE_LOCKOUT`.
