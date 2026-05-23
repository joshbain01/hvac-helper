# 8. Cloud Auth (JWT + Device Provisioning)

**Status**: Proposed  
**Date**: 2026-05-22  
**Deciders**: Antigravity (AI Assistant), User  
**Agent Role**: `@agency-engineering-security-engineer` (Security Engineer)  

## Context

We must secure communications from the mobile app to the cloud backend API, and ensure that only authentic, certified handheld hardware units can pair with the app and upload snapshots. Because technicians operate offline for hours or days, authentication must support offline workflows without leaving credentials vulnerable to extraction or interception.

## Decision

We will secure the cloud API using short-lived JSON Web Tokens (JWTs) and a secure token refresh cycle. For hardware validation and retail onboarding, we will implement an **In-Field Cryptographic Activation Flow**:
1. **Factory Injection**: During initial flashing, devices are loaded with a shared manufacturer signature certificate proving the hardware is authentic, plus a unique UUID. No individual company secrets are loaded at the factory.
2. **First-Time Pairing Activation**: When a technician buys a device (e.g., from Amazon.com) and pairs it via BLE, the mobile app validates the manufacturer's signature. The app (authenticated via the technician's JWT) then requests a unique device secret from our cloud backend.
3. **BLE Injection & Flash Locking**: The mobile app transmits the unique secret to the ESP32 over a secure BLE link, which is permanently written to the ESP32's flash-encrypted Non-Volatile Storage (NVS). Once written, the ESP32 burns its lock efuses to prevent reading or modifying this secret, establishing a secure hardware identity tied to the buyer's account.

## Hard Questions (5-Year Operator Perspective)

> [!WARNING]
> **1. Offline Token Expiration and Refresh Cycles:** Short-lived JWTs expire. If a technician works offline in a remote facility for 48 hours, they cannot request a new token. The app will permit local offline snapshot storage and signature checks using the cached public key, deferring final backend authorization checks until the Outbox syncs.
> 
> **2. Retail Resale and Ownership Transfer:** Because devices are distributed via Amazon.com, they will be resold or transferred between companies. If a device needs to be re-assigned, how do we wipe the active hardware identity? We must support a secure "factory reset" BLE command that requires a high-privilege JWT signature from the original owner, which clears the NVS secret and puts the device back into an unactivated state.
> 
> **3. In-Field Provisioning Interception (MITM):** Since the unique secret is injected in the field over BLE rather than a secure factory line, a bad actor could intercept the BLE transmission during pairing. We will enforce an ECDH (Elliptic Curve Diffie-Hellman) key exchange during the activation BLE handshake to encrypt the unique secret in transit, preventing eavesdropping.
> 
> **4. eFuse Burning and Flash Recovery:** ESP32 hardware eFuses are write-once. If a firmware bug triggers an incomplete activation sequence or burns the eFuses incorrectly, the device becomes a brick. We must design a robust, multi-phase NVS write-and-verify bootloader that only burns the permanent lock efuses once the cryptographic handshakes are validated.

## Alternatives Considered

- **Static Shared API Keys**: Hardcoding a single API key or shared secret across all devices and apps. While simple, if one key is extracted from a device's flash memory, our entire backend is exposed, and we have no way to isolate or revoke the leaked credential.
- **Mutual TLS (mTLS) with Client Certificates**: Generating individual client certificates for each mobile app and device. This is highly secure but introduces massive administrative overhead (managing a Public Key Infrastructure, certificate authorities, expirations, and revocations) that exceeds the capabilities of a small team.

## Cost of Being Wrong

If our authentication or provisioning model is compromised:
- **Database Pollution**: Attackers could build software emulators of our hardware and inject fake snapshot data into our CRM systems, corrupting service histories.
- **PII Leakage**: Weak client authentication could allow rogue API requests to retrieve sensitive customer records and addresses, violating privacy regulations (e.g., CCPA).
- **Physical Recall**: If a cloning or cryptographic exploit cannot be resolved over-the-air, we will be forced to recall and replace thousands of physical handheld units at significant expense.
