# 3. No Built-in Pressure Sensor

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer) + `@agency-design-ux-researcher` (UX Researcher)  

## Context

To calculate superheat (on the Suction Line) and subcooling (on the Liquid Line), the system needs both the actual pipe temperature and the refrigerant's saturation temperature at the current system pressure. Instead of integrating physical pressure sensors (which measure pressure and require refrigerant line connections), we must decide how to obtain these saturation temperatures.

## Decision

The device will **not** include physical built-in pressure sensors or transducers. Technicians will read pressure values from their existing analog or digital manifolds, note the corresponding saturation temperature for the system's refrigerant, and dial that saturation temperature directly into the device using physical rotary encoders, pressing the encoder dial to confirm and log the reading.

## Hard Questions (5-Year Operator Perspective)

### Embedded Firmware Perspective

> [!WARNING]
> **1. Rotary Encoder Longevity and Jitter:** Rotary encoders are mechanical devices with moving parts. In a field environment full of HVAC oil, dust, metal shavings, and extreme temperatures, how long will these encoders last before suffering from contact bounce, rotary jitter, or mechanical failure?
> 
> **2. Calibration & Diagnostic Blind Spots:** By omitting raw pressure data, we lose the ability to diagnose anomalous system behavior (such as rapid pressure spikes or manifold blockages). If a customer reports a calculation error, how can we debug the issue when we only have the technician's manual dial entry rather than raw pressure telemetry?

### UX Research Perspective

> [!WARNING]
> **3. Cognitive Load and Glove Operation:** HVAC technicians work in extreme conditions (120°F attics, sub-zero winters) wearing thick safety gloves. Forcing them to look at a gauge, translate pressure to temperature, dial in numbers on a small display, and press confirmation buttons significantly increases cognitive load and introduces manual entry errors. Will technicians bypass this flow or enter arbitrary values to save time?
> 
> **4. Refrigerant Lifecycle & Gauge Drift:** As government regulations phase out older refrigerants and introduce new blends, the printed scales on technicians' older analog gauges will become obsolete. If the technician's gauge lacks the scale for a new refrigerant, they cannot dial in the correct saturation temperature. How do we prevent this hardware dependency from rendering our tool useless over five years?

## Alternatives Considered

- **Integrated Digital Pressure Sensors**: Adding pressure transducers and manifold ports directly to the device. This provides fully automated calculations but adds significant BOM cost ($50+), safety certification challenges (handling high-pressure refrigerants), manifold plumbing weight, and leak risks.
- **Third-Party Bluetooth Gauge Integration**: Connecting to existing BLE-enabled smart manifolds (e.g., Fieldpiece, Yellow Jacket) to pull pressure data. This is seamless but binds our product's core calculations to proprietary, unstable competitor protocols and API changes.

## Cost of Being Wrong

If manual saturation temperature entry is rejected in the future:
- **Major Hardware Re-engineering**: Transitioning to pressure sensors requires a new chassis, manifold block, gas path certifications, and a complete electronics redesign.
- **Loss of Core Utility**: If the UI friction is too high, technicians will stop using the device for superheat/subcooling calculations, reducing it to a standard pipe-temperature thermometer and undermining the business case.
- **Data Integrity Collapse**: If technicians dial in incorrect saturation temperatures due to gauge misreading or haste, our database will fill with corrupt service records, rendering the synchronized report generation worthless.
