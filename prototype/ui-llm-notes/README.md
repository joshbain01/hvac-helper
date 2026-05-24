# HVAC Helper Pro - LLM Work Note & Consumables Checklist Prototype

This is a throwaway browser prototype for evaluating how the mobile app should present AI-expanded technician notes and suggested consumables for fast review.

## Questions This Prototype Is Testing

1. Can a technician review, correct, and approve an AI-expanded work note plus consumables list in 15 seconds or less?
2. Does an inline review layout, a step-by-step wizard, or a raw-vs-expanded comparison layout produce the fastest confident approval?
3. Are consumables such as filters and refrigerant amounts visible enough that the technician can catch billing mistakes before finalizing the snapshot?
4. When local LLM inference falls back to a template because of an out-of-memory condition, is that degraded mode obvious to the technician?
5. Does showing confidence, consumable count, approval state, and full prototype state help reviewers identify what the AI changed?

---

## How to Run

Run the following command from the repository root:

```bash
npm run prototype:ui-llm-notes
```

Then open:

```text
http://127.0.0.1:5184
```

---

## Prototype Controls

*   **Inline / Wizard / Compare**: Switch review layout (tabs or footer bar). All three layouts have an Approve button.
*   **Expand Note (reset timer)**: Simulates a new AI expansion arriving — resets the 15-second countdown and clears approval state.
*   **Toggle OOM Fallback (Q4)**: Switches from full LLM output to a degraded template fallback. Triggers an amber warning banner in the main content area.
*   **Consumable chips**: Use the `×` on any chip to remove a billing error. Type in the add-item field and press `+` or Enter to add a correction.
*   **Approve Note + Items**: Available in all three layouts. Records exactly how many seconds remained when the technician approved.

---

## What To Watch

*   **Q1**: Click `Expand Note` to start the timer. Read the note, correct any consumable if needed, and click Approve before the countdown reaches 0. The header reports either `✓ Approved in Xs` or `⚠ 15s expired — not approved`. Repeat across all three layouts to see whether 15 seconds is achievable.

*   **Q2**: Switch between `Inline`, `Wizard`, and `Compare`. For each, click `Expand Note` to reset the timer, then approve as fast as possible. Compare the `approvedAtSeconds` value in the state panel across layouts — whichever leaves the most seconds remaining is the fastest. Does the Wizard's three-step structure add clarity or just slow down the approval?

*   **Q3**: Look at the consumable chips (`16x25x1 filter`, `R-410A 0.5 lb`). Press `×` on one to simulate removing a billing error, or type a corrected amount in the add-item field. Verify the count in the sidebar updates. Are the chips visible without scrolling in all three layouts?

*   **Q4**: Click `Toggle OOM Fallback`. An amber banner should appear at the top of the main review area — not just the sidebar — reading `⚠ FALLBACK MODE`. The expanded note degrades to a short, detail-free template. The sidebar shows `Fallback template` and `N/A`. Is the banner prominent enough that a technician under time pressure would notice they are seeing reduced-quality output before approving?

*   **Q5**: The right-hand panel shows the full JSON state at all times: `view`, `oom`, `consumables`, `approved`, `approvedAtSeconds`, `timerExpired`. After approving, `approvedAtSeconds` records exactly when. After toggling OOM, `oom: true` is visible. Does the combination of confidence percentage, consumable count, and live state give enough signal to identify what the AI changed versus what the technician corrected?
