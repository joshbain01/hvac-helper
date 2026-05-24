# Mobile Camera & On-Device OCR Flow

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (Camera interface, layout design)
- `/agency-ai-engineer` (OCR text parsing and telemetry logging)
- `/agency-security-engineer` (Camera permissions audit)

## Reference Docs
- [PRD.md - Section 4 & 6 (OCR & override requirements)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L53)
- [CONTEXT.md - Domain terms: Photo Capture, OCR Status, Manual Override](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/CONTEXT.md#L77)
- [ADR 0012: Revision Inheritance and OCR Telemetry](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0012-revision-inheritance-and-ocr-telemetry.md)

## Prototype Lessons & Context
Leverage the `mockPhotoCapture` and `manualOverrideEquipment` flows in [state-machine.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/state-machine.js#L766-L801). Manual edits must update `ocr_status` to `MANUAL_OVERRIDE` and log a telemetry event.

## What to build
Implement the mobile application camera interface and text extraction routine. When a technician photographs a unit's service tag, run on-device OCR (Apple Vision on iOS, Android ML Kit on Android) to parse model and serial numbers. If the technician edits the result, the status must update to `MANUAL_OVERRIDE` and trigger product improvement telemetry.

## Acceptance criteria
- [ ] Mobile app requests camera permissions and presents a photo capture viewport.
- [ ] On-device OCR extracts alphanumeric characters and parses model and serial numbers.
- [ ] If the OCR is edited manually, the snapshot record updates `ocrStatus` to `MANUAL_OVERRIDE`.
- [ ] A telemetry event logging the manual override is generated and saved locally for upload.

## Blocked by
[0006-multi-variable-ble-telemetry.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0006-multi-variable-ble-telemetry.md)

## User stories covered
User Story 3 (Capture Photo of Service Tags & OCR Telemetry)
