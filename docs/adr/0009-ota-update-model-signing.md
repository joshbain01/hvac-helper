# 9. OTA Update Model + Signing

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Roles**: `@agency-engineering-security-engineer` (Security Engineer) + `@agency-engineering-embedded-firmware-engineer` (Embedded Firmware Engineer)  

## Context

To fix bugs, recalibrate sensors, update refrigerant lists, and patch security vulnerabilities in the field, we must be able to upgrade the handheld device's firmware. Updates must be executed over BLE via the mobile app. The update process must be secure to prevent unauthorized firmware execution and resilient to prevent bricking devices.

## Decision

We will use a **Signed OTA Update Model** with a dual-partition layout (`ota_0` and `ota_1` partition scheme):
- Firmware binaries must be cryptographically signed with a private key stored in a secure offline environment (e.g., a hardware security module or isolated vault).
- The ESP32 Secure Bootloader will verify the signature of new binaries using the public key compiled into the bootloader.
- The firmware utilizes the ESP32 partition rollback system with two safety mechanisms:
  - **App-Connection Confirmation Loop (Software Safety)**: The bootloader keeps the rollback option open and does *not* call `esp_ota_mark_app_valid_cancel_rollback()` upon initial boot. The new firmware must successfully establish a BLE handshake with the mobile application. If a valid handshake is not completed within 120 seconds of boot, the device automatically reverts to the previous working partition.
  - **Physical Button Override (Hardware Safety)**: If the device gets stuck in a boot loop or state deadlock, holding down the **Return Air (RA)** and **Supply Air (SA)** buttons simultaneously for 5 seconds during power-up overrides boot flags and forces the bootloader to execute an immediate rollback.

## Hard Questions (5-Year Operator Perspective)

### Security Engineer Perspective

> [!WARNING]
> **1. Signing Key Compromise and Recovery:** If our private signing key is compromised, an attacker can publish and sign malicious firmware. Conversely, if the key is lost, we can never update the devices again. How will we manage the lifecycle of this offline key, and can we support key rotation on already deployed devices if a compromise occurs?
> 
> **2. Firmware Rollback/Downgrade Attacks:** If we patch a security vulnerability in version 2.0, can an attacker flash a validly signed version 1.0 binary to exploit the old vulnerability? How do we implement anti-rollback security version numbers in the bootloader configuration?

### Embedded Firmware Perspective

> [!WARNING]
> **3. BLE Connection Drop Recovery:** Uploading a large firmware binary over BLE is highly prone to network drops (technician walking away, phone battery dying). If a connection is interrupted at 85% completion, how does the firmware handle clean-up, and how do we guarantee the active boot partition is not corrupted?
> 
> **4. Watchdog Boot Loop Mitigation:** If a new firmware boots successfully but crashes after 15 seconds due to a memory leak when a BLE connection is established, the standard bootloader may not detect it as a failed boot. How will we design our firmware's confirmation sequence (`esp_ota_mark_app_valid_cancel_rollback()`) to ensure we rollback even during delayed crashes?
> 
> **5. Flash Partition Constraints:** A dual-partition model requires dividing the ESP32's flash memory in half. If we use a standard 4MB flash chip, we are limited to ≈1.5MB per application binary. As we add features, sensor drivers, and refrigerant calculations over 5 years, will we exceed this partition limit and brick our ability to deploy future updates?

## Alternatives Considered

- **Unsigned OTA with Simple CRC Checksum**: Low complexity and saves flash space. However, it is highly insecure because anyone within BLE range could spoof the OTA service and upload malicious code to execute arbitrary actions on the device.
- **Physical Wired-Only Upgrades (USB)**: Requires technicians to connect the device to a PC via USB or mail it back for servicing. While extremely secure and saving flash space, it guarantees that 90% of field devices will run outdated, vulnerable, or uncalibrated firmware indefinitely.

## Cost of Being Wrong

If our OTA update model fails:
- **Bricked Devices**: A bug in the bootloader or partition rollback logic could brick devices in the field, forcing technicians to mail their units back to the factory for JTAG reflashing, costing thousands of dollars in logistics and labor.
- **Security Takeover**: If signature verification is bypassed or key validation is broken, malicious firmware could hijack our hardware, turning our devices into a vector for mobile app or cloud hacking.
- **Development Deadlock**: If we hit the 1.5MB flash partition limit, we will be forced to deprecate older hardware or stop adding new features to the device.
