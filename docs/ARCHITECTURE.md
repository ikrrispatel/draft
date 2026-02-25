# Draft — Technical Architecture

## System Overview

Draft is a deterministic, multi-agent pipeline that transforms a raw AI micro-SaaS idea into a constrained, scored, execution-ready blueprint. The system is stateless per run: intake in, blueprint out, nothing persisted.

The pipeline is sequential. Each agent reads from and writes to a shared state object. A QA agent validates cross-agent consistency after all primary agents have run, and may trigger at most one targeted rerun per agent. A scoring agent applies deterministic rules to produce a numeric Execution Readiness score. Finally, a blueprint assembler compiles the shared state into a Markdown document.

---

## Agent Pipeline Flow

```
┌─────────┐    ┌─────────┐    ┌──────────────┐    ┌──────────────┐
│  Intake  │───▶│ Vision  │───▶│    Scope     │───▶│ Distribution │
│  (Form)  │    │  Agent  │    │    Agent     │    │    Agent     │
└─────────┘    └─────────┘    └──────────────┘    └──────────────┘
                                                          │
                                                          ▼
┌───────────┐    ┌─────────┐    ┌─────────┐    ┌──────────────┐
│ Blueprint │◀───│ Scoring │◀───│   QA    │◀───│ Architecture │
│ Assembly  │    │  Agent  │    │  Agent  │    │    Agent     │
└───────────┘    └─────────┘    └─────────┘    └──────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ Targeted Rerun   │
                          │ (max 1 per agent)│
                          └──────────────────┘
```

**Pipeline stages in order:**

1. **Intake** — User-submitted structured input (not an agent; form validation only).
2. **Vision Agent** — Extracts wedge statement and ICP.
3. **Scope Agent** — Produces 3 features and 3 kill-list items.
4. **Distribution Agent** — Produces first-10 plan and outreach message.
5. **Architecture Agent** — Produces minimal tech architecture for the 3 features.
6. **QA Agent** — Validates cross-agent consistency and constraint compliance.
7. **Scoring Agent** — Applies deterministic scoring rules (see `SCORING.md`).
8. **Blueprint Assembly** — Compiles shared state into final Markdown output.

---

## Shared State Object

All agents read from and write to a single shared state object. This is the only inter-agent communication mechanism.

```json
{
  "intake": {
    "idea_summary": "AI-powered cold email personaliser for SDRs",
    "problem_statement": "SDRs spend 10+ minutes per prospect manually researching and writing personalised openers",
    "target_buyer": {
      "role": "SDR",
      "industry": "B2B SaaS",
      "company_size": "10-50 employees"
    },
    "ai_component": "GPT-4o generates personalised email opening lines from scraped LinkedIn profile data",
    "constraints": {
      "timeline_days": 14,
      "skill_level": "advanced",
      "budget": "low"
    },
    "existing_alternatives": ["Lemlist", "Instantly", "Manual research"]
  },
  "vision": {
    "wedge_statement": "Automated prospect research → personalised first line, delivered as a Chrome extension for LinkedIn",
    "icp": {
      "role": "SDR",
      "industry": "B2B SaaS",
      "company_size": "10-50 employees",
      "behavior_qualifier": "Sends 50+ cold emails per day",
      "pain_trigger_event": "Hired into a new SDR role with high outbound targets and no tooling budget"
    }
  },
  "scope": {
    "features": [
      {
        "name": "LinkedIn Profile Scraper",
        "description": "Chrome extension extracts prospect data from LinkedIn profile page",
        "rationale": "Core data input for personalisation"
      },
      {
        "name": "First-Line Generator",
        "description": "GPT-4o generates a personalised email opening line from scraped data",
        "rationale": "Core value proposition — the wedge"
      },
      {
        "name": "Copy-to-Clipboard Export",
        "description": "One-click copy of generated line, formatted for paste into email client",
        "rationale": "Minimal viable output mechanism"
      }
    ],
    "kill_list": [
      "Full email body generation",
      "CRM integration",
      "Email sending / SMTP"
    ]
  },
  "distribution": {
    "first_10_plan": {
      "channel": "LinkedIn DMs to SDRs in target startups",
      "strategy": "Identify 30 prospects, DM 10/day for 3 days, offer free 7-day trial",
      "timeline": "Days 12–14 of the 14-day plan"
    },
    "outreach_message": "Hey {first_name}, I built a Chrome extension that writes personalised cold email openers from LinkedIn profiles in one click. Would you try it free for a week? Takes 30 seconds to install.",
    "channel_icp_alignment": "SDRs are active on LinkedIn; DMs are the native outreach channel for this ICP"
  },
  "architecture": {
    "stack": ["Chrome Extension (Manifest V3)", "FastAPI backend", "GPT-4o API", "Supabase (auth + usage tracking)"],
    "data_model": {
      "tables": ["users", "generations"],
      "description": "users: auth + subscription status. generations: prospect_url, generated_line, timestamp."
    },
    "api_surface": [
      "POST /generate — accepts prospect data, returns personalised line",
      "GET /usage — returns generation count for current user"
    ],
    "fourteen_day_plan": [
      "Days 1–3: Chrome extension scaffold + LinkedIn scraper",
      "Days 4–7: Backend API + GPT-4o integration",
      "Days 8–10: End-to-end testing + copy-to-clipboard UX",
      "Days 11: Landing page + Chrome Web Store listing",
      "Days 12–14: Outreach to first 10 customers"
    ]
  },
  "qa": {
    "wedge_is_single": true,
    "violations": [],
    "conflicts": [],
    "revision_requests": [],
    "reruns_triggered": [],
    "pass": true
  },
  "scores": {
    "vision_clarity": null,
    "scope_discipline": null,
    "feasibility": null,
    "distribution_readiness": null,
    "overall": null,
    "explanations": {}
  },
  "blueprint_md": ""
}
```

