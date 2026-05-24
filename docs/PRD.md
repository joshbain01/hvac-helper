# PRD: HVAC Helper Pro – Handheld Troubleshooting Device

**Status**: Draft
**Author**: Antigravity (AI Assistant)
**Last Updated**: 2026-05-18
**Stakeholders**: Product Manager, Hardware Engineer, Firmware Engineer, Mobile App Team, UX Designer, Field Tech Beta Users

---

## 1. Problem Statement
HVAC technicians currently need to carry multiple tools (voltmeter, temperature probes, pressure gauges, and separate devices for humidity) and manually record readings on paper or disparate digital tools. This fragmented workflow leads to:
- **Time waste**: 5–15 min per measurement set for tool setup, data entry, and verification.
- **Data inconsistency**: Manual transcription introduces errors and makes post‑service reporting cumbersome.
- **Fragmented communication**: Data must be manually entered into office systems, delaying service records and parts ordering.

**Goal**: Provide a single, ultra‑simple handheld device that captures all required readings, gives instant visual feedback, and synchronizes data in real‑time to a mobile app for automatic service record generation.

---

## 2. Goals & Success Metrics
| Goal | Metric | Current Baseline | Target | Measurement Window |
|------|--------|------------------|--------|--------------------|
| Reduce on‑site measurement time | Avg. minutes per service call dedicated to data capture | 10‑15 min | ≤ 5 min | 60 days post‑launch |
| Increase data accuracy | % of service records with complete, error‑free readings | 78 % (manual)* | ≥ 95 % | 90 days post‑launch |
| Boost technician satisfaction | NPS for field tools (survey) | N/A | ≥ 7 | 90 days post‑launch |
| Reduce back‑office entry effort | Hours/week spent entering field data | 12 h* | ≤ 2 h | 30 days post‑launch |

*\*Note: Current baselines (78% data accuracy and 12 hours/week back-office entry) are pilot-partner estimates and serve as initial product assumptions to be formally validated during the Closed Beta phase.*

---

## 3. Non‑Goals (Scope Exclusions)
- No full‑featured touchscreen UI – the device is button‑driven with a single top display.
- No built‑in pressure sensors – technicians dial in refrigerant saturation temperatures directly from their physical gauges' printed temperature rings.
- No real‑time cloud sync; data is stored locally on the phone and uploaded when a network becomes available (offline‑first approach).
- No advanced diagnostics beyond the calculations listed (ΔT, super‑heat, sub‑cool).

---

## 4. User Personas & Stories
**Primary Persona – Field Service Technician**
- Works on residential split‑system AC units.
- Carries a toolbox with gauges, probes, and a tablet.
- Needs to record measurements quickly and send them to the office.

# **User Stories**
1. **Record Before Measurements**
   - *As a technician*, I slide the physical BEFORE/AFTER switch to BEFORE, press the **Return Air** button, see the temperature update on the single top display, and see the progress LED turn solid green from yellow (indicating capture) within 3 seconds of receipt confirmation.
   - *Acceptance*: The reading is stored, displayed on the top display, and the LED turns green within 3 seconds.
2. **Record Additional Data Points**
   - *As a technician*, I press the dedicated buttons for **Return Air (RA)**, **Supply Air (SA)**, **Outdoor Ambient (OA)**, and **Discharge Air (DA)**, or push the rotary encoders for **Suction Line (SL)** and **Liquid Line (LL)**, to capture each slot's values on the top display, checking off the progress LEDs as they turn from solid yellow (needs capture) to solid green.
   - *Acceptance*: Each data point is pushed to the phone within 3 seconds, display updates, and its progress LED turns green.
3. **Capture Photo of Service Tags & OCR Telemetry**
   - *As a technician*, I tap the **Photo Capture** soft button in the mobile app to snap a picture of the unit’s service tags; the app parses the image to extract model/serial numbers. If the OCR is incorrect, I manually override it.
   - *Acceptance*: Parsed information appears in the app. Manual override updates `ocr_status` to `MANUAL_OVERRIDE` and triggers telemetry logs.
4. **LLM Interaction for Work Description**
   - *As a technician*, I open the chat interface and describe the work performed (using rapid tap-templates, hands-free voice-to-text dictation, or by deferring text entry until I return to the service vehicle). The LLM processes these inputs to suggest a structured, professional service description.
   - *Acceptance*: The tech reviews, edits if needed, and saves the description.
