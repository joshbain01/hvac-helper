# 1. ESP32 as MCU

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Role**: `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

We need a microcontroller for the handheld HVAC troubleshooting device that can:
- Interface with 4 tactile buttons, 2 rotary encoders, and a top-line LCD/OLED.
- Drive 6 independent mini-OLED displays via an I2C multiplexer (TCA9548A).
- Read from internal temperature/humidity sensors and two external pipe clamp probes.
- Support Bluetooth Low Energy (BLE) 5.0 for real-time transmission.
- Operate under a tight power budget (battery-powered, deep sleep support).
- Provide hardware security features (Secure Boot, Flash Encryption) and persistent non-volatile storage (NVS) for caching.

## Decision

We will use the **ESP32** (specifically the ESP32-WROOM-32E module) as the primary microcontroller, using the Espressif IoT Development Framework (**ESP-IDF**) and FreeRTOS for firmware development.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Tooling and SDK Obsolescence:** Espressif frequently releases major, breaking updates to ESP-IDF (e.g., migrating from v4.x to v5.x). If we need to issue a critical firmware patch in 2031, will our build environment still compile, or will we spend weeks refactoring legacy code because old ESP-IDF versions are deprecated?
> 
> **2. Flash Wear and NVS Degradation:** We are logging boot counts, failure records, and watchdog resets directly to NVS. If a technician uses the device daily for 5 years, will the flash wear out and brick the device? How are we wear-leveling this persistent state?
> 
> **3. Dual-Core Threading & FreeRTOS Jitter:** Enforcing strict BLE transfer latency (≤ 3s) while concurrently multiplexing I2C displays and reading sensors requires deterministic scheduling. How do we prevent core synchronization issues, mutex deadlocks, and priority inversion over years of firmware updates?
> 
> **4. Deep-Sleep Battery Degradation:** If a device is left in a cold service truck or tool bag for months, the ESP32's quiescent current in deep sleep must not fully drain the Li-Ion battery, which would destroy its capacity. Can the hardware battery protection circuit and ESP32 deep-sleep configuration guarantee 5-year battery health?

## Alternatives Considered

- **Nordic nRF52840**: Outstanding BLE power efficiency, but has a higher BOM cost, lacks dual-core processing for parallel screen multiplexing, and has a steeper development curve for custom peripheral routing.
- **STM32 (e.g., STM32WB55)**: Highly stable silicon lifecycle, but significantly more expensive, lacks dual-core performance, and the ecosystem is more fragmented compared to Espressif's unified BLE/Wi-Fi frameworks.
- **Raspberry Pi Pico W (RP2040)**: Cheap and easy to develop for, but lacks hardware-based Secure Boot and Flash Encryption at the silicon level, making it unsuitable for secure enterprise deployments.

## Cost of Being Wrong

If we must move away from the ESP32 in the future:
- **Hardware redesign**: A complete PCB layout redesign would be required to accommodate a new pinout and power architecture, costing $15k–$30k in prototyping and certification (FCC/CE).
- **Firmware rewrite**: The codebase is tightly coupled to ESP-IDF API wrappers (BLE stack, NVS, FreeRTOS tasks). Swapping MCUs would require a 70–80% firmware rewrite (estimated 4–6 months of engineering effort).
- **Supply chain exposure**: Transitioning to a less available chip could halt manufacturing if another global silicon shortage occurs.
