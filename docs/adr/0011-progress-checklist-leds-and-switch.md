# 11. Progress Checklist LEDs and Physical BEFORE/AFTER Switch

**Status**: Accepted  
**Date**: 2026-05-24  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-design-ux-researcher` (UX Researcher) + `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

Technicians need simple, immediate feedback showing which measurements have been successfully captured and which are still missing for the current diagnostic step. 
- In the original design, status LEDs next to buttons flashed amber on transmission, turned green on confirmation, and flashed red on error.
- During field testing discussions, it became clear that technicians do not need real-time transmission logs on the buttons; rather, they need a clear "checklist" indicating completion.
- Additionally, capturing "Before" (pre-service) and "After" (post-service) measurements is a regulatory and operational requirement. The device needs an intuitive way to toggle between these two sets while maintaining distinct caches and syncing them reliably with the mobile app, even in case of intermittent Bluetooth connections.

## Decision

We will implement:
1. **Progress Checklist LEDs**: 
   - A two-color (Yellow/Green) LED next to each button or rotary encoder.
   - **Solid Yellow**: Measurement has not yet been captured in the active set (needs attention).
   - **Solid Green**: Measurement has been successfully captured and received.
   - **Flashing Yellow (2 Hz)**: Sensor or probe fault detected.
   - This eliminates the amber transmission flash and red error LEDs on the buttons, keeping the interface extremely clean and focused.

2. **Physical BEFORE/AFTER Switch**:
   - A rugged slide switch on the handheld device.
   - Toggling the switch context-swaps display values and the progress LEDs.
   - When switched, it also triggers a BLE re-transmission of all cached values in the selected set, serving as a robust sync-recovery mechanism if the mobile app loses connection temporarily.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Absence of Transmission Feedback:** Since the LEDs no longer pulse amber during BLE transmission, how does a technician know if data is transferring or if the connection has failed?
> *Recommended Answer*: The top display contains a dedicated BLE icon `[📶]` that shows connection status. A transfer takes under 3 seconds; keeping the button LEDs as a persistent checklist (Yellow to Green) reduces visual noise and cognitive overload, which is highly preferred by technicians over flashing connection logs.
> 
> **2. Slide Switch Durability and Debris:** A physical slide switch is a mechanical ingress point. In dusty, oily HVAC environments, can the switch gum up and fail?
> *Recommended Answer*: We will specify an IP-67 rated sealed slide switch with an internal rubber boot. This prevents dust, water, and refrigerant oil from entering the enclosure, maintaining mechanical reliability over a 5-year operating lifecycle.
> 
> **3. Sync Desynchronization:** If the technician slides the switch but the mobile app is closed or backgrounded, does the app's state get out of sync with the device's physical switch?
> *Recommended Answer*: Yes, which is why the switch trigger initiates a full re-transmission of all cached measurements for the newly selected phase. The mobile app updates its active view dynamically based on the state payload pushed by the device, ensuring the software always aligns with the physical switch.

## Alternatives Considered

- **Software Mode Menu**: Using a button combination to toggle Before/After sets. Rejected because tactile slide switches provide instant physical feedback and allow the technician to verify the active state without reading the screen.
- **Red/Green/Amber RGB LEDs**: Sourcing RGB LEDs and implementing multiple blink states (transmitting, success, error, fault). Rejected because it was visually confusing for technicians, especially those with red-green color blindness, and increased GPIO line requirements on the MCU.

## Cost of Being Wrong

If this mechanical and logical design fails:
- **Enclosure Revision**: Moving away from the physical slide switch would require modifying the plastic injection mold to cover the switch cutout, costing $5,000–$10,000 in tooling.
- **BLE Sync Complexity**: If we rely solely on software state transitions, we would need to implement complex bidirectional handshakes and conflict-resolution rules in the BLE protocol, leading to increased firmware bugs and sync latency.
