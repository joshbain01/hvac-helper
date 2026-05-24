# 10. Single Top Display

**Status**: Accepted  
**Date**: 2026-05-24  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-design-ux-researcher` (UX Researcher) + `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

Originally, the device design (specified in [ADR-0004](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0004-per-button-mini-oleds-vs-single-display.md)) called for six individual, per-button 128x32 mini-OLED displays next to the measurement buttons and controls, driven by an I2C multiplexer (TCA9548A), plus a top-line display for calculations. 
During design verification and developer discussions, several issues with this layout emerged:
- **I2C Bus Congestion**: Sequential writes to seven screens over a single I2C bus created high bus traffic and latency risks.
- **Physical Fragility**: Seven independent glass displays increase the point of failure for drop testing (MIL-STD-810G) and thermal shock.
- **Complexity and Cost**: TCA9548A multiplexer and complex routing increased the Bill of Materials (BOM) cost and assembly failure rates.
- **Sunlight Washout**: Tiny 0.91" OLED displays suffer from washout in direct sunlight and are prone to screen burn-in.

We need a display architecture that is highly readable, durable, cost-effective, and maintains single-handed technician convenience.

## Decision

We will replace the multi-display multiplexed array with a **single, top-mounted 128x64 high-contrast display**. This single screen will present all raw measurements, saturation dials, calculations (Delta T, Superheat, Subcooling), and active target ranges. The physical buttons and encoders will still be mapped to specific data points, but the feedback will be consolidated onto this single top display.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Spatial Disconnection and UX Fatigue:** In the original design, the readings were placed directly next to the button that captured them. With a consolidated display, the technician must look at the top of the device while pressing buttons on the body. Will this spatial separation lead to technician error or require a steeper learning curve?
> *Recommended Answer*: No. By utilizing 6-character short labels (RA, SA, OA, DA, SL, LL) and grouping them clearly on a single grid on the top display, the technician can easily read all parameters in a single glance. Additionally, progress LEDs next to each button serve as a quick physical checklist.
> 
> **2. I2C Bus Stability and Drop Immunity:** Dropping a device onto concrete can shock a display. If our single display breaks, the entire device becomes visually unusable, whereas a single mini-OLED breaking in the old design might only affect one slot.
> *Recommended Answer*: A single 128x64 display is significantly easier to physically shock-mount with a rubber gasket inside the rugged IP-54 enclosure than seven fragile glass screens. The overall robustness of the device increases because there are fewer ribbon cables, fewer connectors, and a smaller glass surface area overall.
> 
> **3. Graphic Layout and Sunlight Washout:** How do we make sure a single 128x64 display is readable in glaring Texas sunlight (10,000+ nits) and does not suffer from screen burn-in?
> *Recommended Answer*: We will use a high-contrast graphic LCD/OLED panel with a transflective screen or an ultra-bright OLED with a dedicated high-contrast sunlight mode. The UI layout uses simple, large characters and avoids static burn-in by shutting off the display after 5 seconds of inactivity.

## Alternatives Considered

- **Keep Per-Button Mini-OLEDs**: Rejected due to complex assembly, bus congestion, high BOM costs ($15+ for screens and multiplexer), and high field failure rates.
- **Screenless Sensor Hub**: The device would have no display at all, acting as a passive Bluetooth transceiver sending data to the mobile app. Rejected because technicians would be forced to pull out their mobile devices to see calculations and targets, violating the offline standalone requirements.

## Cost of Being Wrong

If we must revert to the multi-display approach:
- **PCB Redesign**: Requires a complete rewrite of the PCB layout, adding I2C multiplexing circuitry and routing seven display cables. Cost: $10,000 in prototyping, plus certification delay.
- **Firmware Overhead**: Re-integrating TCA9548A multiplexer drivers and updating sequential rendering logic, introducing potential latency into BLE communication threads.
- **BOM Increase**: Sourcing six additional displays raises manufacturing cost by $12–$15 per unit.
