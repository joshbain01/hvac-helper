# 2. BLE 5.0 as Transport

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Role**: `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

The handheld device must transmit real-time measurements to a paired mobile application. The transmission must be fast (≤ 3 seconds transfer latency per data point), low power to maximize battery life, and highly reliable.

## Decision

We will use **Bluetooth Low Energy (BLE) 5.0** as the primary wireless communication protocol between the handheld device and the mobile application.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. RF Attenuation and Metal Interference:** HVAC systems are located in dense metal enclosures, utility rooms, crawlspaces, or commercial basements. High-voltage compressor motors generate significant electromagnetic interference. How will we prevent packet drops and connection timeouts when a technician is standing behind a double-walled condenser coil?
> 
> **2. Operating System Bluetooth Stack Drift:** Apple (CoreBluetooth) and Google (Android BLE stack) frequently release updates that modify background permission models, pairing requirements, and connection intervals. How will we prevent new iOS/Android updates from bricking the app's ability to communicate with the physical hardware in the field?
> 
> **3. BLE MTU and OTA Update Sluggishness:** While BLE is great for 20-byte sensor packets, uploading a 1MB firmware image via OTA over BLE will take several minutes and is prone to mid-transfer failures. How will we handle fragmented packets, checksum verifications, and connection drop-offs during OTA without bricking the device?
> 
> **4. Multi-Client & Multi-Tech Pairing Friction:** If a technician uses a phone for field capture but a tablet for administrative work, or if multiple technicians share a physical device, how will the BLE pairing flow handle fast, zero-friction swapping without requiring manual passcode entries or factory resets?

## Alternatives Considered

- **Classic Bluetooth (SPP)**: Provides higher throughput, but has severe battery drain, and iOS requires expensive, slow Apple MFi certification.
- **Wi-Fi (Local Access Point)**: High data rates and range, but connects the phone to an offline network, which disconnects the technician's phone from cellular internet (preventing background CRM lookups) and drains both device and phone batteries in minutes.
- **Physical USB-C / Audio Jack Connection**: Extremely reliable and secure, but ports are prone to dust, water, and refrigerant oil ingress in the field, and a dangling cable limits single-handed mechanical operations.

## Cost of Being Wrong

If BLE 5.0 proves insufficient:
- **Redesign**: Switching to a wired connection or Wi-Fi will require redesigning the housing to add sealed ports/antennas and rebuilding the PCB RF layout.
- **Software Split**: We would need to discard the BLE manager stacks on both the firmware and the mobile application, requiring a rewrite of the communication layer.
- **Field Support Load**: High connection failure rates in the field will trigger severe customer support tickets, leading to product returns.
