# Handoff: HVAC Helper Pro (v2)

This document summarizes the current status, design decisions, and unresolved blocker items for **HVAC Helper Pro** following a comprehensive 8-agent parallel review and alignment session.

---

## 1. PRD State (Stable vs. Moving)

The core requirements document [prd-hvac-helper-pro-v2.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/prd-hvac-helper-pro-v2.md) has been updated to reflect several major design integrations.

### Stable Sections (Locked)
*   **Section 1 & 2 (Problem & Goals)**: Clear baseline assumptions (to be validated in Beta) and time/accuracy targets.
*   **Section 3 (Non-Goals)**: Formally locks out touchscreens, built-in pressure sensors, direct cellular/Wi-Fi chips, and component-level diagnostic engines.
*   **Section 5 (The Snapshot)**: Lifecycle state transitions (`DRAFT` $\rightarrow$ `DIAGNOSTIC_COMPLETE` / `COMPLETED`) are locked. The JSON schema [snapshot-schema.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md) and OpenAPI spec [api-v1-snapshots.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/api-v1-snapshots.md) have been successfully updated to remove all raw `pressure` (PSIG) requirements.
*   **Section 6.1 (Device)**: Physical controls (4 buttons, 2 encoders), 7 OLED screens, and RGB status LEDs are finalized.
*   **Section 6.2 (Firmware - Safety)**: Dual-partition OTA rollback safety triggers (BLE connection handshake confirmation loop + physical RA/SA 5s boot override) are locked.
*   **Section 6.4 (Cloud Backend)**: Swapped synchronous writes for an **Asynchronous Queue & Worker Architecture** utilizing a `202 Accepted` Gateway API, protecting databases and third-party FSM integrations from thundering herd sync storms.

### Moving Sections (Under Validation)
*   **Section 8.3 (Security & Compliance)**: Legal EPA validation and Android SQLite cryptographic key binding details are moving.
*   **Section 10.1 (Unit Economics)**: margins, support costs, and NRE limits need real validation (currently underfunded/estimated).
*   **Section 10.2 (Go-To-Market)**: Paid Teams SaaS tier ($19/user/month) now gates the cloud LLM fallback, but co-op advertising structures and FSM integration access fees need confirmation.

---

## 2. ADR Status Table (Proposed vs. Accepted)

| ADR Number | Name & Link | Status | Gating Question to Transition to "Accepted" |
| :---: | :--- | :---: | :--- |
| **ADR-001** | [ESP32 as MCU](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0001-esp32-as-mcu.md) | Proposed | Can the compiled firmware binary (BLE stacks, 7 OLED drivers, multiplexer logic, sensor libraries) fit within the tight 1.5MB application partition limit enforced by the dual-partition OTA rollback scheme? |
| **ADR-002** | [BLE 5.0 Transport](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0002-ble-5-0-as-transport.md) | Proposed | What is the measured RF signal attenuation inside heavy sheet-metal mechanical cabinets, and does it necessitate a physical external antenna? |
| **ADR-003** | [No Built-In Pressure Sensor](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0003-no-built-in-pressure-sensor.md) | Proposed | Does the EPA formally accept manual dial-in saturation temperature logs (without direct raw pressure verification) for Section 608 leak-tracking compliance? |
| **ADR-004** | [Per-Button Mini OLEDs](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0004-per-button-mini-oleds-vs-single-display.md) | Proposed | Do sequential I2C writes to 7 screens via a multiplexer block BLE communication threads or exceed the 100ms display update latency target? |
| **ADR-005** | [React Native Shared Logic](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0005-rn-shared-logic-native-ui.md) | Proposed | Does sharing logic via React Native while splitting native iOS/Android UIs introduce high integration complexity that outweighs early-stage framework benefits? |
| **ADR-006** | [LLM Hosting & SaaS Gate](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0006-llm-hosting-cloud-vs-on-device.md) | **Accepted** | *Decision finalized*: Gated legacy device cloud fallbacks behind the paid Teams SaaS tier ($19.00/user/month) to offset recurring token operating expenses. |
| **ADR-007** | [Snapshot Sync Semantics](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0007-snapshot-sync-semantics.md) | **Accepted** | *Decision finalized*: Implemented local SQLite Outboxes with an asynchronous, queue-based backend worker sync proxy using `202 Accepted` HTTP ingestion. |
| **ADR-008** | [Cloud Auth & SSO](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0008-cloud-auth.md) | Proposed | How do we secure local offline database access during extended offline periods without blocking technicians with expired JWTs or violating SOC 2 revocation? |
| **ADR-009** | [OTA Bootloader Rollback](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/adr/0009-ota-update-model-signing.md) | **Accepted** | *Decision finalized*: Implemented a 120s BLE handshake validation window on boot and a physical button override (holding RA + SA for 5s) to force rollbacks. |

