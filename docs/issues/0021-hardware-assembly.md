# BOM Sourcing & Physical Hardware Assembly

## Type
HITL

## Assigned Agents
- `/agency-embedded-firmware-engineer` (solder inspection, battery connection validation)

## Reference Docs
- [PRD.md - Section 6.1 (Form Factor & Assembly)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L116-L125)

## Prototype Lessons & Context

Assemble the full physical controls setup: 4 buttons, 2 rotary encoders, 1 slide switch, 6 LEDs, and OLED screen to match the physical interface simulated in [index.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/index.js).

This task is validated by the planned [Hardware Power-On Self-Test (POST) Routine](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#5-planned-hardware-power-on-self-test-post-routine-logic-prototype) (`prototype/logic-self-test`) prototype.

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

## Testing Guidance

### Unit Testing
- **Reflow Profiling**: Verify reflow oven thermal curves are within specifications.
- **Soldering Check**: Test solder mask clearances and solder pad properties.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Monitor joint shear resistance under stress testing.
  - Record basic current loop resistance levels.
- **Behavioral & Data Baseline**:
  - Freeze visual camera inspection targets.

### Integration & Manual Verification
- **Visual Inspection**: Perform visual camera inspections to verify joint alignment and component orientation.
- **Power Checks**: Verify that main power lines do not show short circuits before powering the device.

## Definition of Done (DoD)
- [ ] **Assembly Inspection**: Visual checking passes without errors or component shifts.
- [ ] **Self-Test Pass**: Assembled boards boot and pass basic self-test scripts.
- [ ] **Enclosure Fit**: Assembled PCBA is verified to fit inside the enclosure shell without stress.
