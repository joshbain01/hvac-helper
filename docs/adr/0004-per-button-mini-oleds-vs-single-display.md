# 4. Per-Button Mini-OLEDs vs Single Display

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-design-ux-researcher` (UX Researcher) + `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

To achieve a "dead-simple" user interface for field technicians, the device must display real-time sensor measurements (Return Air, Supply Air, Outdoor Ambient, Discharge Air, Suction Line, Liquid Line) and calculation results (ΔT, superheat, subcooling) directly on the physical hardware, allowing technicians to verify captures instantly without pulling out their phone.

## Decision

We will use six independent, per-button mini-OLED displays (128x32 resolution) routed via a TCA9548A I2C multiplexer, coupled with a larger top-line LCD/OLED display for real-time calculations.

## Hard Questions (5-Year Operator Perspective)

### UX Research Perspective

> [!WARNING]
> **1. Sunlight Washout and Readability:** HVAC technicians work outdoors in glaring sunlight (e.g., servicing rooftop condenser units). OLED displays are notoriously difficult to read in direct sunlight. Will technicians be forced to shade the device with their hand to read the values, defeating the hands-free, single-handed workflow?
> 
> **2. Screen Burn-in and Text Persistence:** These screens will display static characters (e.g., "RA", "SA", "FAIL", "OK") for hours. OLED technology suffers from severe burn-in over time. In 3 to 5 years, will screen burn-in make the small 0.91" screens completely illegible?
> 
> **3. Legibility of Complex Status Codes:** Displaying connection statuses like "TX..." or "ERR" on a 128x32 screen leaves very few pixels. Can older technicians with deteriorating eyesight read these tiny indicators under field conditions?

### Embedded Firmware Perspective

> [!WARNING]
> **4. I2C Bus Congestion and Multiplexer Failure Modes:** Driving 7 displays (6 mini-OLEDs + 1 top display) over a single I2C bus via the TCA9548A multiplexer generates high bus traffic. If one OLED display fails mechanically (e.g., cracked ribbon cable from a drop) or locks up, it can hang the entire I2C bus, bricking all displays. How will the firmware detect, isolate, and recover from bus lockups dynamically?
> 
> **5. Physical Durability & Assembly Defects:** Installing 7 separate screens, ribbon cables, and connectors increases physical points of failure from drops, vibration, and thermal cycling. Can our housing survive a 6-foot drop onto concrete (MIL-STD-810G) when it is packed with fragile glass displays?

## Alternatives Considered

- **Single Large Graphical LCD/OLED Screen**: Placing a single, ruggedized 2.4" or 2.8" display at the top of the device. This reduces BOM cost, eliminates I2C multiplexing, and simplifies ruggedization, but breaks the "instant spatial association" of reading values directly next to their physical buttons.
- **No-Screen (Phone-Only "Sensor Hub")**: The device has no screens, only status LEDs. Technicians must look at their mobile device/tablet to read values. This minimizes BOM cost, power consumption, and hardware failure rates, but prevents true single-handed operations.

## Cost of Being Wrong

If the multiplexed mini-OLED approach fails in production:
- **Major Supply Chain Liability**: Sourcing 6 matching, identical mini-displays for replacement parts over 5 years is highly risky due to fast-moving display lifecycles.
- **High Assembly and RMA Cost**: Replacing a cracked screen requires dismantling the entire front chassis, leading to high warranty repair costs.
- **Battery Drain**: Powering 7 active displays increases power consumption, reducing battery life and forcing a larger, heavier battery pack.
