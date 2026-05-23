# HVAC Helper Pro

HVAC Helper Pro is an integrated system consisting of a custom ESP32-based handheld troubleshooting device and a paired offline-first mobile application. Together, they capture, calculate, and synchronize HVAC system measurements in real time to automate the generation of professional service records for technicians in the field.

---

## 📖 Table of Contents
1. [System Overview](#-system-overview)
2. [Key Vocabulary & Lifecycle](#-key-vocabulary--lifecycle)
3. [System Architecture](#-system-architecture)
4. [Repository Directory Map](#-repository-directory-map)
5. [Design System & Build Pipeline](#-design-system--build-pipeline)
6. [Architectural Decision Records (ADRs)](#-architectural-decision-records-adrs)
7. [Getting Started & Development](#-getting-started--development)

---

## 🛠️ System Overview

HVAC technicians traditionally carry a fragmented set of tools (pressure gauges, temperature clamp probes, hygrometers, etc.) and manually transcribe values, which leads to high error rates and time waste. 

**HVAC Helper Pro** addresses this by providing:
*   **One-Handed Hardware Capture**: An ergonomic, rugged (IP-54) handheld device containing high-precision air sensors and connections for pipe temperature clamp probes.
*   **Rotary Encoders for Saturation dial-in**: Technicians dial refrigerant saturation temperatures directly from their physical manifold gauges without needing digital pressure sensors on the device.
*   **Bidirectional Feedback**: 6 mini-OLED screens and multi-sensory LED indicators (color, flashing frequency, and haptic buzzes on the phone) notify the user of successful Bluetooth transmission.
*   **Smart Mobile Companion**: An offline-first mobile app that processes before/after measurement sets, performs local on-device OCR for equipment nameplates, and uses local LLM models to generate work summaries and log consumables.

---

## 🗂️ Key Vocabulary & Lifecycle

Refer to [CONTEXT.md](file:///c:/Users/joshu/projects/hvac-helper-tool/CONTEXT.md) for the canonical domain vocabulary. The primary definitions include:

*   **Snapshot**: A complete set of measurements captured for a service call. It is comprised of exactly one **Before Set** and one **After Set**.
    *   *Draft*: An editable, local-only snapshot.
    *   *Finalized*: An immutable snapshot, queued for upload in the Outbox.
    *   *Synced*: Successfully uploaded to the cloud gateway.
*   **Before Set**: Measurements taken at the start of a service call. Must be captured within 20 minutes before the first button press.
*   **After Set**: Measurements taken after repair/maintenance. Must be captured within 20 minutes of the final button press.
*   **Data Point**: An individual raw sensor reading (e.g., Return Air Temperature) or manual entry value.
*   **Timeout**: The 20-minute expiration window for confirming a captured measurement set on the mobile app.
*   **Transfer Latency**: The 3-second maximum duration allowed for transmitting a data point from the ESP32 to the mobile app.
*   **Outbox**: The local persistent queue of finalized snapshots waiting for network availability.
*   **Revision**: A linked copy of a finalized snapshot created to apply post-upload corrections.

---

## 🏗️ System Architecture

### 1. Handheld Hardware (ESP32)
*   **MCU**: ESP32 module with BLE 5.0 and Wi-Fi capability.
*   **Sensory Array**: 
    *   Built-in high-precision air sensors for Return Air (RA), Supply Air (SA), Outdoor Ambient (OA), and Discharge Air (DA).
    *   Dual external ports for pipe clamp temperature probes.
*   **Interface**: 
    *   4 physical tactile buttons to trigger air sensor reads.
    *   2 digital rotary encoders with push-button confirmation for Suction Line (SL) and Liquid Line (LL) pipe clamp temperatures and saturation temperature dial-in.
    *   1 main top-line LCD (or 1.3" OLED) showing calculations (ΔT, Superheat, Subcooling).
    *   6 mini-OLED (128x32) screens multiplexed via a TCA9548A I2C multiplexer.
    *   6 multi-sensory RGB status LEDs (solid green for confirmed, slow pulse amber for transmitting, fast flash red for error).
*   **Power**: Rechargeable Li-Ion battery with deep-sleep state transition triggered on inactivity, waking instantly via GPIO interrupts (EXT1) from any interface button.

### 2. Mobile App (iOS / Android)
*   **UI Framework**: Native iOS (SwiftUI) and Android (Jetpack Compose).
*   **Core Logic**: Shared React Native logic layer for non-UI features (BLE management, DB storage, local calculations).
*   **Offline Storage**: SQLite (Android) / Core Data (iOS) persistent outbox cache.
*   **On-Device AI**: Local OCR (Apple Vision / Android ML Kit) and local LLMs (Apple native language models / Android AICore) run offline queries to extract model/serial numbers and expand technicians' notes.

### 3. Cloud Backend
*   **API**: Node.js/Express REST API serving endpoints documented via OpenAPI.
*   **Security**: Encrypted communication via HTTPS/TLS 1.3, authenticating with short-lived JWTs.
*   **Database / CRM**: Centralized relational database sync endpoint forwarding data to company CRM/ERP systems.

---

## 📁 Repository Directory Map

Here is the directory structure of the repository:

*   [.github/](file:///c:/Users/joshu/projects/hvac-helper-tool/.github): Contains GitHub configuration and developer guidelines.
*   [docs/](file:///c:/Users/joshu/projects/hvac-helper-tool/docs): Comprehensive product documentation.
    *   [adr/](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr): Architecture Decision Records (ADRs 0001 - 0009).
    *   [css/](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/css): Compiled styles including the CSS variables manifest.
    *   [PRD.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md): Product Requirements Document for Handheld & Core features.
    *   [prd-hvac-helper-pro-v2.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/prd-hvac-helper-pro-v2.md): Product Requirements Document (V2).
    *   [design-system.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/design-system.md): Mobile Application Design System guidelines and specifications.
    *   [personas.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/personas.md): Target user persona definitions.
    *   [api-v1-snapshots.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md): Cloud backend API v1 endpoints specification.
    *   [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md): Snapshot schema definitions and documentation.
    *   [go-to-market-v0.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md): Go-to-market strategies and validation plans.
    *   [unit-economics-v0.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/unit-economics-v0.md): Initial unit economics and cost modeling.
*   [tokens/](file:///c:/Users/joshu/projects/hvac-helper-tool/tokens): Source files for design tokens.
*   [scripts/](file:///c:/Users/joshu/projects/hvac-helper-tool/scripts): Automation scripts including token compiler.
*   [CLAUDE.md](file:///c:/Users/joshu/projects/hvac-helper-tool/CLAUDE.md): Session router configurations for AI pairs.

---

## 🎨 Design System & Build Pipeline

The application visual styles are managed using a canonical design tokens structure:

1.  **Source File**: Design tokens are declared in [tokens/design-tokens.json](file:///c:/Users/joshu/projects/hvac-helper-tool/tokens/design-tokens.json).
2.  **Build Script**: Running [scripts/generate-tokens.js](file:///c:/Users/joshu/projects/hvac-helper-tool/scripts/generate-tokens.js) compiles the tokens.
3.  **Output Assets**:
    *   Javascript JSON manifest: [docs/design-tokens.json](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/design-tokens.json)
    *   CSS Variables stylesheet: [docs/css/design-system.css](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/css/design-system.css)

### Compile Tokens
To compile modifications made to the source token file, run the following in your shell:
```bash
node scripts/generate-tokens.js
```

### ♿ Accessibility Features (WCAG 2.2 AA / AAA)
*   **Sunlight Mode Theme**: A pure black-on-white high-contrast theme (21:1 contrast ratio) to solve outdoor screen glare.
*   **Work Glove Accommodations**: Large touch targets (minimum 64px) separated by 16px gutters.
*   **Multi-sensory Feedback**: Bluetooth transmission status is displayed using color-paired icons, distinctive LED flashing profiles (solid green, 1 Hz pulse amber, 4 Hz flash red), and unique haptic feedback profiles on the phone to accommodate colorblind users.

---

## 📜 Architectural Decision Records (ADRs)

Key architectural decisions are recorded in individual files in the [docs/adr](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr) directory:

*   [ADR 0001: ESP32 as MCU](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0001-esp32-as-mcu.md)
*   [ADR 0002: BLE 5.0 as Transport](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0002-ble-5-0-as-transport.md)
*   [ADR 0003: No Built-In Pressure Sensor](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0003-no-built-in-pressure-sensor.md)
*   [ADR 0004: Per-Button Mini OLEDs vs. Single Display](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0004-per-button-mini-oleds-vs-single-display.md)
*   [ADR 0005: React Native Shared Logic & Native UI](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0005-rn-shared-logic-native-ui.md)
*   [ADR 0006: On-Device Local LLM Hosting with Cloud Fallback](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0006-llm-hosting-cloud-vs-on-device.md)
*   [ADR 0007: Snapshot Sync Semantics (Drafts & Outbox)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0007-snapshot-sync-semantics.md)
*   [ADR 0008: Cloud JWT Authentication & Device Provisioning](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0008-cloud-auth.md)
*   [ADR 0009: Signed Firmware Images for Secure OTA over BLE](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0009-ota-update-model-signing.md)

---

## 🚀 Getting Started & Development

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (Version 16 or later)

### 2. Regenerate Design System Tokens
After modifying token configurations under `tokens/design-tokens.json`, run the compilation script:
```bash
node scripts/generate-tokens.js
```
The output variables will update in `docs/css/design-system.css` and `docs/design-tokens.json` automatically.

### 3. Reviewing Specifications
*   Read the [PRD.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md) to understand overall system flows and requirements.
*   Examine the [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md) for the structured JSON format of transmitted and stored snapshots.
*   See [CLAUDE.md](file:///c:/Users/joshu/projects/hvac-helper-tool/CLAUDE.md) to understand routing triggers and pairing guidelines for AI agent pair programming.
