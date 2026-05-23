# HVAC Helper Pro - Mobile App Design System

This design system establishes the visual language, component library, and interaction specifications for the HVAC Helper Pro mobile application. It is optimized for field use by HVAC technicians working in demanding environments.

---

## 1. Token Architecture & Build Pipeline

To eliminate manual maintenance and prevent drift, all design tokens are defined in a canonical source of truth JSON file and compiled into platform-specific assets.

*   **Canonical Source**: [tokens/design-tokens.json](file:///c:/Users/joshu/projects/hvac-helper-tool/tokens/design-tokens.json)
*   **Compiler Script**: [scripts/generate-tokens.js](file:///c:/Users/joshu/projects/hvac-helper-tool/scripts/generate-tokens.js)
*   **Compiled Assets**:
    *   JSON Manifest: [docs/design-tokens.json](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/design-tokens.json) (for Javascript/React Native imports)
    *   CSS Variables: [docs/css/design-system.css](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/css/design-system.css) (for web/stylesheet consumption)

### Custom Build Step
To regenerate the tokens and CSS variables after modifying the source JSON, run:
```bash
node scripts/generate-tokens.js
```

---

## 2. Visual Language Guidelines

### Color Palette (Raw Tokens)
The raw color palette provides a range of weights to support light, dark, and high-contrast outdoor (sunlight) modes.

| Color | Hex Code | Token |
|---|---|---|
| **Primary Blue** | `#0044CC` | `var(--palette-blue-700)` |
| **Accent Orange** | `#FF7F00` | `var(--palette-orange-500)` |
| **Success Green** | `#28A745` | `var(--palette-green-500)` |
| **Warning Amber** | `#FFC107` | `var(--palette-yellow-500)` |
| **Error Red** | `#DC3545` | `var(--palette-red-500)` |

### Typography Scale
*   **Font Family**: `var(--font-family)` (Inter, Sans-serif)
*   **Scale**:
    *   `var(--text-2xl)`: 32px (Page Titles / H1)
    *   `var(--text-xl)`: 24px (Section Headings / H2)
    *   `var(--text-lg)`: 20px (Card Titles / H3)
    *   `var(--text-base)`: 16px (Body Text / Labels)
    *   `var(--text-sm)`: 14px (Secondary Text / Captions)
    *   `var(--text-xs)`: 12px (Small Metadata / Micro-labels)

### Spacing System (8-Point Grid)
Layout elements must only use values from the spacing scale to ensure vertical and horizontal rhythm.
*   `var(--space-xs)`: 4px
*   `var(--space-sm)`: 8px
*   `var(--space-md)`: 12px
*   `var(--space-lg)`: 16px
*   `var(--space-xl)`: 24px
*   `var(--space-2xl)`: 32px
*   `var(--space-3xl)`: 48px

---

## 3. Semantic Token Mappings

Components must never use raw palette variables directly. Instead, they reference semantic tokens, which automatically update when the application's theme switches.

### Theme Modes

```css
/* Core Semantic Colors (Mapped per theme in docs/css/design-system.css) */
:root {
  /* Light Theme Mappings (Default) */
  --color-bg-main: var(--palette-gray-100);
  --color-bg-surface: var(--palette-white);
  --color-text-primary: var(--palette-gray-900);
  --color-text-secondary: var(--palette-gray-600);
  --color-primary: var(--palette-blue-700);
  --color-primary-hover: var(--palette-blue-900);
  --color-accent: var(--palette-orange-700);
  --color-success: var(--palette-green-700);
  --color-success-bg: var(--palette-green-50);
  --color-warning: var(--palette-yellow-900);
  --color-warning-bg: var(--palette-yellow-50);
  --color-error: var(--palette-red-700);
  --color-error-bg: var(--palette-red-50);
  --color-border: var(--palette-gray-200);
}

[data-theme="dark"] {
  /* Dark Theme Mappings */
  --color-bg-main: var(--palette-gray-900);
  --color-bg-surface: var(--palette-gray-800);
  --color-text-primary: var(--palette-white);
  --color-text-secondary: var(--palette-gray-400);
  --color-primary: var(--palette-blue-500);
  --color-primary-hover: var(--palette-blue-700);
  --color-accent: var(--palette-orange-500);
  --color-success: var(--palette-green-500);
  --color-success-bg: var(--palette-green-900);
  --color-warning: var(--palette-yellow-500);
  --color-warning-bg: var(--palette-yellow-900);
  --color-error: var(--palette-red-500);
  --color-error-bg: var(--palette-red-900);
  --color-border: var(--palette-gray-600);
}

[data-theme="sunlight"] {
  /* High-Contrast Sunlight Theme Mappings */
  --color-bg-main: var(--palette-white);
  --color-bg-surface: var(--palette-white);
  --color-text-primary: var(--palette-gray-900);
  --color-text-secondary: var(--palette-gray-900);
  --color-primary: var(--palette-blue-900);
  --color-primary-hover: var(--palette-blue-900);
  --color-accent: var(--palette-orange-900);
  --color-success: var(--palette-green-900);
  --color-success-bg: var(--palette-green-50);
  --color-warning: var(--palette-yellow-900);
  --color-warning-bg: var(--palette-yellow-50);
  --color-error: var(--palette-red-900);
  --color-error-bg: var(--palette-red-50);
  --color-border: var(--palette-gray-900);
}
```

---

## 4. Component Library Implementation Spec

All component styles are fully implemented in CSS using the semantic custom properties defined above.

### A. Buttons

```css
/* Base Button Styling */
.btn {
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-lg) var(--space-xl);
  border-radius: var(--radius-md);
  border: 2px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
}

.btn:active {
  transform: scale(0.98);
}

.btn:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

/* Primary Variant */
.btn--primary {
  background-color: var(--color-primary);
  color: var(--palette-white);
}

.btn--primary:hover {
  background-color: var(--color-primary-hover);
}

.btn--primary:disabled {
  background-color: var(--color-border);
  color: var(--color-text-secondary);
  cursor: not-allowed;
  transform: none;
}

/* Secondary (Outlined) Variant */
.btn--secondary {
  background-color: transparent;
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn--secondary:hover {
  background-color: var(--color-primary-bg-hover, rgba(0, 68, 204, 0.08));
}

/* Danger Variant */
.btn--danger {
  background-color: var(--color-error);
  color: var(--palette-white);
}

.btn--danger:hover {
  background-color: var(--palette-red-900);
}
```

### B. LED Status Badge (Multi-sensory Indicators)

Status badges use a combination of border-styles, animations, and color to display transmission and sync progress clearly.

```css
.led-indicator {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  border: 2px solid transparent;
}

/* Confirmed State (Green) */
.led-indicator--green {
  background-color: var(--color-success);
  border-color: var(--palette-white);
  box-shadow: 0 0 4px var(--color-success);
}

/* Transmitting / Retry State (Amber / Pulse) */
.led-indicator--amber {
  background-color: var(--color-warning);
  border-color: var(--palette-white);
  box-shadow: 0 0 4px var(--color-warning);
  animation: pulse-breathing 1.5s infinite ease-in-out;
}

/* Failure State (Red / Fast Flash) */
.led-indicator--red {
  background-color: var(--color-error);
  border-color: var(--palette-white);
  box-shadow: 0 0 6px var(--color-error);
  animation: flash-rapid 0.5s infinite steps(2);
}

/* Animations */
@keyframes pulse-breathing {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes flash-rapid {
  0% { opacity: 0.2; }
  100% { opacity: 1; }
}
```

### C. Snapshot Card

```css
.snapshot-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: box-shadow var(--transition-base), border-color var(--transition-base);
}

.snapshot-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-color: var(--color-primary);
}

.snapshot-card:focus-within {
  border-color: var(--color-accent);
  outline: none;
}
```

### D. Theme Selector

```css
.theme-toggle {
  display: inline-flex;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  padding: 4px;
  gap: 4px;
}

.theme-toggle-option {
  padding: var(--space-sm) var(--space-lg);
  border-radius: 20px;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.theme-toggle-option.active {
  background-color: var(--color-primary);
  color: var(--palette-white);
}
```

### E. Floating Action Button (FAB)

```css
.btn-fab {
  position: fixed;
  bottom: var(--space-2xl);
  right: var(--space-2xl);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: var(--palette-white);
  border: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  transition: background-color var(--transition-fast), transform var(--transition-fast);
  z-index: 100;
}

.btn-fab:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-2px);
}

.btn-fab:active {
  transform: translateY(0) scale(0.95);
}
```

---

## 5. Theme Management System

The client application initiates theme state dynamically based on user setting or OS-level preference.

```javascript
class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.applyTheme(this.currentTheme);
    this.initializeToggle();
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  getStoredTheme() {
    return localStorage.getItem('hvac_theme');
  }

  applyTheme(theme) {
    // Remove current theme override
    document.documentElement.removeAttribute('data-theme');
    
    if (theme === 'system') {
      localStorage.setItem('hvac_theme', 'system');
      const systemTheme = this.getSystemTheme();
      document.documentElement.setAttribute('data-theme', systemTheme);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('hvac_theme', theme);
    }
    
    this.currentTheme = theme;
    this.updateToggleUI();
  }

  initializeToggle() {
    document.addEventListener('click', (e) => {
      const option = e.target.closest('.theme-toggle-option');
      if (option) {
        const selectedTheme = option.dataset.theme;
        this.applyTheme(selectedTheme);
      }
    });
  }

  updateToggleUI() {
    const options = document.querySelectorAll('.theme-toggle-option');
    options.forEach(option => {
      const isActive = option.dataset.theme === this.currentTheme;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
```

---

## 6. Verification and Reduced Motion

### Motion Sensitivity
For users who request reduced motion, all animations are compiled to instant transitions:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-delay: -1ms !important;
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    background-transition: none !important;
    transition-duration: 0s !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Accessibility Audit Report

**Audit Standards**: WCAG 2.2 Level AA / AAA
**Context**: Handheld use in residential/commercial settings, direct sunlight, work glove operation, IP-54 handheld device companion app.

### 🚨 Critical Review Findings & Required Remediations

#### A. Sunlight Contrast Analysis
*   **Issue**: Standard WCAG AA contrast (4.5:1) is unusable under outdoor solar glare (10,000+ nits) on standard LCD screens (300-500 nits). Colors like success green (`#28A745`) and warning amber (`#FFC107`) on light backgrounds fall below readable thresholds under glare.
*   **Remediation**:
    1.  **Sunlight Theme Mode**: Implement a dedicated high-contrast `sunlight` theme. It utilizes a pure black (`#000000`) on white (`#FFFFFF`) palette, providing a **21:1 contrast ratio** for the interface.
    2.  **Color Adjustments**: Semantic text colors are modified to guarantee contrast in the light/dark themes:
        *   **Light Theme Success Text**: Darkened from `#28A745` (3.1:1) to `#144820` (**8.4:1 contrast**).
        *   **Light Theme Warning Text**: Changed from `#FFC107` (1.3:1) to `#664D03` (**8.9:1 contrast**).
        *   **Light Theme Error Text**: Changed from `#DC3545` (4.5:1) to `#721C24` (**9.4:1 contrast**).
    3.  **UI Borders**: All buttons and card surfaces must have a minimum `2px` solid border (`var(--color-border)`) in sunlight mode to keep outlines sharp.

#### B. Touch Target Audit for Work Gloves
*   **Issue**: Standard mobile touch targets (44px to 48px) are too small for users wearing utility gloves, leading to mis-taps.
*   **Remediation**:
    1.  **Target Upsizing**: Set min height and width of all primary screen triggers (e.g., Return Air, Supply Air, submit action, camera capture) to **64px** (`var(--space-3xl)` or equivalent).
    2.  **Target Spacing**: Increase the spacing gutter between interactive buttons to a minimum of **16px** (`var(--space-lg)`) to prevent accidental double-taps of adjacent components.
    3.  **Layout Padding**: Enforce `16px` padding around layout margins to prevent controls from sitting too close to bezel edges.

#### C. Colorblind LED Accessibility
*   **Issue**: Relying on green/amber/red colors to represent Bluetooth sync states fails for red-green colorblind technicians (deuteranopia/protanopia).
*   **Remediation**:
    1.  **Multi-sensory Feedback**:
        *   **Haptic Signals**: Implement physical vibrations via the device's Haptic API:
            *   *Success (Green)*: Short, single haptic tap (100ms).
            *   *Transmitting (Amber)*: Light vibrating pattern.
            *   *Failure (Red)*: Double sharp haptic pulse (200ms x2).
        *   **Icon Pairings**: In the UI, colors are always accompanied by icons and descriptive text labels (e.g., `✔ Sent`, `⟳ Sending...`, `✘ Failed`).
    2.  **Flashing Patterns**: The hardware LEDs must blink using distinct frequencies and duty cycles:
        *   *Confirmed (Green)*: Solid ON.
        *   *Transmitting (Amber)*: Slow breathing pulse (1 Hz).
        *   *Failure (Red)*: Rapid stroboscopic flash (4 Hz).
    3.  **App UI Borders**: The active border style of the measurement elements represents state:
        *   *Confirmed*: Thick solid border.
        *   *Transmitting*: Animated dashed border.
        *   *Failure*: Double-thickness border.
