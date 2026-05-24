# HVAC Helper Pro - SQLite Outbox Sync Status Prototype

This is a throwaway browser prototype for comparing mobile sync status presentations for offline-first snapshots.

## Questions This Prototype Is Testing

1. Which view helps a technician understand sync state fastest: status bars, high-contrast badges, or a compact log table?
2. Can the technician distinguish drafts, queued finalized jobs, active uploads, and failed uploads at a glance in bright outdoor conditions?
3. Does showing retry details and failure reasons reduce uncertainty without overwhelming the mobile screen?
4. Should synced jobs disappear from the active queue immediately, or remain visible as confirmation?
5. Can the same status model serve both a technician phone UI and a fleet-manager troubleshooting view?

---

## How to Run

```bash
npm run prototype:ui-outbox-sync
```

Open:

```text
http://127.0.0.1:5186
```

---

## Prototype Controls

*   **Status Bars**: Shows full rows with status, job number, and detail.
*   **High-Contrast Badges**: Shows a denser badge-first view for glare and color-blind scanning.
*   **Fleet Log Table**: Shows timestamped troubleshooting-style logs.
*   **Advance Sync**: Moves queued jobs into syncing and removes completed uploads.
*   **Inject Error**: Adds a new failed upload with retry metadata.
*   **Reset**: Restores the baseline queue.

---

## What To Watch

*   Whether error states are impossible to miss.
*   Whether compact mode loses too much operational detail.
*   Whether disappearing synced jobs feels reassuring or suspicious.
*   Whether retry details belong in the primary list or in a drawer.
