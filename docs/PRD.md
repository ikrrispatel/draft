# Draft — Product Requirements Document

## Overview

Draft is an execution-discipline engine that takes a raw AI micro-SaaS idea and forces it through a structured pipeline to produce a single-wedge, 3-feature MVP blueprint — complete with distribution alignment, feasibility scoring, and a 14-day launch plan. The output is a ready-to-execute document, not a brainstorm artifact.

The system is opinionated by design. It exists to eliminate the two dominant failure modes of solo AI builders: overbuilding (shipping 10 features when 1 would validate the thesis) and under-distributing (building in isolation with no acquisition plan). Draft enforces hard constraints at every stage and penalises violations deterministically.

---

## Target User

**Persona: The Solo AI Builder**

- Technical founder or senior developer building AI-powered SaaS products solo or with a tiny team (1–2 people).
- Has access to LLM APIs and can ship code quickly, but consistently fails to scope, launch, and acquire first customers within a tight timeframe.
- Typically has 3–5 ideas in various stages of half-built, none validated.
- Comfortable with CLI / web tools; does not need hand-holding on tech.
- Pain is not capability — it is discipline and prioritisation.

---

## Problem Statement

AI builders have near-zero marginal cost of building, which paradoxically causes failure:

1. **Overbuilding** — They add features before validating the core wedge. The MVP becomes a bloated prototype that never ships.
2. **Scope creep as comfort** — Building more feels productive; talking to users does not. The builder retreats into code.
3. **No distribution plan** — The product launches to zero users because acquisition strategy was never part of the build process.
4. **No kill criteria** — Without hard constraints, there is no forcing function to cut features, redefine scope, or abandon a non-viable idea early.

Existing tools (lean canvas templates, AI business generators, prompt chains) produce suggestions, not constraints. They generate options; Draft eliminates them.

---

## Core Promise

> Draft forces any AI SaaS idea into **one wedge** and an **execution-ready 3-feature MVP** with distribution alignment and feasibility scoring — in under 60 minutes.

---

## User Journey

```
Intake → Vision → Scope → Distribution → Architecture → QA → Scoring → Blueprint
```

### 1. Intake
User submits a raw idea via a structured form with the following canonical fields:
- `idea_summary` — Brief description of the idea (free text, 2–5 sentences)
- `problem_statement` — What problem does this solve? (free text)
- `target_buyer` — Structured object: `{role, industry, company_size}`
- `ai_component` — What AI/LLM capability powers this? (free text)
- `constraints` — Structured object: `{timeline_days, skill_level, budget}` (timeline_days defaults to 14)
- `existing_alternatives` — Array of current solutions the target buyer uses today

### 2. Vision Agent
Extracts a single-sentence wedge statement and identifies the Ideal Customer Profile (ICP). Rejects ambiguous or multi-wedge inputs.

### 3. Scope Agent
Produces exactly 3 MVP features aligned to the wedge. Generates a kill list of exactly 3 features that are explicitly excluded. Any deviation triggers a QA rerun.

### 4. Distribution Agent
Defines a first-10-customers acquisition plan and drafts a cold outreach message. Ensures the distribution channel aligns with the ICP.

### 5. Architecture Agent
Produces a minimal technical architecture: stack, data model, API surface. Scoped to the 3 features only — nothing more.

### 6. QA Agent
Validates cross-agent consistency. Checks for constraint violations (wedge count, feature count, kill list count). Triggers a maximum of one targeted rerun per agent if violations are found.

### 7. Scoring Agent
Applies deterministic scoring across four categories (see `SCORING.md`). Produces a numeric Execution Readiness score with per-category justification.

### 8. Blueprint Assembly
Compiles all agent outputs into a single Markdown document: the Draft Blueprint. Optionally exports to PDF.

---

## MVP Features (Must-Haves)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Structured Intake Form** | Collects `idea_summary`, `problem_statement`, `target_buyer`, `ai_component`, `constraints`, and `existing_alternatives`. Validates completeness before pipeline starts. |
| 2 | **Agent Pipeline Execution** | Runs the full 7-agent pipeline (Vision → Scope → Distribution → Architecture → QA → Scoring → Blueprint) with hard constraint enforcement at each stage. |
| 3 | **Blueprint Export** | Assembles and delivers a single Markdown document containing the wedge, 3 features, kill list, architecture, distribution plan, 14-day schedule, scoring, and outreach message. |

