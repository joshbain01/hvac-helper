# PCB Layout & Enclosure CAD Design

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (DRC review, footprint validation)
- `/agency-ux-architect` (mechanical button and encoder layout ergonomics)

## Reference Docs
- [PRD.md - Section 8 (Durability, Labels, and Grip)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L119)
- [ADR 0004: Per-Button Mini-OLEDs vs Single Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0004-per-button-mini-oleds-vs-single-display.md)

## Prototype Lessons & Context
Layout must accommodate the single top 128x64 display and six progress LEDs placed next to their respective buttons/encoders as defined in the [logic state specifications](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0011-progress-checklist-leds-and-switch.md).

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
