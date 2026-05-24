# Signature Verification & Partition Rollback

## Type
HITL

## Assigned Agents
- `/agency-security-engineer` (Cryptographic verification, keys signing pipeline)
- `/agency-embedded-firmware-engineer` (Secure bootloader settings, partition rollbacks)

## Reference Docs
- [PRD.md - Section 6.2 & 8.3 (Secure Boot & Signature Rollback)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L126-L134)
- [ADR 0009: OTA Update Model and Signature Signing](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0009-ota-update-model-signing.md)

## Prototype Lessons & Context

This implements the firmware safety mechanism. Ensure secure bootloader commands are properly set up so that signature errors or application crashes automatically trigger partition rollbacks.

This task is validated by the planned [Partition Swap & Rollback Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#4-planned-partition-swap--rollback-simulator-logic-prototype) (`prototype/logic-rollback`) prototype.

## What to build
Implement firmware signature verification and safe boot checks on the ESP32. Prior to rebooting into a newly flashed partition, the bootloader must verify the cryptographic signature of the new binary against a public key stored in hardware. On boot, the new firmware executes a self-test check; if it fails or crashes, the bootloader automatically rolls back the boot partition.

## Acceptance criteria
- [ ] ESP32 verifies binary signatures using asymmetric cryptography (e.g. RSA or ECDSA keys stored in flash/NVS).
- [ ] Failing verification aborts the update, deletes the temp binary, and notifies the mobile app of verification failure.
- [ ] Successful verification triggers a boot partition swap and soft reboot.
- [ ] New firmware runs initialization diagnostics (self-test); if it fails or triggers a watchdog reset within the first 10 seconds of boot, the bootloader rolls back active boot configurations to the previous stable partition.

## Blocked by
[0017-settings-ota-flow-ble-transfer.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0017-settings-ota-flow-ble-transfer.md)

## User stories covered
N/A (OTA rollback requirements)

## Testing Guidance

### Unit Testing
- **Signature Parsing**: Test parsing of cryptographic signature envelopes.
- **Signature Verification**: Mock RSA/ECDSA public keys and check that valid signatures pass and invalid ones fail.
- **Boot Counter Tracker**: Test counter tracking and flag manipulation in NVS.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Measure bootloader signature verification latency overhead.
  - Track partition rollback execution time.
- **Behavioral & Data Baseline**:
  - Freeze public key formats and boot signature structures.

### Integration & Manual Verification
- **Rollback Routine**: Install an unsigned or corrupted firmware binary, boot the device, verify signature check fails, and confirm automatic bootloader rollback.
- **Signature Enforcement**: Attempt to boot with a modified header and confirm it is rejected.

## Definition of Done (DoD)
- [ ] **Security Enforcement**: The bootloader rejects and rollbacks unsigned binaries in 100% of test runs.
- [ ] **Unit Tests**: Verification algorithms and partition swap math pass testing.
- [ ] **NVS Counter Safety**: Confirm that partition boot counters are reset upon successful boot completion.