---

## Non-Goals (Explicitly Excluded)

These are intentionally out of scope for the MVP and must not be built:

1. **Code generation** — Draft produces a plan, not code. No scaffolding, boilerplate, or repo generation.
2. **Collaboration / multi-user** — Single-user only. No sharing, commenting, or team features.
3. **Idea database / history** — No persistent storage of past runs. Each run is stateless. Export is the persistence mechanism.

---

## Constraints and Guarantees

| Constraint | Rule | Enforcement |
|------------|------|-------------|
| Wedge count | Exactly 1 | Vision Agent output validated by QA Agent (`qa.wedge_is_single`). Violation triggers rerun of Vision. |
| MVP features | Exactly 3 | Scope Agent output validated by QA Agent. Violation sets Scope score to 40 and triggers rerun. |
| Kill list | Exactly 3 items | Scope Agent output validated by QA Agent. Violation triggers rerun. |
| Plan duration | `intake.constraints.timeline_days` max | Architecture Agent validates timeline. Overrun triggers scope reduction. |
| First-10 plan | Must be present | Distribution Agent output validated by QA Agent. Missing plan caps Distribution score at 60. |
| Outreach message | Must be present | Distribution Agent output validated by QA Agent. Missing message caps Distribution score at 60. |
| QA revision limit | 1 pass maximum | QA Agent may trigger at most one targeted rerun per agent. No cascading reruns. |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pipeline completion rate | ≥ 95% of valid intakes produce a blueprint | Count of completed runs / total valid intakes |
| Time to blueprint | ≤ 60 minutes for full pipeline | Wall-clock time from intake submission to blueprint delivery |
| Constraint compliance | 100% of blueprints satisfy all hard constraints | Automated validation on every output |
| User action rate | ≥ 40% of users take at least one action from the blueprint within 7 days | Follow-up survey or tracking pixel in outreach template |
| Scoring determinism | Identical inputs produce identical scores | Automated regression tests on scoring engine |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM non-determinism produces inconsistent outputs | Scoring varies across runs for the same input | Pin model versions; use temperature 0; deterministic scoring rules (not LLM-judged) |
| Users submit vague / unworkable ideas | Pipeline produces low-quality blueprints | Intake validation rejects incomplete submissions; Vision Agent flags "unclear wedge" and caps score |
| QA rerun loop does not converge | Pipeline stalls or produces contradictory outputs | Hard limit of 1 rerun per agent; accept degraded score rather than infinite loop |
| Builders ignore the blueprint | Zero real-world impact despite good output | Include specific, actionable first-10 plan with a ready-to-send outreach message |
| Scope creep in Draft itself | Draft becomes the thing it warns against | This PRD is the constraint document. Non-goals are enforced in code review. |

---

## Hackathon Differentiation

Draft is **not a prompt chain**. The differences:

| Dimension | Prompt Chain | Draft |
|-----------|-------------|-------|
| **Constraint enforcement** | None. Output is whatever the LLM says. | Hard constraints validated by QA Agent with deterministic rules. Violations trigger reruns or score penalties. |
| **Scoring** | Subjective or absent. | Deterministic, weighted, category-based scoring with documented rules and hard caps (see `SCORING.md`). |
| **Cross-agent consistency** | Each prompt is independent. | QA Agent validates consistency across all agent outputs. Conflicts reduce scores. |
| **Output format** | Varies. Often conversational prose. | Structured Markdown blueprint with fixed sections, ready for execution. |
| **Revision logic** | Re-run the whole chain or nothing. | Targeted reruns of specific agents only, with a hard cap of one revision pass. |
| **Distribution alignment** | Usually absent. | First-class concern: ICP-aligned distribution plan + outreach message required in every blueprint. |
| **Kill list** | Never generated. | Explicitly required. 3 features you must not build, surfaced in the blueprint. |

Draft's thesis: discipline is a system property, not a user virtue. The engine enforces it.
