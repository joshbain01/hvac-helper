import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourcePath = path.join(__dirname, '../tokens/design-tokens.json');
const outputJsonPath = path.join(__dirname, '../docs/design-tokens.json');
const outputCssDir = path.join(__dirname, '../docs/css');
const outputCssPath = path.join(outputCssDir, 'design-system.css');

// Ensure output directories exist
if (!fs.existsSync(outputCssDir)) {
  fs.mkdirSync(outputCssDir, { recursive: true });
}

// Read design tokens
const tokens = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

// 1. Write docs/design-tokens.json (manifest format)
fs.writeFileSync(outputJsonPath, JSON.stringify(tokens, null, 2), 'utf8');
console.log(`Generated manifest: ${outputJsonPath}`);

// 2. Generate CSS Variables
let css = `/* ==========================================================================
   Generated Design System CSS - DO NOT EDIT MANUALLY
   Source: tokens/design-tokens.json
   ========================================================================== */

:root {
  /* Typography */
  --font-family: ${tokens.typography['font-family']};
  --font-weight-regular: ${tokens.typography['font-weights'].regular};
  --font-weight-semibold: ${tokens.typography['font-weights'].semibold};
  --font-weight-bold: ${tokens.typography['font-weights'].bold};
  
  --text-xs: ${tokens.typography['font-sizes']['text-xs']};
  --text-sm: ${tokens.typography['font-sizes']['text-sm']};
  --text-base: ${tokens.typography['font-sizes']['text-base']};
  --text-lg: ${tokens.typography['font-sizes']['text-lg']};
  --text-xl: ${tokens.typography['font-sizes']['text-xl']};
  --text-2xl: ${tokens.typography['font-sizes']['text-2xl']};

  /* Spacing */
  --space-xs: ${tokens.spacing['space-xs']};
  --space-sm: ${tokens.spacing['space-sm']};
  --space-md: ${tokens.spacing['space-md']};
  --space-lg: ${tokens.spacing['space-lg']};
  --space-xl: ${tokens.spacing['space-xl']};
  --space-2xl: ${tokens.spacing['space-2xl']};
  --space-3xl: ${tokens.spacing['space-3xl']};

  /* Radius */
  --radius-sm: ${tokens.radius['radius-sm']};
  --radius-md: ${tokens.radius['radius-md']};
  --radius-lg: ${tokens.radius['radius-lg']};

  /* Transitions */
  --transition-fast: ${tokens.animations['transition-fast']};
  --transition-base: ${tokens.animations['transition-base']};

  /* Raw Color Palette */
`;

// Write raw color palette
for (const [key, value] of Object.entries(tokens.colors.palette)) {
  css += `  --palette-${key}: ${value};\n`;
}

css += `\n  /* Light Theme Semantic Tokens (Default) */\n`;
for (const [key, value] of Object.entries(tokens.colors.semantic.light)) {
  css += `  --${key}: ${value};\n`;
}
css += `}\n\n`;

// Dark Theme overrides
css += `/* Dark Theme */\n[data-theme="dark"] {\n`;
for (const [key, value] of Object.entries(tokens.colors.semantic.dark)) {
  css += `  --${key}: ${value};\n`;
}
css += `}\n\n`;

// Sunlight Theme overrides
css += `/* Sunlight/High-Contrast Theme (Accessibility override for outdoor use) */\n[data-theme="sunlight"] {\n`;
for (const [key, value] of Object.entries(tokens.colors.semantic.sunlight)) {
  css += `  --${key}: ${value};\n`;
}
css += `}\n\n`;

// System pref fallback if no theme set
css += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]):not([data-theme="sunlight"]) {\n`;
for (const [key, value] of Object.entries(tokens.colors.semantic.dark)) {
  css += `    --${key}: ${value};\n`;
}
css += `  }\n}\n`;

fs.writeFileSync(outputCssPath, css, 'utf8');
console.log(`Generated CSS design system: ${outputCssPath}`);