---

## 3. Open Questions (Sorted by Launch Phase)

### 🔴 Block Alpha (Internal Launch - June 2026)
1.  **Firmware Size Constraint**: Does the complete compiled ESP32 binary fit within the 1.5MB dual-partition application limit?
2.  **Display Multiplexing Latency**: Do I2C bus updates to 7 screens block BLE interrupts or exceed 100ms?
3.  **BLE Security and Pairing**: What pairing protocol (e.g., Passkey Entry) will we enforce to prevent MITM attacks in field mechanical rooms?

### 🟡 Block Beta (10-Tech Field Test - July-August 2026)
4.  **BLE RF Attenuation**: What is the measured BLE signal dropout rate inside shielded mechanical utility cabinets?
5.  **Glove Detent Torque**: Can technicians accurately turn and push the rotary encoders while wearing thick leather safety gloves?
6.  **Offline Authentication Tokens**: What is the security policy and session lifetime for local offline SQLite database encryption?

### 🟢 Block GA (Commercial Release - Q4 2026)
7.  **EPA 608 Regulatory Compliance**: Does the EPA require raw pressure inputs (PSIG), or does manual saturation temperature satisfy audits? Do we need to add fields for EPA number, recovery cylinder ID, and recovery weight?
8.  **FSM API Access Costs**: Does ServiceTitan charge recurring developer API fees that will degrade the $19.00 Teams SaaS contribution margin?
9.  **NRE Capital Deficit**: Tooling ($35k) and certifications (FCC, CE, UL, UN38.3 battery - $26k) sum to $61,000, leaving only $1,000 for firmware, PCB layout, and ID. How will the company fund the NRE deficit?
10. **Wholesale Buy-Back & Terms**: Do Ferguson and Johnstone Supply require mandatory inventory buy-back policies for unsold units or co-op fees?

---

## 4. The 3 Highest-Leverage Next Actions

1.  **Verify EPA Section 608 Requirements**: Consult an EPA refrigeration compliance specialist to confirm if manual saturation entries are legally compliant, and expand the snapshot schema to include missing required fields (cylinder IDs, technician EPA license numbers, recovery weights).
2.  **Conduct NRE and Inventory Capital Audit**: Re-forecast fixed CapEx requirements to resolve the NRE budget deficit and establish a credit line to fund the initial wholesale manufacturing run ($74,280 COGS for 1k units).
3.  **Prototype Firmware Partition and I2C Performance**: Compile a test ESP32 binary containing NimBLE, Sensirion drivers, and 7 graphic OLED displays via TCA9548A to benchmark compiled binary size and verify that sequential I2C writes do not drop BLE packets.

---

## 5. Domain Gaps (Unfilled Data)

*   **HVAC Calculations & PT Lookups**: The system lacks hardcoded Pressure-Temperature (PT) conversion arrays and local calculations (Evaporator Delta T, Superheat, Subcooling) for non-standard or newer A2L/refrigerant blends.
*   **BoM Vendor Quotes**: Mechanical enclosure costs (double-shot tooling, overmolds), PCB assembly (PCBA setup), and external clamp probe costs are current estimates based on retail catalogs rather than firm supplier quotes.
*   **Closed Beta Baseline Metrics**: The business goals assume a baseline capture time of 10–15 min, data accuracy of 78%, and admin transcription waste of 12 hours/week. These estimates must be verified in the field during the beta program.

---

## 6. Recommended Skills for the Next Session

*   `agency-embedded-firmware-engineer`: To resolve firmware size constraints, BLE stacks, and I2C multiplexing.
*   `agency-compliance-auditor` & `agency-legal-compliance-checker`: To audit EPA Section 608 requirements and PII sanitization in service notes.
*   `agency-finance-tracker` / FP&A Analyst: To re-model the NRE budget, wholesale working capital, and cash flow constraints.
