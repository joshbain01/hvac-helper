# HVAC Helper Pro - Compact Binary BLE Serialization Prototype

This is a throwaway terminal comparison for JSON versus fixed-point binary BLE payloads.

## Questions This Prototype Is Testing

1. Can the core HVAC readings and state flags fit comfortably inside one compact BLE payload?
2. How much byte overhead does JSON add compared with fixed-point binary encoding?
3. Are tenths-of-a-degree fixed-point values precise enough for the displayed measurements?
4. Where should sensor state flags live in the packet so firmware and mobile code can decode them consistently?
5. Is the payload small enough to leave room for packet headers, versioning, and CRC fields?

---

## How to Run

```bash
npm run prototype:logic-ble-binary
```

---

## Simulator Keyboard Shortcuts

*   `[r]` **Randomize Readings**: Perturbs the mock measurement values and recomputes payload sizes.
*   `[f]` **Toggle Flags**: Flips sample state flags and updates the binary payload.
*   `[q]` **Quit**: Exits the simulator.

---

## What To Watch

*   The JSON byte count versus the 20-byte binary buffer.
*   Whether the hex output stays stable enough to document as a protocol shape.
*   Whether the savings justify the additional decoder complexity.
*   Whether additional fields would still fit within the target BLE packet budget.
