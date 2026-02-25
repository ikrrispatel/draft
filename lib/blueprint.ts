/* ------------------------------------------------------------------ */
/*  lib/blueprint.ts — Markdown blueprint assembly                     */
/*  Template from docs/ARCHITECTURE.md § Blueprint Assembly Strategy   */
/* ------------------------------------------------------------------ */

import type { DraftState } from "@/lib/state";

/**
 * Assemble the final Markdown blueprint from the shared state.
 */
export function buildBlueprint(state: DraftState): string {
    const { intake, vision, scope, distribution, architecture, scores, qa } =
        state;

    const features = scope.features
        .map((f, i) => `${i + 1}. **${f.name}** — ${f.description}`)
        .join("\n");

    const killList = scope.kill_list
        .map((k, i) => `${i + 1}. ${k}`)
        .join("\n");

    const stack = architecture.stack.map((s) => `- ${s}`).join("\n");
    const apiSurface = architecture.api_surface
        .map((e) => `- ${e}`)
        .join("\n");

    const plan = architecture.fourteen_day_plan
        .map((p) => `- ${p}`)
        .join("\n");

    const exp = scores.explanations;
    const explanations = [
        `### Vision Clarity`,
        `- Score: ${exp.vision_clarity.score}/100`,
        `- Rules applied: ${exp.vision_clarity.rules_applied.join(", ") || "none"}`,
        `- Rules failed: ${exp.vision_clarity.rules_failed.join(", ") || "none"}`,
        `- Caps: ${exp.vision_clarity.caps_applied.join(", ") || "none"}`,
        `- ${exp.vision_clarity.explanation}`,
        ``,
        `### Scope Discipline`,
        `- Score: ${exp.scope_discipline.score}/100`,
        `- Rules applied: ${exp.scope_discipline.rules_applied.join(", ") || "none"}`,
        `- Rules failed: ${exp.scope_discipline.rules_failed.join(", ") || "none"}`,
        `- Caps: ${exp.scope_discipline.caps_applied.join(", ") || "none"}`,
        `- ${exp.scope_discipline.explanation}`,
        ``,
        `### Feasibility`,
        `- Score: ${exp.feasibility.score}/100`,
        `- Rules applied: ${exp.feasibility.rules_applied.join(", ") || "none"}`,
        `- Rules failed: ${exp.feasibility.rules_failed.join(", ") || "none"}`,
        `- Caps: ${exp.feasibility.caps_applied.join(", ") || "none"}`,
        `- ${exp.feasibility.explanation}`,
        ``,
        `### Distribution Readiness`,
        `- Score: ${exp.distribution_readiness.score}/100`,
        `- Rules applied: ${exp.distribution_readiness.rules_applied.join(", ") || "none"}`,
        `- Rules failed: ${exp.distribution_readiness.rules_failed.join(", ") || "none"}`,
        `- Caps: ${exp.distribution_readiness.caps_applied.join(", ") || "none"}`,
        `- ${exp.distribution_readiness.explanation}`,
    ].join("\n");

    const violations =
        qa.violations.length > 0
            ? qa.violations
                .map((v) => `- **${v.code}**: ${v.message} (${v.field_path})`)
                .join("\n")
            : "No violations detected.";

    const conflicts =
        qa.conflicts.length > 0
            ? qa.conflicts
                .map(
                    (c) =>
                        `- ${c.message} (fields: ${c.related_fields.join(", ")})`
                )
                .join("\n")
            : "No conflicts detected.";

    return `# Draft Blueprint: ${intake.idea_summary}

## Wedge
${vision.wedge_statement}

## Ideal Customer Profile
- Role: ${vision.icp.role}
- Industry: ${vision.icp.industry}
- Company Size: ${vision.icp.company_size}
- Behaviour: ${vision.icp.behavior_qualifier}
- Pain Trigger: ${vision.icp.pain_trigger_event}

## MVP Features (3)
${features}

## Kill List (3)
${killList}

## Technical Architecture
### Stack
${stack}

### Data Model
- Tables: ${architecture.data_model.tables.join(", ")}
- ${architecture.data_model.description}

### API Surface
${apiSurface}

## Build Plan
${plan}

## Distribution: First 10 Customers
- Channel: ${distribution.first_10_plan.channel}
- Strategy: ${distribution.first_10_plan.strategy}
- Timeline: ${distribution.first_10_plan.timeline}

## Outreach Message
> ${distribution.outreach_message}

## Execution Readiness Score
- Vision Clarity: ${scores.vision_clarity}/100 (25%)
- Scope Discipline: ${scores.scope_discipline}/100 (25%)
- Feasibility: ${scores.feasibility}/100 (20%)
- Distribution Readiness: ${scores.distribution_readiness}/100 (30%)
- **Overall: ${scores.overall}/100**

## Score Explanations
${explanations}

## QA Notes
### Violations
${violations}

### Conflicts
${conflicts}
`;
}
