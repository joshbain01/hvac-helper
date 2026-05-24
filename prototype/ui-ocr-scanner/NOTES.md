# UI Prototype Design Notes: Mobile Camera Scanner & OCR Flow

**Question Addressed:**
How can we design a scanner UI that remains functional under outdoor solar glare (10,000+ nits) when operated by technicians wearing utility work gloves?

---

## 📋 Evaluation Log & Takeaways

### 1. Variant A (Camera-Centric Viewport HUD Overlay)
*   **Aesthetics**: HUD style feels futuristic, but the sliding overlay modal hides camera context during manual correction.
*   **Legibility under simulated glare**: High, but color-coded alignment brackets lose saturation under solar washout.
*   **Glove Ergonomics**: Bottom drawer buttons are large enough, but modal close triggers are cramped.
*   **Takeaway / Score**: 7/10

### 2. Variant B (Split-Screen Viewport + Inputs)
*   **Aesthetics**: Practical, but presents too much visual complexity on the screen at one time, which increases cognitive load under high stress.
*   **Legibility under simulated glare**: Good, since fields are exposed immediately.
*   **Glove Ergonomics**: Split screen makes input fields smaller and closer together.
*   **Takeaway / Score**: 6/10

### 3. Variant C (Step-by-Step Guided Wizard) - 🏆 WINNER
*   **Aesthetics**: Extremely intuitive and clean. Divides the workflow into logical slices (Intro -> Scan -> Review).
*   **Legibility under simulated glare**: Exceptional. The image crop previews (Model vs Serial zones) give the user visual proof of what the camera is seeing, even if screen contrast is degraded.
*   **Glove Ergonomics**: Excellent. Separating actions reduces button clustering, keeping primary touch zones well above the 64px threshold.
*   **Takeaway / Score**: 9.5/10

---

## 🏆 Final Decision & Design Specifications

*   **Selected Option**: **Variant C (Step-by-Step Guided Wizard)**.
*   **Auto-Capture Workflow**: Viewfinder overlay guides the user to align nameplates and tags within a central high-contrast bounding box. Scanning is performed automatically in the background without requiring button triggers.
*   **OCR Scanning Engine**: Leverages the **native phone OS scanner** (iOS Live Text / Android ML Kit) to extract raw text blocks on-device with zero network latency and zero recurring token expenses.
*   **Data Parsing Strategy**: **Option A (Local Regex & Pattern Matching)**. The mobile app matches raw text structures against a local, offline dictionary of manufacturer model and serial number structures to bind fields instantly.
*   **Low-Confidence Bypass**: **Option B** (active manual capture triggers) is retained to allow the technician to bypass background scanning immediately on faded or damaged tags.
*   **Service Tag Multi-Capture**: Technicians can upload multiple service tag photos to a single job snapshot. The schema is extended with a `service_tags` table to store photo references.
*   **Dynamic Custom Fields**: To support diverse AC configurations without cluttering the interface, the app dynamically extracts specs (voltage, phase, tonnage) from tags and provides an add-button for custom key-value pairs.
*   **Sunlight Legibility Rules**:
    1. Sunlight Mode utilizes a pure black (`#000000`) on white (`#FFFFFF`) palette, providing a **21:1 contrast ratio**.
    2. All interactive cards and buttons use a minimum of `2px` solid borders to outline targets.
    3. State changes are never represented by color alone; text descriptors (e.g. `✔ OCR MATCH SUCCESS`) accompany color changes.
    4. Text inputs use `font-weight: 800` to prevent font washing.
*   **OEM Branding**: Scanned equipment details include the manufacturer name and corporate color-coded branding badges (Goodman, Carrier, Trane) on the results review screen to provide quick visual verification.