---

## Agent Responsibilities

| Agent | Input | Output | Boundary |
|-------|-------|--------|----------|
| **Vision** | `intake` | `vision` | Produces exactly 1 wedge statement and 1 structured ICP (`role`, `industry`, `company_size`, `behavior_qualifier`, `pain_trigger_event`). Does not define features, architecture, or distribution. |
| **Scope** | `intake`, `vision` | `scope` | Produces exactly 3 features and exactly 3 kill-list items. Does not define technical implementation or distribution. |
| **Distribution** | `intake`, `vision`, `scope` | `distribution` | Produces first-10 plan and outreach message. Does not alter features or architecture. |
| **Architecture** | `intake`, `vision`, `scope` | `architecture` | Produces stack, data model, API surface, and timeline plan scoped to the 3 features and `intake.constraints.timeline_days`. Does not define new features. |
| **QA** | Full shared state | `qa` | Validates constraints (including `qa.wedge_is_single`) and cross-agent consistency. May trigger reruns but does not modify other agents' outputs directly. |
| **Scoring** | Full shared state | `scores` | Applies deterministic scoring rules. Does not modify any agent's output. |

---

## Hard Constraint Enforcement Rules

| Constraint | Where Enforced | Violation Response |
|------------|---------------|--------------------|
| Exactly 1 wedge | QA Agent sets `qa.wedge_is_single` | Triggers rerun of Vision Agent (max 1). If still violated after rerun, Vision score capped at 50. |
| Exactly 3 features | QA Agent validates `len(scope.features) == 3` | Sets Scope score to 40. Triggers rerun of Scope Agent (max 1). |
| Exactly 3 kill-list items | QA Agent validates `len(scope.kill_list) == 3` | Triggers rerun of Scope Agent (max 1). |
| Timeline plan maximum | QA Agent validates `architecture.fourteen_day_plan` fits within `intake.constraints.timeline_days` | Triggers rerun of Architecture Agent to compress timeline. |
| First-10 plan present | QA Agent validates `distribution.first_10_plan` is non-null and non-empty | Caps Distribution score at 60. Triggers rerun of Distribution Agent (max 1). |
| Outreach message present | QA Agent validates `distribution.outreach_message` is non-null and non-empty | Caps Distribution score at 60. Triggers rerun of Distribution Agent (max 1). |
| ICP present | QA Agent validates `vision.icp.role` is non-null and non-empty | Caps overall score at 60. Triggers rerun of Vision Agent (max 1). |

---

## QA Revision Loop Logic

```
QA Agent receives full shared state
    │
    ├── Check all hard constraints (table above)
    │
    ├── Check cross-agent consistency:
    │     • Do the 3 features align with the wedge?
    │     • Does the architecture cover all 3 features and nothing more?
    │     • Does the distribution channel match the ICP (`vision.icp.role`, `vision.icp.industry`)?
    │     • Does the timeline plan fit `intake.constraints.timeline_days`?
    │
    ├── Record violations and conflicts in qa.violations / qa.conflicts
    │
    ├── For each violation:
    │     • Trigger targeted rerun of the responsible agent (max 1 rerun per agent)
    │     • Do NOT rerun agents that passed
    │     • Do NOT cascade (a rerun does not trigger another QA pass)
    │
    └── After reruns complete:
          • Re-validate only the rerun agents' outputs
          • If still violated, accept the degraded score — do not loop again
          • Set qa.pass = true if no violations remain, false otherwise
```

**Hard rule:** The QA loop executes at most **twice** total (initial pass + one rerun cycle). No infinite loops, no cascading.

---

## Error Handling Strategy

### Invalid JSON from Agent

- **Detection:** JSON parse failure on agent output.
- **Response:** Retry the agent call once with an explicit "respond in valid JSON only" instruction appended to the prompt.
- **Fallback:** If retry also fails, log the error, set the agent's section in shared state to `null`, and cap the corresponding score category at 0.

### Schema Mismatch