5. **Consumables Prompt**
   - *As a technician*, after confirming the work description, the LLM prompts me to list consumables used (filters, refrigerant, seals, etc.).
   - *Acceptance*: Selected consumables are added to the snapshot for automatic ordering.
6. **Dial in Saturation Temperature and Capture Temperature**
   - *As a technician*, I turn the **Liquid‑line** and **Suction‑line** rotary encoders to match my gauge readings' saturation temperature and push the encoder dials to confirm the manual saturation temperature and trigger the clamp probe temperature capture.
   - *Acceptance*: Saturation and pipe temperature values are captured, accepted, and used in subsequent calculations.
7. **Capture After Measurements & Performance Deltas**
   - *As a technician*, I slide the physical switch to AFTER. The top display context-swaps to the After Set (all progress LEDs turn yellow indicating pending capture), and I capture SA, RA, etc. The app calculates Before-to-After performance deltas upon snapshot finalization.
   - *Acceptance*: All After Set LEDs are green, notes are added, performance deltas are calculated, and the snapshot is finalized.
8. **Finalize Snapshot & Send to Office**
   - *As a technician*, once all measurements are taken and notes are written, I tap the **Send** soft button on the mobile app; the app confirms the full snapshot is uploaded to the cloud and notifies the office.
   - *Acceptance*: Cloud receives complete snapshot, tech sees confirmation message.

---

## 5. Firmware Requirements

- **Error handling** – BLE transmission retries up to 3 times; if confirmation is not received, the progress LED remains solid yellow (unconfirmed/needs capture), and a retry error is logged. If a hardware sensor/probe fault is detected, the LED flashes yellow. *Add persistent logging of failure counts in NVS for post‑mortem analysis.*
- **Watchdog & Reset** – Device includes a hardware watchdog (≈5 s). On watchdog reset the cached snapshot is persisted in NVS and restored on next boot. *Include a watchdog hook that also records the reset cause in NVS.*
- **Memory budget** – Static cache ≤ 200 B; total RAM usage ≤ 30 % of ESP‑32 RAM (≈150 KB). No dynamic allocation after init. *Allocate a static BLE TX buffer (`static uint8_t ble_tx_buf[BLE_MAX_PAYLOAD];`) and avoid any heap usage.*
- **Stack & Heap Verification** – Add `configCHECK_FOR_STACK_OVERFLOW` hook and periodic `uxTaskGetStackHighWaterMark()` checks. Verify free heap at startup (`heap_caps_get_free_size(MALLOC_CAP_8BIT)`) stays within budget.
- **Power‑save mode** – Define deep‑sleep entry after snapshot completion, wake on button press, and an idle timeout ≤ 5 s to keep battery drain < 5 %/h.
- **OTA updates** – Firmware can be upgraded over‑the‑air via the mobile app; signature verification and rollback on failure are required. *Document max OTA image size for BLE (respect MTU) and use chunked transfer with CRC per chunk.*
- **Stress‑test gate** – Prior to GA the firmware must run ≥ 72 h continuous operation with random BLE drops and maintain 0 crashes or data loss.
- **Unit‑test harness** – Use Unity + CMock to achieve ≥ 80 % firmware unit‑test coverage for BLE manager, watchdog path, and OTA validation.

---

