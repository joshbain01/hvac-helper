# Agent + Skill Router

> **Purpose.** This file is loaded automatically at the start of every session in Claude Code, Antigravity, Cursor, and Windsurf. It tells the orchestrator and any activated agent **which skill or agent to call for what**, and just as importantly, **which ones to leave alone for this project**.
>
> If you are an agent reading this: you are part of a team. When you hit a domain outside your card below, **stop and surface that gap** — do not guess. The orchestrator will route to the right specialist.

---

## How to use this file

1. **Skills drive the process. Agents fill the seats.** Run a skill (`/grill-with-docs`, `/to-prd`, etc.) to structure the work. Inside a skill, activate the agent whose card matches the current question.
2. **One question at a time.** Never run more than 2 agents in parallel except during Phase 8 (adversarial review). Parallel design produces contradictions; serial design produces decisions.
3. **Triggers before titles.** Match on the **Trigger** column, not the agent's name. If no trigger matches, the right answer is usually "ask the user," not "pick the closest-sounding agent."
4. **Update this file when reality changes.** See [Update protocol](#update-protocol) at the bottom.

---

## Decision flow

```
Is the user describing a *process* (interview, restructure, debug, ship)?
  → YES: start with a SKILL from the table below.
  → NO:  is the user describing a *domain question* (firmware, sync model, database)?
         → YES: pick an AGENT from the table below.
         → NEITHER: just answer the user directly. Not every turn needs a tool.

Inside a skill, hit a domain question you can't answer?
  → Activate the matching agent. Don't extend the skill's reasoning past its boundary.

Inside an agent, hit a domain outside your card?
  → Stop. Tell the orchestrator: "this needs @agency-<other>." Don't guess.
```

---

## Skills (workflow primitives)

| Skill | When to call | Produces |
|---|---|---|
| `/grill-me` | You need to be interviewed on a plan or design with no code/PRD context | A clarified plan, in chat |
| `/grill-with-docs` | You need to be interviewed *and* have `CONTEXT.md` / ADRs updated as you answer | Updated `CONTEXT.md` + ADRs |
| `/to-prd` | You have enough context (CONTEXT.md, schema, ADRs) and want a synthesized PRD | `docs/prd-*.md` |
| `/to-issues` | You have a stable PRD and want vertical-slice issues for a tracker | GitHub/Linear issues |
| `/tdd` | You're implementing a feature or fixing a bug and want red-green-refactor discipline | Tests + code, committed in small slices |
| `/diagnose` | You have a reproducible bug or perf regression | Root cause + regression test |
| `/zoom-out` | You're lost in code or spec detail and need the system-level view | Higher-level explanation in chat |
| `/improve-codebase-architecture` | The codebase has drifted; you want refactor opportunities ranked | Prioritized refactor list |
| `/handoff` | Session is ending and another agent or human needs to continue | `docs/handoff-*.md` |
| `/caveman` | Token budget is tight; you want compressed output | Same content, ~75% fewer tokens |

---

## Agents (domain experts — scoped to this project)

The full agency has 147 agents across 12 divisions. The ones below are the core ones relevant to custom project builds. If a trigger doesn't match any card here, see [Anti-patterns](#anti-patterns) before reaching for the wider catalog.

### Engineering

| Agent | Trigger (call when…) | Stop and escalate when… |
|---|---|---|
| `/agency-embedded-firmware-engineer` | Decision touches hardware, microcontrollers (ESP32, STM32, ARM), sensors, displays, BLE/Wi-Fi low-level APIs, OTA updates, watchdog timers, deep sleep/power budgets | Question is about domain-specific physics or high-level business logic |
| `/agency-software-architect` | System-level decisions: design patterns, module boundaries, data flow, synchronization models, where calculations live | Question is implementation-specific in one layer (route to firmware/mobile/backend agent) |
| `/agency-backend-architect` | Cloud API, persistence layer, database schemas, API schemas (OpenAPI), idempotency, eventual consistency | Question is about client device behavior or local application code |
| `/agency-mobile-app-builder` | Mobile applications (iOS, Android, React Native), phone BLE integrations, offline data storage, client-side sync | Question is about cloud API architecture or device firmware |
| `/agency-ai-engineer` | LLM features (chat, classification, text embeddings), model selection, prompt engineering, RAG, eval harnesses, fallback logic | Question is about how output is stored (backend) or displayed (frontend/UX) |
| `/agency-security-engineer` | Secure boot, encryption, JWT/auth protocols, device provisioning, signature verification, communication security | General business compliance or policy posture (route to compliance-auditor) |
<!-- TODO: resolve slug -->
| `/agency-TODO-engineering-sre` | Cloud SLOs, error budgets, system observability, scaling, infrastructure capacity, CI/CD | Local developer machine debugging, device-side firmware reliability |
| `/agency-incident-response-commander` | Runbook design, on-call schedules, disaster recovery, live outage incident management | Pre-launch design questions (route to SRE or software-architect) |
| `/agency-code-reviewer` | Adversarial review of implementation specifications, code quality audits, test coverage validation | Domain-specific deep dives |
| `/agency-technical-writer` | Document formatting, style guide adherence, developer documentation, API references, long-form content review | Introducing original technical design decisions |

### Design

| Agent | Trigger | Stop and escalate when… |
|---|---|---|
| `/agency-ux-researcher` | Persona validation, user environment observations, physical use constraints (glove use, lighting, etc.) | Visual styles, UI components, or token specifications (route to ux-architect) |
| `/agency-ux-architect` | Design system structure, tokens, component variants, theme implementation | User operating/interaction testing (route to ux-researcher) |
| `/agency-accessibility-auditor` | Color contrast, accessibility compliance (WCAG), target sizes, screen reader tags, inclusive visual layout | Overall aesthetic style choices (route to ux-architect) |

### Product & Commercial

| Agent | Trigger | Stop and escalate when… |
|---|---|---|
| `/agency-product-manager` | Roadmapping, product lifecycle, GTM strategy, product success metrics | Drafting specific PRD sections (use `/grill-with-docs` + specialist instead) |
| `/agency-sprint-prioritizer` | Defining MVP scope, task prioritization, sprint planning | Product requirements are not yet reconciled |
| `/agency-feedback-synthesizer` | Validating feedback baselines, customer surveys, analyzing telemetry against goals | Customer data is non-existent (flag for user discovery work) |
| `/agency-trend-researcher` | Market sizing, competitor analysis, industry standards | Specific individual customer feedback (route to ux-researcher) |
<!-- TODO: resolve slug -->
| `/agency-TODO-finance-financial-analyst` | Cost of Goods Sold (COGS), Bill of Materials (BoM) pricing at scale, break-even analysis | Operational budgeting or forecasting (route to fpa-analyst) |
<!-- TODO: resolve slug -->
| `/agency-TODO-finance-fpa-analyst` | Financial forecasting, variance analysis, unit economics model sensitivity (e.g. API usage costs) | One-time cost modeling (route to financial-analyst) |
| `/agency-sales-engineer` | Technical sales enablement, demo design, technical objection handling, competitive battlecards | Cold outreach/prospecting (route to outbound-strategist) |
| `/agency-outbound-strategist` | ICP definition, outreach planning, client discovery | Demo or proof-of-concept design (route to sales-engineer) |

### Specialized & Testing

| Agent | Trigger | Stop and escalate when… |
|---|---|---|
| `/agency-compliance-auditor` | Data residency, privacy regulations (GDPR/HIPAA), retention policy, SOC 2 compliance posture | Implementation/cryptography questions (route to security-engineer) |
| `/agency-reality-checker` | Validation of project claims, reviewing phase gates, checking feasibility | Early ideation or loose brainstorming |

---

## Pairing rules

When a decision crosses a domain boundary, **both agents must be in the room**. These are the pairings that matter:

| Decision area | Required pairing |
|---|---|
| Hardware button / interface interaction | `embedded-firmware-engineer` + `ux-researcher` |
| LLM / AI integrations & compliance | `ai-engineer` + `compliance-auditor` |
| Data schema & sync models | `software-architect` + `backend-architect` |
| Device security & provisioning | `security-engineer` + `embedded-firmware-engineer` |
| Client-Server API interaction | `mobile-app-builder` + `backend-architect` |
| UI styling & access compliance | `ux-architect` + `accessibility-auditor` |
| Product pricing & value engineering | `financial-analyst` + `sales-engineer` |

---

## Routing by trigger (the lookup table)

| If the user says… | Route to… |
|---|---|
| "Define / clarify a term" | `/grill-with-docs` → relevant specialist |
| "Decide between two technical options" | Relevant specialist agent → write ADR |
| "What's the data model for X" | `software-architect` + `backend-architect` |
| "How will users interact with this" | `ux-researcher` |
| "Is this safe / secure / compliant" | `security-engineer` (technical) or `compliance-auditor` (policy) |
| "What does this cost to build" | `financial-analyst` |
| "What does this cost to run" | `fpa-analyst` |
| "Who buys/uses this and why" | `sales-outbound-strategist` (acquisition) or `sales-engineer` (conversion) |
| "Is this specification complete" | `reality-checker` |
| "I'm stuck and don't know what to do next" | `/zoom-out` |
| "I need to hand this off" | `/handoff` |

---

## Anti-patterns

Do not call these agents for core B2B developer products. They are great agents; they're just wrong for focused utility tools.

| Agent | Why not |
|---|---|
| `/agency-whimsy-injector` | High-utility, dead-simple tools require clarity. Adding delight here can introduce confusion. |
| Consumer/social marketing division (TikTok, Reddit, Xiaohongshu, Bilibili, Weibo, Low-level, etc.) | High-intent B2B target audience. Consumer social channels are rarely the motion. |
| Game development division | Irrelevant. |
| Spatial computing division | Irrelevant unless spatial overlays are explicitly requested in the roadmap. |
| Regional specialists (Korean Business, French Consulting, China Localization) | Revisit only when international expansion plans are active. |
| `/agency-visual-storyteller` | Marketing collateral, not product. Wrong phase. |
| `/agency-brand-guardian` | Focus on core utility and functional validation first before formal branding exercises. |
| `/agency-rapid-prototyper` | When specification rigor and stability are the primary goals, not fast throwaway hacks. |

---

## Domain gaps with no agent

Be honest about these. No agent in the roster covers them:

| Gap | What to do |
|---|---|
| **Deep domain physics/math formulas** (custom thermodynamics, chemistry, specific engineering equations) | Flag for human SME review. Do not let any agent guess or author these formulas. |
| **Real-world user behavior in extreme conditions** | `ux-researcher` can structure questions, but answers require real operator interviews. |
| **Real manufacturer or supplier pricing** | `financial-analyst` can estimate ranges; real numbers require sourcing quotes. |
| **Industry-specific localized regulations** (e.g. EPA, local environmental laws) | Not in `compliance-auditor`'s default scope. Flag and source expert human counsel. |

---

## Update protocol

This router is the source of truth for "who do we call." Keep it accurate:

1. **Adding a new agent.** Only after it's been used successfully twice in this project. Add a row to the relevant section with a concrete trigger and a concrete escalation rule.
2. **Retiring an agent.** If we've gone four weeks without invoking it, move it to a "deprecated" section at the bottom.
3. **Changing a pairing rule.** Pairings change when we discover a new boundary failure.
4. **Updating triggers.** Triggers should get *more specific* over time, never more generic.

---

## Phase map (where each tool gets used in the project lifecycle)

| Phase | Skill | Agents |
|---|---|---|
| 0. Persona reality check | (none — direct agent call) | `ux-researcher` |
| 1. CONTEXT.md | `/grill-with-docs` | Relevant domain engineering specialists for definitions |
| 2. Core schemas | `/grill-me` | `software-architect` + `backend-architect` |
| 3. Reconcile contradictions | `/grill-with-docs` | Pairings per the rules above |
| 4. Architectural decisions (ADRs) | `/grill-with-docs` | One agent per ADR |
| 5. Design system split | (file move) | `ux-architect` + `accessibility-auditor` |
| 6. Unit economics + GTM | (direct agent call) | `financial-analyst`, `sales-engineer`, `sales-outbound-strategist` |
| 7. Specification synthesis | `/to-prd` | `technical-writer` for the final pass |
| 8. Adversarial review | (direct agent call) | `code-reviewer`, `security-engineer`, `sre`, `incident-response-commander`, `reality-checker`, `compliance-auditor`, `fpa-analyst`, `sprint-prioritizer` |
| 9. Handoff | `/handoff` | (none) |

---

*Last updated: 2026-05-22. Owner: product. When in doubt, ask before invoking.*
