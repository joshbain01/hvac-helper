# Distributor Discount & Supply Counter Agreements

## Type
HITL

## Assigned Agents
- `/agency-outbound-strategist` (partnership contacts and terms negotiation)
- `/agency-sales-engineer` (technical counter-day presentation design)

## Reference Docs
- [go-to-market-v0.md - Section 1 & 5 (Wholesale Distributors & Research)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L29)
- [unit-economics-v0.md - Section 6 (Wholesale Margins & Break-Even)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/unit-economics-v0.md#L95)

## Prototype Lessons & Context
Review the Counter display needs. The physical device placed on supply counters will run in a self-contained "Demo Mode" as simulated in the TUI [index.js](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state/index.js).

This task is validated by the existing [Logic State Simulator](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/logic-state) prototype.

## What to build
Reach out to wholesale HVAC distributors (Ferguson, Johnstone Supply) to negotiate distribution agreements. Validate discount rates (target 30% off MSRP), inventory buy-back policies, co-op advertising fee deductions, and design physical supply counter cardboard display packaging.

## Acceptance criteria
- [ ] Distribution terms sheet is drafted targeting a wholesale ASP of $279.30 (30% discount off MSRP).
- [ ] Inventory buy-back clause (unsold stock after 180 days) is negotiated and terms are finalized.
- [ ] Co-op advertising fee allowance (e.g. 2-5% of sales) is integrated into unit margins spreadsheet.
- [ ] Counter Display cardboard box layout is designed, featuring a secure mounting stand for the demo unit and app download QR code.

## Blocked by
None - can start immediately

## User stories covered
N/A (Go-To-Market)

## Testing Guidance

### Unit Testing
- **Commission Calculations**: Validate distributor discount/tiered pricing logic algorithms.
- **Contract Workflows**: Verify state transitions of agreement signing steps.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record pricing model elasticity bounds.
  - Establish transaction duration targets.
- **Behavioral & Data Baseline**:
  - Freeze draft agreements to detect version drift.

### Integration & Manual Verification
- **Legal Review**: Complete manual legal reviews with distributor agreement templates.
- **Approval Check**: Verify that counter agreements trigger correct product allocations.

## Definition of Done (DoD)
- [ ] **Agreement Approval**: Distributor agreement is signed and approved.
- [ ] **Unit Tests**: Financial calculation modules verify within bounds.
- [ ] **Compliance Signoff**: The contract complies with legal standards.