## 6. Mobile-App Requirements
- **Platform strategy** – Native iOS (SwiftUI, iOS 15+) and Android (Jetpack Compose, API 24+), with a shared React‑Native layer for non‑UI logic.
- **Offline‑first storage** – SQLite/Core Data log of all sensor snapshots. Snapshots remain local-only **Drafts** until finalized. Finalization makes the snapshot read-only (**Immutable**) and queues it in the local **Outbox** for upload. Edits to finalized snapshots require creating a new **Revision** (linked via parent ID). Creating a revision clones all parent snapshot data (measurements and calculations) to allow simple metadata patching.
- **BLE manager** – Queues each packet, retries up to 3 times within the 3 s latency window, and reports transmission status to the UI (rendering green checkmark or yellow warning/red error icon with proper color-blind text).
- **OCR Status Telemetry** – Snapshot record includes an `ocr_status` field (`PENDING`, `OCR_SUCCESS`, `MANUAL_OVERRIDE`). If a technician overrides the OCR-captured model/serial numbers manually, `ocr_status` updates to `MANUAL_OVERRIDE` and triggers telemetry logging.
- **Reactive UI architecture** – MVVM (iOS) / MVI (Android) with Combine / Kotlin Flow; UI renders solely from immutable view‑state objects.
- **Performance & battery** – BLE handling < 5 ms per event; background upload via App Refresh (iOS) / WorkManager (Android) monitors network connectivity to opportunistically sync finalized Outbox snapshots; idle mode disables unnecessary peripherals.
- **Security & Compliance** – Data encrypted at rest via Keychain/EncryptedSharedPreferences; HTTPS/TLS 1.3 for cloud. Customer PII is stored separately from raw system measurement Snapshots, linked only via an anonymized UUID to comply with state privacy regulations (e.g., CCPA/CPRA). Snapshots are retained for a minimum of 3 years to comply with EPA Section 608 and state residential contractor laws.
- **LLM & RAG Architecture** – OCR, text parsing, shorthand notes expansion, and manuals RAG run natively on-device using local models (Apple's native language models and Android's AICore system models) to ensure zero token costs, low latency, and offline operation. A Backend Gateway cloud LLM API configured under enterprise agreements enforcing Zero Data Retention (ZDR) serves as a fallback for legacy devices.
- **LLM Offline Capability** – Note expansion and RAG queries run fully offline on devices supporting local models. For legacy devices relying on cloud fallbacks, inputs are cached locally and processed automatically once connectivity is restored.
- **Error handling UI** – Non‑intrusive toast on BLE retry; modal dialog after final failure offering “Rescan” or “Proceed Anyway.”
- **Firmware OTA integration** – Settings screen includes “Check for Firmware Update” to trigger OTA over BLE with progress UI.
- **Testing & metrics** – ≥ 80 % unit test coverage, UI tests for each button‑LED flow, CI BLE mock tests; launch metrics include BLE latency ≤ 250 ms, sync success ≥ 98 %, crash‑free ≥ 99.5 %, battery drain < 5 %/h.
- **Guided vs. Expert UI modes** – Offer a step-by-step "Guided Mode" with sensor placement diagrams for apprentice technicians, and a single-screen rapid capture grid ("Expert Mode") for lead technicians.
- **Voice-to-Text & Deferred Input** – Provide native speech-to-text dictation and allow technicians to save snapshots with pending work descriptions to complete later in the service vehicle. Notes are mandatory before a snapshot can be finalized.

## 7. Mobile App Design System

The mobile application design system, including visual language guidelines, components, interaction design, and token specifications, has been moved to its own dedicated file: [design-system.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/design-system.md).

---

## 8. Solution Overview
- **Hardware**: ESP32‑based handheld with:
  - High‑precision temperature/humidity sensor built-in (± 0.2 °F, ± 0.2 %RH) and two ports for external pipe clamp temperature probes.
  - Two digital **rotary encoders** with integrated push buttons (Suction Line, Liquid Line) for manual saturation temperature entry (read directly from gauge scales) and external clamp probe temperature capture.
  - Four tactile **buttons** (Return Air, Supply Air, Outdoor Ambient, Discharge Air).
  - **Top Display**: A single high-contrast 128x64 display at the top of the handheld device displaying all raw measurements, saturation dials, calculations (Delta T, Superheat, Subcooling), and active target ranges.
  - **Progress LEDs**: Six two-color (Yellow/Green) visual indicators next to each button or rotary encoder representing the capture state. It glows solid yellow if a reading is missing (needs capture), solid green when captured successfully, and flashes yellow if there is a sensor/probe fault.
  - **Physical Switch**: A BEFORE/AFTER slide switch that context-swaps display values between the Before and After sets, and triggers a BLE re-transmission of all cached values in the selected set to sync with the mobile application.
  - **Bluetooth 5.0 LE** for immediate data push and bidirectional configuration sync.
  - **Battery** (Li‑Ion) supporting ≥ 10 h of continuous use, waking from deep sleep via button press or encoder push (EXT1 GPIO interrupt).
