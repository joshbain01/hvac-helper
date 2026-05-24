# PCB Layout & Enclosure CAD Design

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (DRC review, footprint validation)
- `/agency-ux-architect` (mechanical button and encoder layout ergonomics)

## Reference Docs
- [PRD.md - Section 6.1 (Durability & Enclosure)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L125)
- [ADR 0010: Single Top Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0010-single-top-display.md)

## Prototype Lessons & Context
Layout must accommodate the single top 128x64 display and six progress LEDs placed next to their respective buttons/encoders as defined in the [logic state specifications](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md).

This task is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

## What to build
Design the printed circuit board (PCB) routing files and draft the 3D computer-aided design (CAD) files for the rubberized IP-54 handheld enclosure. Place keys, dials, and screen ergonomically for one-handed operation while wearing HVAC work gloves.

## Acceptance criteria
- [ ] PCB layout passes standard Design Rule Check (DRC) and Electrical Rules Check (ERC).
- [ ] Component footprints are validated against the hardware datasheets (ESP32-WROOM, SHT31, rotary encoders).
- [ ] Enclosure CAD modeling includes mounting stands for the PCB, battery compartment, and screen protector window.
- [ ] CAD layout places the 4 buttons (RA, SA, OA, DA) and 2 dials (SL, LL) in ergonomic vertical alignments with spacing for gloves.
- [ ] PCB outline fits perfectly into the enclosure CAD shell, with USB-C and clamp probe connector openings properly aligned.

## Blocked by
[0019-hardware-schematics.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0019-hardware-schematics.md)

## User stories covered
N/A (Hardware assembly foundation)

## Testing Guidance

### Unit Testing
- **DRC Rules Check**: Run Design Rule Checks (DRC) for track clearances, sizing, and drill parameters.
- **Enclosure Geometry Check**: Check component height clearance boundaries in the enclosure shell.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Model thermal hotspots on the board under full RF load.
  - Simulate mechanical shock resistance thresholds (MIL-STD-810G).
- **Behavioral & Data Baseline**:
  - Freeze mechanical drawings and step layout files.

### Integration & Manual Verification
- **3D Modeling**: Verify component placement tolerances using 3D layouts.
- **Connector Access**: Ensure charging ports and display screens align with enclosure openings.

## Definition of Done (DoD)
- [ ] **DRC Conformance**: DRC checks pass with zero violations.
- [ ] **Mechanical Review**: 3D assembly checks confirm clearance tolerances are met.
- [ ] **Gerber Assets**: Output Gerber and drill files conform to manufacturing specs.
