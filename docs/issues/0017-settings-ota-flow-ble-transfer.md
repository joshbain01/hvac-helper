# Settings OTA Flow & BLE Chunked Transfer

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (OTA settings view, chunked BLE streams)
- `/agency-embedded-firmware-engineer` (Partition flash writing, chunk validation)

## Reference Docs
- [PRD.md - Section 5 & 6 (OTA updates)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L81)
- [ADR 0009: OTA Update Model and Signature Signing](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0009-ota-update-model-signing.md)

## Prototype Lessons & Context
This covers the BLE packet protocol handling. Chunking logic must be designed to fragment the compiled ESP32 firmware image into packets conforming to BLE MTU sizes with CRC-16 checks.

## What to build
Build the firmware update interface and data transfer mechanism. Create a "Check for Firmware Update" option in the mobile app settings. When triggered, fetch the update file, fragment it into binary chunks matching the negotiated BLE MTU size, and write them sequentially to the ESP32 OTA characteristic. The ESP32 writes chunks to a secondary partition and verifies packet CRC-16.

## Acceptance criteria
- [ ] Mobile settings panel detects available firmware versions and displays updates.
- [ ] BLE transmission splits the firmware binary into chunk packets and handles flow control/throttling.
- [ ] ESP32 listens on the OTA control characteristic, writing incoming packets directly to the secondary OTA flash partition.
- [ ] Mobile UI renders a real-time progress bar reflecting transfer percentage, handling packets loss and retries.

## Blocked by
[0003-mobile-sqlite-draft-persistence.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0003-mobile-sqlite-draft-persistence.md)

## User stories covered
N/A (OTA requirements)
