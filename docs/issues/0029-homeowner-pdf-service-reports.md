# Homeowner PDF Service Report Layouts

## Type
AFK

## Assigned Agents
- `/agency-mobile-app-builder` (PDF layout implementation, sharing integration)
- `/agency-ux-architect` (design theme, spacing, and infographic assets)

## Reference Docs
- [PRD.md - Section 6.3 & 10.2 (Mobile App & SaaS subscription)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/PRD.md#L135-L151)
- [design-system.md - Mobile Application Design System](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/design-system.md)

## Prototype Lessons & Context
Review the Homeowner PDF design themes tested in the planned [Homeowner PDF Service Report Layouts](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#8-planned-homeowner-pdf-service-report-layouts-ui-prototype) (`prototype/ui-service-reports`) UI prototype. The report must clearly present service outcomes under harsh glare and maintain high customer "wow" appeal.

## What to build
Build the client-side PDF document generation engine inside the mobile application. The engine should compile finalized snapshot measurements, calculations (Delta T, Superheat, Subcooling), expanded work description notes, and service tag photos into a clean, professional PDF file that can be texted or emailed to homeowners.

## Acceptance criteria
- [ ] Implement client-side PDF compilation library to generate documents offline.
- [ ] PDF renders three selectable layout themes: color-coded infographic, technical/compliance ledger, and simple work card.
- [ ] Infographic layout displays before-to-after thermodynamic Performance Deltas using clear graphic arrows (red/green) and simple descriptions.
- [ ] Technical layout includes EPA Section 608 audit compliance logs (cylinder IDs, recovery weights, tech license).
- [ ] Layout matches spacing, typography, and color palettes defined in `design-system.md`.
- [ ] Share sheet trigger is integrated, allowing technicians to text, email, or print the generated PDF.

## Blocked by
[0010-mobile-background-sync-worker.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/issues/0010-mobile-background-sync-worker.md)

## User stories covered
User Story 13 (Finalize and Submit Completed Repairs - reporting)

## Testing Guidance

### Unit Testing
- **Layout Component Styling**: Validate page margins, dynamic grids, and fonts in isolation.
- **Data Binding**: Verify data integration mapping from snapshot models to layouts.
- **File Exporter**: Test image layout conversion parameters.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record memory footprint during pdf generation.
  - Track PDF file size limits.
- **Behavioral & Data Baseline**:
  - Freeze sample homeowner reports.

### Integration & Manual Verification
- **Device Scaling**: Render the PDF report, verifying it scales and prints properly.
- **Visual Appeal**: Review PDF presentation formatting under mock lighting.

## Definition of Done (DoD)
- [ ] **Visual Clarity**: PDF layout formats check out and render clearly on multiple resolutions.
- [ ] **Unit Tests**: Rendering, bindings, and formatting suites pass.
- [ ] **Accessibility Gate**: Text contrast and fonts are verified for high visibility.