- **Detection:** Agent output parses as JSON but does not match the expected schema (missing keys, wrong types).
- **Response:** Retry the agent call once with the schema included in the prompt.
- **Fallback:** If retry fails, populate missing fields with defaults where safe (e.g., empty arrays), log the mismatch, and apply a score penalty of −10 to the affected category.

### Constraint Violations

- **Detection:** QA Agent checks (see Hard Constraint Enforcement Rules above).
- **Response:** Targeted rerun of the violating agent (max 1 per agent).
- **Fallback:** Accept degraded score. The blueprint is still generated but the score reflects the violation.

### General Agent Failure (Timeout, API Error)

- **Detection:** No response or HTTP error within timeout window (30 seconds per agent call).
- **Response:** Retry once.
- **Fallback:** Mark the agent's section as `"error"` in shared state. Blueprint is generated with a warning banner for the failed section.

---

## Blueprint Assembly Strategy

The blueprint assembler reads the full shared state and produces a single **Markdown document** with the following fixed sections:

```markdown
# Draft Blueprint: {intake.idea_summary}

## Wedge
{vision.wedge_statement}

## Ideal Customer Profile
- Role: {vision.icp.role}
- Industry: {vision.icp.industry}
- Company Size: {vision.icp.company_size}
- Behaviour: {vision.icp.behavior_qualifier}
- Pain Trigger: {vision.icp.pain_trigger_event}

## MVP Features (3)
1. {scope.features[0].name} — {scope.features[0].description}
2. {scope.features[1].name} — {scope.features[1].description}
3. {scope.features[2].name} — {scope.features[2].description}

## Kill List (3)
1. {scope.kill_list[0]}
2. {scope.kill_list[1]}
3. {scope.kill_list[2]}

## Technical Architecture
- Stack: {architecture.stack}
- Data Model: {architecture.data_model}
- API Surface: {architecture.api_surface}

## 14-Day Plan
{architecture.fourteen_day_plan}

## Distribution: First 10 Customers
- Channel: {distribution.first_10_plan.channel}
- Strategy: {distribution.first_10_plan.strategy}
- Timeline: {distribution.first_10_plan.timeline}

## Outreach Message
{distribution.outreach_message}

## Execution Readiness Score
- Vision Clarity: {scores.vision_clarity}/100 (25%)
- Scope Discipline: {scores.scope_discipline}/100 (25%)
- Feasibility: {scores.feasibility}/100 (20%)
- Distribution Readiness: {scores.distribution_readiness}/100 (30%)
- **Overall: {scores.overall}/100**

## Score Explanations
{scores.explanations}

## QA Notes
{qa.violations, qa.conflicts}
```

**PDF export** is optional and deferred. If implemented, it will be a server-side Markdown-to-PDF conversion (e.g., `md-to-pdf` or Puppeteer). This is a non-goal for MVP.

---

## Minimal UI Plan

The MVP UI is a single-page web application with four states:

| State | Component | Description |
|-------|-----------|-------------|
| **Intake** | Structured form | 6 fields: `idea_summary`, `problem_statement`, `target_buyer`, `ai_component`, `constraints`, `existing_alternatives`. Validate completeness client-side before submission. |
| **Running** | Pipeline stepper | Shows current agent being executed (Vision → Scope → … → Blueprint). Displays agent name + status (pending / running / done / error). |
| **Results** | Blueprint viewer | Renders the Markdown blueprint in-browser. Displays the Execution Readiness score prominently. |
| **Export** | Download button | Exports blueprint as `.md` file. PDF export is optional / deferred. |

No authentication. No persistence. No settings. No dashboards.

---

## Repo Structure

```
/draft                          # Next.js TypeScript app (repo root)
├── /agents                     # Agent prompt files (one per agent)
│   ├── vision.prompt.md
│   ├── scope.prompt.md
│   ├── distribution.prompt.md
│   ├── architecture.prompt.md
│   ├── qa.prompt.md
│   └── scoring.prompt.md
├── /schemas                    # JSON schemas for shared state and agent I/O
│   ├── state.schema.json
│   ├── intake.schema.json
│   ├── vision.schema.json
│   ├── scope.schema.json
│   ├── distribution.schema.json
│   ├── architecture.schema.json
│   ├── qa.schema.json
│   └── scores.schema.json
├── /examples                   # Example intakes and expected outputs for testing
│   ├── example-intake-01.json
│   └── example-blueprint-01.md
├── /docs                       # Project documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── SCORING.md
├── /app                        # Next.js App Router (pages, layouts, API routes)
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── run/
│           └── route.ts
├── /lib                        # Orchestration, scoring, and blueprint utilities
│   ├── orchestrator.ts
│   ├── scoring.ts
│   ├── blueprint.ts
│   ├── state.ts
│   └── validators.ts
├── next.config.ts
├── tsconfig.json
├── package.json
└── tailwind.config.ts
```
