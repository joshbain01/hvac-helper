# BOM Sourcing & Physical Hardware Assembly

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (solder inspection, battery connection validation)

## Reference Docs
- [PRD.md - Section 8 (Ergonomic Form & Enclosure)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L119)

## Prototype Lessons & Context
Assemble the full physical controls setup: 4 buttons, 2 rotary encoders, 1 slide switch, 6 LEDs, and OLED screen to match the physical interface simulated in [index.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/index.js).

## What to build
Source all components specified in the Bill of Materials (BOM). Populate the PCB, mount the inputs/outputs, wire the rechargeable lithium-ion battery, and assemble all components into the physical IP-54 enclosure.

## Acceptance criteria
- [ ] All BOM materials (microcontrollers, sensors, switches, OLED display, passives) are sourced.
- [ ] PCB assembly (PCBA) soldering is completed and passes visual inspection under a microscope.
- [ ] OLED and battery are connected, and power lines are tested for short circuits before applying power.
- [ ] Internal components are secured inside the enclosure, and rubberized seals are fitted to meet IP-54 dust/moisture guidelines.

## Blocked by
[0020-pcb-layout-enclosure.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0020-pcb-layout-enclosure.md)

## User stories covered
N/A (Physical hardware construction)
