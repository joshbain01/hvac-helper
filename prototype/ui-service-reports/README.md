# HVAC Helper Pro - Homeowner PDF Service Report Layout Prototype

This is a throwaway browser prototype for comparing homeowner-facing service report layouts before committing to PDF generation.

## Questions This Prototype Is Testing

1. Which report layout makes the homeowner understand the repair outcome fastest: infographic, technical ledger, or work-completed card?
2. Does a numeric health score increase trust, or does it feel too opaque without the underlying measurements?
3. Are before/after Delta T, Superheat, and Subcooling changes understandable when shown to a non-technical homeowner?
4. Does photo evidence improve perceived value enough to justify including it in every report?
5. Can the same snapshot data support both homeowner-friendly and compliance-friendly report variants?

---

## How to Run

```bash
npm run prototype:ui-service-reports
```

Open:

```text
http://127.0.0.1:5185
```

---

## Prototype Controls

*   **Infographic**: Shows a simple health score, summary, metrics, and optional photo evidence.
*   **Compliance Ledger**: Shows the same data as a structured technical table.
*   **Work Completed Card**: Prioritizes completed work items and supporting measurements.
*   **Toggle Photo Evidence**: Shows or hides before/after and service tag evidence cards.

---

## What To Watch

*   Whether the homeowner can tell what improved without knowing HVAC formulas.
*   Whether the technical ledger feels trustworthy or too dense.
*   Whether the work card makes the technician's labor visible enough.
*   Whether all three variants can be generated from one snapshot payload.
