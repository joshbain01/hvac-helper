# HVAC Helper Pro – Prototypes Catalog & Roadmap

This directory hosts various throwaway prototypes designed to answer specific technical and product design questions before committing code to production.

Each prototype is isolated in its own sub-directory under `prototype/` and can be executed via dedicated `npm run` commands registered in the root `package.json`.

---

## 📁 Available Prototypes

### 1. [Logic State Simulator](logic-state)
*   **Directory**: [`prototype/logic-state`](logic-state)
*   **Question Answered**: How do physical device sensor captures, BLE transfer latency/retries, and 20-minute before/after measurement timeouts interact with the mobile app's synchronization state machine (Draft -> Finalized -> Synced)?
*   **Type**: Interactive TUI (Terminal User Interface)
*   **Run Command**:
    ```bash
    npm run prototype:logic-state
    ```

### 2. [Mobile Camera Scanner & OCR Flow](ui-ocr-scanner)
*   **Directory**: [`prototype/ui-ocr-scanner`](ui-ocr-scanner)
*   **Question Answered**: How can we design a scanner UI that remains functional under outdoor solar glare (10,000+ nits) when operated by technicians wearing utility work gloves?
*   **Type**: Web Application Prototype (HTML/CSS/JS)
*   **Run Command**:
    ```bash
    npm run prototype:ui-ocr-scanner
    ```

### 3. [BLE OTA Update Coordinator](logic-ble-ota)
*   **Directory**: [`prototype/logic-ble-ota`](logic-ble-ota)
*   **Question Answered**: How do we coordinate chunk packetization, sliding-window retries, CRC checks, and firmware transmission flow control without locking up the mobile app UI or overflowing the ESP32's buffer?
*   **Type**: Interactive TUI (Terminal User Interface)
*   **Run Command**:
    ```bash
    npm run prototype:logic-ble-ota
    ```

### 4. [FSM Webhook Integration & Custom Fields Mapper](logic-fsm-sync)
*   **Directory**: [`prototype/logic-fsm-sync`](logic-fsm-sync)
*   **Question Answered**: How do we transform raw local SQLite snapshots into invoices/work orders on ServiceTitan and Housecall Pro APIs despite token expiry or custom field limits?
*   **Type**: Interactive TUI (Terminal User Interface)
*   **Run Command**:
    ```bash
    npm run prototype:logic-fsm-sync
    ```

---

## 📅 Planned Prototypes Roadmap

To clarify design patterns, hardware diagnostics, and APIs, the following prototypes are planned to be implemented sequentially:

### 3. [PLANNED] LLM Work Note & Consumables Checklist (UI Prototype)
*   **Target Directory**: `prototype/ui-llm-notes`
*   **Run Command**: `npm run prototype:ui-llm-notes`
*   **Question to Answer**: How should the app present expanded professional notes and suggested consumables checklists so the technician can review and correct them in under 15 seconds?
*   **Description**: Mockups displaying dynamic inline expansion, a multi-step checklist wizard with glove-friendly tap zones, and a side-by-side comparison screen.

### 4. [PLANNED] Partition Swap & Rollback Simulator (Logic Prototype)
*   **Target Directory**: `prototype/logic-rollback`
*   **Run Command**: `npm run prototype:logic-rollback`
*   **Question to Answer**: What sequence of boot partition flags, public key checks, and self-test verification timers guarantees that a corrupted or crashing firmware update safely restores device function?
*   **Description**: TUI simulating the ESP32 partition table, signature verification checks, and automated rollbacks triggered by simulated watchdog crashes.

### 5. [PLANNED] Hardware Power-On Self-Test (POST) Routine (Logic Prototype)
*   **Target Directory**: `prototype/logic-self-test`
*   **Run Command**: `npm run prototype:logic-self-test`
*   **Question to Answer**: How does the firmware check individual hardware components (I2C OLED screen, Rotary Encoders, tactile Buttons, BLE, clamp probes) and enter degraded standalone modes on faults?
*   **Description**: Console mockup simulating power-on checks, fault injection (e.g. stuck buttons, open probes), and error reporting.

### 7. [PLANNED] Tiered SaaS & Pricing Sensitivity Model (Logic Prototype)
*   **Target Directory**: `prototype/logic-pricing`
*   **Run Command**: `npm run prototype:logic-pricing`
*   **Question to Answer**: How do varying subscriber attach rates, LLM fallback API costs, and distributor margins affect break-even Economics?
*   **Description**: Command-line sensitivity calculator that computes operating margins and break-even windows based on variable user/unit economic parameters.

### 8. [PLANNED] Homeowner PDF Service Report Layouts (UI Prototype)
*   **Target Directory**: `prototype/ui-service-reports`
*   **Run Command**: `npm run prototype:ui-service-reports`
*   **Question to Answer**: What layout maximizes the "wow" factor for homeowners while clearly displaying HVAC system health and repair outcomes?
*   **Description**: Web generator producing three visual PDF themes: a color-coded graphic infographic, a detailed technical/compliance ledger, and an itemized work completed card.

### 9. [PLANNED] Compact Binary BLE Serialization Protocol (Logic Prototype)
*   **Target Directory**: `prototype/logic-ble-binary`
*   **Run Command**: `npm run prototype:logic-ble-binary`
*   **Question to Answer**: How can we pack the 6 raw values, 2 dial values, calculated metrics, and sensor states into a compact binary payload to fit within a single BLE packet?
*   **Description**: Serialization test script comparing custom bit-packed buffers vs. standard JSON layouts to measure compression and speed.

### 10. [PLANNED] SQLite Outbox Sync Status & Error States (UI Prototype)
*   **Target Directory**: `prototype/ui-outbox-sync`
*   **Run Command**: `npm run prototype:ui-outbox-sync`
*   **Question to Answer**: How should the app visually represent draft snapshots, queued finalized jobs, active background uploads, and sync error states under harsh glare?
*   **Description**: Web views showing list options: standard bars, high-contrast multi-sensory color-blind badges, and a compact fleet manager logs table.

### 11. [PLANNED] Physical BEFORE/AFTER Switch Context-Swap (Logic Prototype)
*   **Target Directory**: `prototype/logic-before-after`
*   **Run Command**: `npm run prototype:logic-before-after`
*   **Question to Answer**: How does the handheld device manage context-swapping display caches and coordinate simultaneous BLE notifications when sliding between BEFORE and AFTER mode?
*   **Description**: Interactive TUI simulating dual pointers for memory cache partition swapping and display context redraws.

---

## ➕ Adding a New Prototype

When implementing one of the planned prototypes or creating a new one, follow these steps to conform to repository guidelines:

1. Create a new subdirectory under `prototype/` (e.g. `prototype/ui-ocr-scanner`).
2. Add your prototype logic and a local `README.md` detailing the questions being answered, keyboard shortcuts/UI options, and execution instructions.
3. Register the startup script in the root `package.json` scripts following the pattern `"prototype:<name>": "node prototype/<name>/index.js"`.
4. Update this catalog file: move the prototype description from the **Planned Prototypes Roadmap** section to the **Available Prototypes** section, and update its status from `[PLANNED]` to its execution details.
