# HVAC Helper Pro – Prototypes Catalog

This directory hosts various throwaway prototypes designed to answer specific technical and product design questions before committing code to production.

Each prototype is isolated in its own sub-directory and can be executed via dedicated `npm run` commands.

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

---

## ➕ Adding a New Prototype

1. Create a new subdirectory under `prototype/` (e.g. `prototype/ui-variants`).
2. Add your prototype logic and a local `README.md` detailing the questions being answered and execution instructions.
3. Register the startup script in `package.json` following the pattern `"prototype:<name>": "node prototype/<name>/index.js"`.
4. Document the prototype in this catalog file.
