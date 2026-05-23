# Issue Tracker (Local Markdown)

**Location**: `.scratch/`

Each issue is a standalone Markdown file named `<feature-or-task>.md`. The file contains:

```markdown
# Title of the issue

## Description

*What needs to be done, why, and any relevant context.*

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Labels
needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix
```

The `triage` skill reads these files, applies the label list from `docs/agents/triage-labels.md`, and moves the issue through the state machine by updating the `Labels` section. No external service is required.