- **Ergonomic Form Factor** – Hand‑held, lightweight (~200 g), rubberized grip, IP‑54 sealed enclosure for dust/moisture resistance.
- **Simple Interaction Model** – Six tactile controls with progress LEDs and a single top display showing values; no menus, just one‑press capture.
- **Power Management** – Deep‑sleep between reads, BLE idle disabled, rechargeable via USB‑C.
- **Durability** – Shock‑resistant housing, meets MIL‑STD‑810G drop test.
- **Physical Labels** – Engraved icons for each sensor/button to aid field use under bright light.
- **Firmware**: Handles sensor reads (built-in and clamp probes), UI updates (drawing to the Top Display), Bluetooth packet assembly, local calculations (Delta T, Superheat, Subcooling), and LED state machine.
- **Mobile App (iOS/Android)**:
  - Receives each data point instantly, stores locally in the active Draft snapshot, performs calculations, and updates the device screen targets (pushing confirmed targets with a `(Conf)` suffix when equipment tag is scanned).
  - Shows a composite before/after view with performance deltas.
  - Mandates technician notes before finalizing a snapshot.
  - Queues completed snapshots in the Outbox for background upload.
  - Clones all parent snapshot readings and calculations when creating a new **Revision** to allow easy metadata edits.
- **Cloud Backend** (MVP): Simple endpoint to accept JSON snapshot, store in database, and forward to existing CRM.

---

## 9. Technical Considerations
**Dependencies**
- ESP‑IDF / Arduino core for ESP32 (firmware development).
- Bluetooth LE stack on mobile (React Native / native iOS/Android).
- **Secure Boot & Flash Encryption** – Enable ESP‑32 secure boot and flash encryption; store signing keys in hardware.
- **NVS Reset‑Cause Logging** – Record watchdog, power loss, software reset causes in NVS and expose via diagnostics endpoint.
- **BLE Back‑Pressure Queue** – Implement a bounded queue (max 10 packets) to prevent RAM exhaustion; drop oldest when full.
- **Static Memory Auditing** – Run `CONFIG_HEAP_POISONING` and compile‑time checks to enforce no dynamic allocation after init.
- Cloud API (Node/Express or similar) – can be mocked for prototype.
- **OpenAPI Specification** – Publish a versioned OpenAPI spec (`/api/v1/snapshots`) with idempotency key.
- **JWT Authentication** – Secure endpoints with short‑lived JWTs signed by a private key; device provisioning stores a secret in NVS.
- **Health‑check & Metrics** – `/healthz` endpoint returning status; expose Prometheus metrics (`/metrics`) for latency, error rates.
- **Observability** – Structured JSON logs (timestamp, level, requestId) sent to a centralized logging service.
- **Containerisation & CI/CD** – Dockerfile for the API, GitHub Actions pipeline builds, runs unit/integration tests, and deploys via blue‑green rollout.

**Known Risks**
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Bluetooth pairing failures in noisy environments | Medium | High (data loss) | Use BLE 5.0 with robust reconnection logic; fallback to manual retry button. |
| UI confusion without menus | Low | Medium | Physical label icons + consistent LED/color scheme; user testing with techs. |
| Battery drain under heavy use | Low | Medium | Power‑optimised firmware, deep‑sleep between reads. |
| Inaccurate manual saturation temperature entry | Medium | Low | Provide digital rotary encoders with tactile detents; display entered value directly. |

---

## 10. Open Questions (Resolved)
- **Pressure measurement** – No built‑in sensor; technicians dial in saturation values directly (resolved).
- **Timeout** – 20 minutes per before/after capture (resolved).
- **LED colors** – Yellow/Green checklist: Solid Yellow (needs capture), Solid Green (captured), Flashing Yellow (sensor fault) (resolved).
- **Screen layout** – Single Top Display (128x64) showing all measurements, saturation dials, calculations, and active target ranges (resolved).
- **Prototype durability** – Will target rugged enclosure (IP‑54) for beta (resolved).

---

## 11. Launch Plan
| Phase | Date | Audience | Success Gate |
|-------|------|----------|--------------|
| Internal Alpha | June 2026 | Engineering team + 2 pilot techs | All LEDs green in > 90 % of test runs, battery ≥ 10 h. |
| Closed Beta | July‑August 2026 | 10 field techs (partner HVAC companies) | ≥ 80 % satisfaction, < 5 % data‑sync failures. |
| GA Rollout | Q4 2026 | All service technicians (licensed) | Meets all success metrics, approved by compliance. |

For detailed information on the target segments, pricing structure, distribution channels, and sales validation tactics during the beta, see the [go-to-market-v0.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md).

---

## 12. Appendix
- **Glossary** – See `CONTEXT.md`.
- **Go-To-Market Strategy** – See [go-to-market-v0.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md).
- **Potential ADRs** – None required at this stage (design decisions are straightforward and reversible). 
- **References** – Industry standards for temperature/humidity sensors, ESP32 datasheet, BLE 5.0 best practices.

---

*Prepared by Antigravity – the AI product‑management partner.*
