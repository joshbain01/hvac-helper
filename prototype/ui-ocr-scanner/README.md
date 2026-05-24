# HVAC Helper Pro – Mobile Camera Scanner & OCR Flow (UI Prototype)

This directory hosts the interactive UI prototype designed to answer critical usability and visual design questions regarding the mobile app's optical camera equipment scanner under harsh real-world conditions.

## ❓ The Question Answered

> **"How can we design a scanner UI that remains functional under outdoor solar glare (10,000+ nits) when operated by field technicians wearing thick, leather utility work gloves?"**

To answer this, we evaluate three structurally distinct layouts under simulated glare and glove scenarios.

---

## 🚀 How to Run the Simulator

From the repository root directory, run:
```bash
npm run prototype:ui-ocr-scanner
```

This starts a lightweight local Node.js web server and automatically opens the prototype in your default web browser (typically at `http://localhost:3000`).

---

## 📱 The 3 UI Layout Variants

### Variant A: Camera-Centric Viewport Overlay (HUD Style)
*   **Concept**: Immersive viewfinder HUD prioritizing live camera feedback.
*   **Glove Ergonomics**: Renders a large drawer panel at the bottom of the screen with a massive `CAPTURE & SCAN` button (min 64px tall) and secondary `MANUAL BYPASS`.
*   **Solar Legibility**: Viewport alignment brackets use vibrant green/red scanning beams. Manual fields are housed in a sliding overlay modal with massive text input tap-targets.

### Variant B: High-Contrast Split Screen (Glove-Optimized)
*   **Concept**: 50/50 split screen designed for immediate feedback.
*   **Glove Ergonomics**: Camera viewfinder occupies the top half, while the bottom half immediately exposes the primary text fields and options without requiring any modal overlays. Inputs are kept huge and spaced 16px apart.
*   **Solar Legibility**: Focuses on extreme simplicity. Text field borders are styled with 2px thick outlines. The active OCR text parsing status is shown directly next to the fields in real-time.

### Variant C: Step-by-Step Guided Wizard (Context-First)
*   **Concept**: A structured multi-step wizard showing only one focus action at a time.
*   **Glove Ergonomics**:
    *   *Step 1*: Big simple introduction card with a single 64px action button: `START CAMERA SCAN`.
    *   *Step 2*: Full-screen camera viewfinder HUD with single `🔴 TAKE PHOTO` trigger at bottom.
    *   *Step 3*: Results review showing actual nameplate image cropped zones (Model vs Serial crop simulations) side-by-side with parsed text values, giving the technician confidence to approve in under 15 seconds.
*   **Solar Legibility**: The wizard structure guides the eyes naturally, minimizing visual clutter. Image comparison crops make validation easy even when screen contrast is partially degraded.

---

## 🛠️ Simulation Stress-Testing Controls

The left-side panel provides environment simulation overrides to help you evaluate the variants:

1.  **Simulate Solar Glare**: Applies a CSS backdrop-filter that washes out contrast and overlays a harsh solar lens-reflection. *Swap to Sunlight mode while glare is enabled to see the high-contrast legibility in action!*
2.  **Toggle Glove Target Overlays**: Overlays translucent red dotted rectangles showing the minimum 64px accessibility zones. Check how each variant meets these requirements.
3.  **Active HVAC Nameplate**: Swap between Goodman, Carrier, and Trane nameplate layouts to test OCR simulation parsing changes.
4.  **Audio & Haptic Simulation**: Incorporates simulated haptic buzz animations (screen shakes) and Web Audio synthesizer chimes for tactile feedback.

---

## ⌨️ Keyboard Shortcuts

Ensure focus is not inside an input box, then press:
*   `←` or `→` : Cycle through the three UI variants.
*   `S` : Instantly toggle the Sunlight (High-Contrast) theme.
*   `G` : Toggle Simulated Solar Glare on/off.
*   `L` : Trigger the simulated laser camera scan.
*   `R` : Reset input fields.
