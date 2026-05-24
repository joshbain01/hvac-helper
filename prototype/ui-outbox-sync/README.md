# HVAC Helper Pro - SQLite Outbox Sync Status Prototype

This is a throwaway browser prototype for comparing mobile sync status presentations for offline-first snapshots.

## Questions This Prototype Is Testing

1. Which view helps a technician understand sync state fastest: status bars, high-contrast badges, or a fleet log table?
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

*   **Status Bars / High-Contrast Badges / Fleet Log Table**: Switch between the three layout variants.
*   **Advance Sync**: Moves QUEUED → SYNCING → SYNCED. Behaviour depends on the Q4 toggle.
*   **Inject Error**: Adds a new failed upload with random error code and retry metadata.
*   **Reset**: Restores the baseline four-job queue.
*   **Start Glance Test (Q1)**: Picks a random target status and starts a timer. Click the matching job row to stop it. Sidebar shows average time per view.
*   **Simulate Glare (Q2)**: Applies a brightness/desaturation CSS filter to the job list, simulating a washed-out outdoor screen.
*   **Keep Confirmed (Q4)**: Toggle ON → SYNCED jobs stay in the list (dimmed, dashed border). Toggle OFF → SYNCED jobs disappear immediately after sync.

---

## What To Watch

*   **Q1**: Click **Start Glance Test** on the Status Bars view — the banner names a random status (e.g. `ERROR`). Click the matching row. Note the elapsed time shown in the banner. Switch to **High-Contrast Badges**, click **Start Glance Test** again, repeat. Switch to **Fleet Log Table**, repeat. The sidebar shows per-view averages. Whichever view leaves the smallest average is fastest — confirm it's not just faster because you memorized the job order.

*   **Q2**: Switch to **High-Contrast Badges**. Compare the badge colors against Status Bars — are the filled/inverted colors noticeably more distinct? Now click **Simulate Glare**. The `☀ SIMULATED OUTDOOR GLARE` label appears and the layout washes out with a brightness filter. Can you still read all four status states without squinting? Switch back to **Status Bars** with glare still on — are the pastel soft colors harder to distinguish?

*   **Q3**: In **Status Bars** or **Badges** view, find the `ERROR` job (JOB-994D). Its row shows a `▼ show details` toggle. Click it — the drawer expands to show retry count, failure reason, and estimated next retry time. Click `▲ hide details` to collapse. Now press **Inject Error** to add more failed jobs. With two or three error cards all expanded simultaneously, does the screen feel overwhelming? Is the collapsed default the right choice for the primary list?

*   **Q4**: Click **Advance Sync** twice — QUEUED becomes SYNCING, then SYNCED. With **Keep Confirmed: OFF** (default), the SYNCED job disappears immediately. Does that feel reassuring or alarming — did the job vanish before you noticed it succeeded? Click **Reset**, then toggle **Keep Confirmed: ON**. Advance sync twice again. The confirmed job stays with a dimmed dashed border and a `SYNCED` badge. Does the confirmation state give useful feedback, or does the clutter outweigh the reassurance?

*   **Q5**: Switch to **Fleet Log Table**. The dataset changes to 4 technicians (T-01 through T-04), 8 jobs across devices, with a **Tech** column. The Bars and Badges views show only the current device's 4 jobs. Does the fleet table give enough information for a dispatcher or back-office to triage errors across multiple technicians at a glance? Or does it need grouping by tech, sortable columns, or a separate filter?
