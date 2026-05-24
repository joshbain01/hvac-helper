# Target Pricing & Tiered SaaS Monetization Modeling

## Type
HITL

## Assigned Agents
- `/agency-finance-tracker` (sensitivity analysis modeling)
- `/agency-product-manager` (Teams subscription features definition)

## Reference Docs
- [go-to-market-v0.md - Section 2 (Hybrid SaaS Model)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L72)
- [unit-economics-v0.md - Section 5 & 6 (Sensitivity & Break-Even)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/unit-economics-v0.md#L80)

## Prototype Lessons & Context
Model SaaS offsets for cloud fallback. Ensure cloud token costs from legacy devices (modeled in Scenario B of [unit-economics-v0.md](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/unit-economics-v0.md#L80)) are offset by the $19/user/month subscription.

This task is validated by the planned [Tiered SaaS & Pricing Sensitivity Model](file:///c:/Users/joshu/projects/hvac-helper-tool/prototype/README.md#7-planned-tiered-saas--pricing-sensitivity-model-logic-prototype) (`prototype/logic-pricing`) prototype.

## What to build
Refine the unit economics spreadsheet. Model break-even sensitivity across direct DTC, Amazon FBA, and distributor channels. Define the features for the $19/user/month Teams subscription (reporting, fleet dashboards, legacy cloud LLM fallback) and model revenue projections.

## Acceptance criteria
- [ ] Financial model spreadsheet is updated with co-op distributor deductions and packaging COGS.
- [ ] Features list for the Teams SaaS subscription is finalized, and Stripe/App Store payment flows are mapped.
- [ ] Operating margin is verified under Scenario B ($10.00 variable lifetime support cost per unit).

## Blocked by
None - can start immediately

## User stories covered
N/A (Business modeling)

## Testing Guidance

### Unit Testing
- **Billing Math**: Test pricing tier logic and tax calculators in isolation.
- **Subscription States**: Test transitions between active, trial, and delinquent account statuses.

### Baseline Testing (Regression Prevention)
- **Performance & Latency Baseline**:
  - Record latency of subscription processing API calls.
- **Behavioral & Data Baseline**:
  - Freeze pricing models.

### Integration & Manual Verification
- **Billing Sync**: Simulate tier upgrade/downgrade and verify billing database updates.
- **Invoice Rendering**: Generate custom invoices and confirm pricing calculations are correct.

## Definition of Done (DoD)
- [ ] **Pricing Approval**: Executive team signs off on pricing models.
- [ ] **Unit Tests**: Calculation modules verify within 100% precision.
- [ ] **Payment Sandbox**: Subscriptions, upgrades, and cancellations pass sandbox verification.
