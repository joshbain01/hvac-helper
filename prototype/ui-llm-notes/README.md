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

*   **Inline**: Shows the expanded note and consumable chips in one compact review view.
*   **Wizard**: Splits the review into note, consumables, and final approval steps.
*   **Compare**: Places raw dictation beside the expanded note.
*   **Expand Note**: Resets the 15-second timer and approval state.
*   **Toggle OOM Fallback**: Switches from local LLM output to a lower-quality template fallback.
*   **Approve Note + Items**: Marks the note and consumables as approved for the active snapshot.

---

## What To Watch

*   Whether consumables remain visible while reading the note.
*   Whether the fallback mode is obvious enough to prevent false confidence.
*   Whether the wizard adds clarity or just slows the technician down.
*   Whether the timer creates useful urgency or unnecessary pressure.
