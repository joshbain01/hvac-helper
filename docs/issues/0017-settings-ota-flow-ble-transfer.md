# Settings OTA Flow & BLE Chunked Transfer

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (OTA settings view, chunked BLE streams)
- `/agency-embedded-firmware-engineer` (Partition flash writing, chunk validation)

## Reference Docs
- [PRD.md - Section 6.2 & 6.3 (OTA Updates)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L126-L151)
- [ADR 0009: OTA Update Model and Signature Signing](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0009-ota-update-model-signing.md)

## Prototype Lessons & Context

This covers the BLE packet protocol handling. Chunking logic must be designed to fragment the compiled ESP32 firmware image into packets conforming to BLE MTU sizes with CRC-16 checks.

> [!NOTE]
> A dedicated Logic prototype (`prototype/logic-ble-ota`) is currently being built to model and validate this flow. A link to the prototype will be added here once it is ready.

This task is validated by the planned [BLE OTA Update Coordinator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#2-planned-ble-ota-update-coordinator-logic-prototype) (`prototype/logic-ble-ota`) prototype.

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

## Testing Guidance

### Unit Testing
- **Checksum Verification**: Validate binary chunk checksums (e.g., MD5/SHA256) and block boundary verification.
- **Retry Logic**: Verify block map buffers and re-transmit request handlers.
- **Partition Verification**: Test partition boot flag routines and validation rules.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure OTA upload speed (throughput) over BLE channels.
  - Record ESP32 processor utilization and buffer heap allocations during transfer.
- **Behavioral & Data Baseline**:
  - Freeze the BLE OTA packet transfer protocol frame to detect command regressions.

### Integration & Manual Verification
- **BLE OTA Transfer**: Initiate an OTA firmware update from the mobile application, monitor transfer progress, and check system reboot logic.
- **Interrupted Transfer**: Break the BLE connection mid-transfer, re-establish connection, and check that the transfer resumes cleanly.

## Definition of Done (DoD)
- [ ] **Checksum Matching**: Firmware updates are rejected if hashes do not match the expected values.
- [ ] **Unit Tests**: Partition state checks and BLE chunk handler code pass unit tests.
- [ ] **Partition Safeguard**: Verified that a failed OTA partition boot triggers rollback to the active partition.
