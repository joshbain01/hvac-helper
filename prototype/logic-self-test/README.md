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

*   **Q1**: On a clean run (no faults), press `[p]` — mode shows `FULL_SERVICE`. The `Criticality` column labels which checks are `CRITICAL` (all 6 must pass) vs `DEGRADABLE`. The answer is: all CRITICAL checks must pass, and there are no DEGRADABLE-only paths to full-service.

*   **Q2**: Press `[4]` (BLE fault), then `[p]` — one DEGRADABLE failure → `DEGRADED_STANDALONE`. Press `[5]` (probe fault), then `[p]` again — two failures still `DEGRADED_STANDALONE`. This is the tolerance ceiling: 1–2 non-critical failures are survivable.

*   **Q3**: Three separate tests for the lockout combinations:
    *   Press `[1]` (display) then `[p]` — mode should be `SERVICE_LOCKOUT` even though only one component failed (display alone forces lockout — technician has no output).
    *   Reset (`[r]`), press `[2]` (buttons) + `[3]` (encoders) then `[p]` — `SERVICE_LOCKOUT` because both input mechanisms are lost simultaneously.
    *   Reset, press `[4]` + `[5]` + `[6]` (BLE + probes + battery) then `[p]` — three DEGRADABLE failures → count-based `SERVICE_LOCKOUT`.

*   **Q4**: Before pressing `[p]`, inject a fault with `[1]` or `[5]`. The `Projected mode if POST ran now` line shows the likely outcome while the check list already highlights the `⚡ FAULT` column. Check whether a technician in the field could read the output and identify which component to service.

*   **Q5**: Inject a mix of faults and read the `Projected mode` line before running POST — it names the reason (`buttons + encoders both failed`, `display failed`, etc.). If the reason text is clear enough to drive a field decision without running the code, the mode logic is well-formed for firmware implementation.
