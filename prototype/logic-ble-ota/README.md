# HVAC Helper Pro - BLE OTA Update Coordinator Prototype

This is a throwaway terminal prototype for the mobile-to-ESP32 firmware update flow.

## Question

How do we coordinate chunk packetization, sliding-window retries, CRC checks, and firmware transmission flow control without locking up the mobile app UI or overflowing the ESP32 buffer?

## What It Simulates

- A firmware image split into BLE MTU-sized chunks.
- A mobile-side sliding send window.
- ESP32-side buffer pressure and flow-control pauses.
- ACK timeouts, one-time CRC mismatches, and disconnect/reconnect recovery.
- Safe boot behavior: the active firmware partition is unchanged until the full image passes validation.

## Run

```bash
npm run prototype:logic-ble-ota
```

## Controls

- `space`: advance one transfer step.
- `a`: advance 20 transfer steps.
- `d`: toggle first-send packet drops.
- `c`: toggle a one-time CRC mismatch.
- `x`: inject a BLE disconnect after three more sends.
- `r`: reconnect BLE and resume from the ACK bitmap.
- `w`: cycle sliding-window size.
- `n`: reset the simulation.
- `q`: quit.

## Notes To Keep Or Delete Later

- A real implementation should persist the ACK bitmap and current update manifest in mobile storage before sending the first chunk.
- The ESP32 should expose buffer high-water and low-water signals explicitly rather than relying on mobile timing guesses.
- Full-image CRC and signature verification are separate gates: CRC catches transfer corruption; signature verification decides whether the image is trusted.
