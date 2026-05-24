# Mobile Camera & On-Device OCR Flow

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Camera interface, layout design)
- `/agency-ai-engineer` (OCR text parsing and telemetry logging)
- `/agency-security-engineer` (Camera permissions audit)

## Reference Docs
- [PRD.md - Section 6.3 & 7 (OCR & Guided Wizard)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L142-L149)
- [CONTEXT.md - Domain terms: Photo Capture, OCR Status, Manual Override](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L77)
- [ADR 0012: Revision Inheritance and OCR Telemetry](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0012-revision-inheritance-and-ocr-telemetry.md)
- [ADR 0013: Cloudless WAN Sync via Local Office Server & Secure Tunnels](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0013-local-lan-sync-for-office.md)

## Prototype Lessons & Context
Leverage the `mockPhotoCapture` and `manualOverrideEquipment` flows in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L766-L801). Manual edits must update `ocr_status` to `MANUAL_OVERRIDE` and log a telemetry event.

This task corresponds to the existing [Mobile Camera Scanner & OCR Flow](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/ui-ocr-scanner) prototype.

> [!NOTE]
> A dedicated UI prototype (`prototype/ui-ocr-scanner`) is currently being built to model and validate this flow. A link to the prototype will be added here once it is ready.


## What to build
Implement the mobile application camera interface and text extraction routine. When a technician photographs a unit's service tag, run on-device OCR (Apple Vision on iOS, Android ML Kit on Android) to parse model and serial numbers. If the technician edits the result, the status must update to `MANUAL_OVERRIDE` and trigger product improvement telemetry.

Additionally, implement the step-by-step Guided Wizard (Variant C) containing an auto-capture viewfinder (2.5s scan trigger), manual bypass, crop previews of model/serial numbers, color-coded OEM badges, dynamic spec parsing, and multiple service tag photo attachments stamped with metadata. Apply client-side photo downscaling and compression before saving to the Outbox.

## Acceptance criteria
- [ ] Mobile app requests camera permissions and presents a photo capture viewport.
- [ ] Auto-capture viewfinder triggers camera scan automatically after 2.5s using local OCR libraries, with a manual capture bypass button active.
- [ ] Crop previews of model/serial numbers are displayed side-by-side with recognized values.
- [ ] UI displays color-coded OEM badges based on parsed tags (Goodman: Red, Carrier: Blue, Trane: Orange).
- [ ] Dynamic specifications (MCA, SEER, Tonnage, Voltage) are parsed using local regex rules.
- [ ] Multiple service tag photo attachments are supported, writing millisecond-precision timestamps and the active technician ID onto the cards.
- [ ] Automatically downscale and compress service tag photos to web-optimized JPEG format (max 1080p, 70% quality, ~150KB-200KB per image) and strip EXIF location metadata.
- [ ] If the OCR is edited manually, the snapshot record updates `ocrStatus` to `MANUAL_OVERRIDE`.
- [ ] A telemetry event logging the manual override is generated and saved locally for upload.

## Blocked by
[0006-multi-variable-ble-telemetry.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0006-multi-variable-ble-telemetry.md)

## User stories covered
User Story 8 (Automate Equipment Tag Entry)

## Testing Guidance

### Unit Testing
- **OCR Parser Logic (AI/ML)**: 
  - Test parser against normal strings.
  - Test parser resilience against "noisy" OCR input (e.g., stray characters, character substitutions like `0`/`O` or `1`/`I`, mismatched casing).
- **State Machine & Telemetry (AI/Mobile)**:
  - Verify that a manual correction triggers a transition to `MANUAL_OVERRIDE`.
  - Validate that the generated telemetry payload contains the exact key-value delta (`originalOcrText` vs `correctedText`).
- **Image Processing & Privacy (Security)**:
  - Assert that EXIF metadata (GPS coords, device metadata) is entirely stripped from the output image buffer.
  - Assert output images are downscaled to $\le$ 1080p and compressed using $\le$ 70% quality parameters.
- **Resource Lifecycle (Mobile)**:
  - Verify the 2.5s capture timer is fully cleared and cancelled if the component unmounts before firing.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record the CPU and memory consumption baseline during live camera feed, photo capture, and on-device OCR execution.
  - Establish a time-to-first-parse latency benchmark (e.g., on-device OCR execution must complete in $\le$ 1.5 seconds under standard lighting).
- **Behavioral & Data Baseline**:
  - Save output reference buffers of compressed images to act as a quality and size baseline (~150KB-200KB per image) to automatically detect regression in compression ratios.
  - Capture and freeze a snapshot of a successful telemetry payload structure and SQLite record schema to detect unintended data changes in future builds.

### Integration & Manual Verification
- **Camera Permissions (Security)**: Verify the app requests camera access *only* when invoking the wizard, and displays a graceful fallback screen if denied.
- **Auto-Capture Viewfinder (Mobile/QA)**: 
  - Verify the countdown timer displays visual progress (e.g., progress ring).
  - Verify that tapping the manual trigger immediately interrupts and bypasses the 2.5s timer.
- **Responsive Layout & Badges (QA/Integration)**:
  - Test that crop previews display side-by-side without overflow on small screens (e.g., 375px viewport).
  - Manually check that Goodman, Carrier, and Trane OEM badges display their respective branding colors (Red, Blue, Orange).

## Definition of Done (DoD)
- [ ] **Unit Tests**: All unit test suites pass for OCR parsing, telemetry generation, and metadata stripping.
- [ ] **Performance & Resource Baseline**: Verified that active CPU/memory utilization and OCR parsing latency do not exceed the established performance baseline boundaries.
- [ ] **Data Schema Stability**: Telemetry payload structure and SQLite schema match the frozen baseline references exactly.
- [ ] **Thread Performance**: Image compression and text parsing are verified to execute off the UI thread (no UI stuttering during auto-capture).
- [ ] **Privacy Gate**: Sample compressed images run through an EXIF parser verify 100% metadata scrubbing.
- [ ] **Layout QA**: Visual verification screenshots showing the progress viewfinder, side-by-side crops, and OEM badges are generated and saved to `public/qa-screenshots`.
- [ ] **Hardware Release**: Code review confirms the camera session is explicitly closed and released on component unmount to prevent resource locks.
