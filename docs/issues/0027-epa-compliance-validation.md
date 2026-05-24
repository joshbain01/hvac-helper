# EPA Section 608 Compliance & Record-Keeping Validation

## Type
HITL

## Assigned Agents
- `/agency-compliance-auditor` (EPA guidelines review)
- `/agency-legal-compliance-checker` (regulatory audit logs validation)

## Reference Docs
- [go-to-market-v0.md - Section 5 (EPA Compliance Definitions)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/go-to-market-v0.md#L201)
- [snapshot-schema.md - Section 2 (EPA Section 608 fields)](file:///c:/Users/joshu/projects/hvac-helper-tool/docs/snapshot-schema.md#L107)

## Prototype Lessons & Context
Validation confirms whether storing calculated Superheat/Subcooling and dialed-in saturation values meets environmental documentation requirements, rather than raw PSI values.

## What to build
Consult with HVAC environmental compliance legal experts to validate whether the digital records captured by the system (dialed-in saturation temperatures and clamp probe temperatures) satisfy EPA Section 608 guidelines for leak verification and record-keeping.

## Acceptance criteria
- [ ] Written legal/compliance brief is obtained validating the data schema.
- [ ] 3-year snapshot retention and revision log policies are confirmed to satisfy CCPA/CPRA and state EPA contractor laws.
- [ ] If specific PSI/Bar data is legally required, changes are drafted for the SQLite schema and BLE payload.

## Blocked by
None - can start immediately

## User stories covered
N/A (Compliance validation)
