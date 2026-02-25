/* ------------------------------------------------------------------ */
/*  lib/scoring.ts — Deterministic scoring engine (no LLM)             */
/*  Rules from docs/SCORING.md                                         */
/* ------------------------------------------------------------------ */

import type {
    DraftState,
    Scores,
    CategoryExplanation,
    ScoreExplanations,
} from "@/lib/state";

/**
 * Compute deterministic scores from the shared state.
 * Follows docs/SCORING.md rules exactly.
 */
export function computeScores(state: DraftState): Scores {
    const visionExp = scoreVision(state);
    const scopeExp = scoreScope(state);
    const feasibilityExp = scoreFeasibility(state);
    const distributionExp = scoreDistribution(state);

    // Weighted overall
    let overall =
        visionExp.score * 0.25 +
        scopeExp.score * 0.25 +
        feasibilityExp.score * 0.2 +
        distributionExp.score * 0.3;

    // Global cap: missing ICP
    if (!state.vision.icp.role) {
        overall = Math.min(overall, 60);
    }

    // Global penalty: qa.pass == false
    if (!state.qa.pass) {
        overall -= 5;
    }

    overall = Math.max(0, Math.floor(overall));

    return {
        vision_clarity: visionExp.score,
        scope_discipline: scopeExp.score,
        feasibility: feasibilityExp.score,
        distribution_readiness: distributionExp.score,
        overall,
        explanations: {
            vision_clarity: visionExp,
            scope_discipline: scopeExp,
            feasibility: feasibilityExp,
            distribution_readiness: distributionExp,
        },
    };
}

// ---- Vision Clarity (25%) ------------------------------------------

function scoreVision(state: DraftState): CategoryExplanation {
    const applied: string[] = [];
    const failed: string[] = [];
    const caps: string[] = [];
    let score = 0;

    // V-7: wedge missing → score = 0
    if (!state.vision.wedge_statement) {
        failed.push("V-7");
        return {
            score: 0,
            rules_applied: applied,
            rules_failed: [...failed, "V-1", "V-2", "V-3", "V-4"],
            caps_applied: ["V-7"],
            explanation: "Wedge statement is missing. Vision score is 0.",
        };
    }

    // V-1: wedge present and non-empty → +30
    if (state.vision.wedge_statement.length > 0) {
        score += 30;
        applied.push("V-1");
    } else {
        failed.push("V-1");
    }

    // V-2: single proposition (no "and" joining two distinct value props) → +25
    const wedge = state.vision.wedge_statement;
    const andParts = wedge.split(/\band\b/i);
    if (andParts.length <= 2) {
        score += 25;
        applied.push("V-2");
    } else {
        failed.push("V-2");
    }

    // V-3: vision.icp.role present → +20
    if (state.vision.icp.role && state.vision.icp.role.length > 0) {
        score += 20;
        applied.push("V-3");
    } else {
        failed.push("V-3");
    }

    // V-4: company_size + behavior_qualifier both present → +15
    if (
        state.vision.icp.company_size &&
        state.vision.icp.company_size.length > 0 &&
        state.vision.icp.behavior_qualifier &&
        state.vision.icp.behavior_qualifier.length > 0
    ) {
        score += 15;
        applied.push("V-4");
    } else {
        failed.push("V-4");
    }

    // QA consistency bonus: +10 if no vision-related conflicts
    const hasVisionConflicts = state.qa.conflicts.some(
        (c) =>
            c.target_agent === "vision" ||
            c.related_fields.some((f) => f.startsWith("vision."))
    );
    if (!hasVisionConflicts) {
        score += 10;
    }

    // V-5 cap: wedge unclear (qa.wedge_is_single == false) → cap at 50
    if (!state.qa.wedge_is_single) {
        score = Math.min(score, 50);
        caps.push("V-5");
    }

    // V-6 cap: ICP missing → (overall cap handled in computeScores, but note it)
    if (!state.vision.icp.role) {
        caps.push("V-6");
    }

    const explanationParts: string[] = [];
    if (applied.includes("V-1") && applied.includes("V-2")) {
        explanationParts.push("Wedge is clear and singular.");
    }
    if (failed.includes("V-4")) {
        explanationParts.push(
            "vision.icp.company_size or vision.icp.behavior_qualifier is empty."
        );
    } else if (applied.includes("V-3") && applied.includes("V-4")) {
        explanationParts.push("ICP is fully populated.");
    }
    if (caps.length > 0) {
        explanationParts.push(`Caps applied: ${caps.join(", ")}.`);
    }

    return {
        score,
        rules_applied: applied,
        rules_failed: failed,
        caps_applied: caps,
        explanation:
            explanationParts.join(" ") || "Vision scoring completed with no issues.",
    };
}

// ---- Scope Discipline (25%) ---------------------------------------

function scoreScope(state: DraftState): CategoryExplanation {
    const applied: string[] = [];
    const failed: string[] = [];
    const caps: string[] = [];
    let score = 0;

    const featureCount = state.scope.features.length;
    const killCount = state.scope.kill_list.length;

    // S-6: feature count ≠ 3 → score = 40 (hard set)
    if (featureCount !== 3) {
        failed.push("S-6");
        caps.push("S-6");
        return {
            score: 40,
            rules_applied: applied,
            rules_failed: [...failed, "S-1"],
            caps_applied: caps,
            explanation: `Feature count is ${featureCount}, expected 3. Scope score set to 40.`,
        };
    }

    // S-1: exactly 3 features → +30
    score += 30;
    applied.push("S-1");

    // S-2: exactly 3 kill-list items → +20
    if (killCount === 3) {
        score += 20;
        applied.push("S-2");
    } else {
        // S-7: kill_list count ≠ 3 → -20
        score -= 20;
        failed.push("S-7");
        failed.push("S-2");
    }

    // S-3: every feature has non-empty rationale → +15
    const allRationale = state.scope.features.every(
        (f) => f.rationale && f.rationale.length > 0
    );
    if (allRationale) {
        score += 15;
        applied.push("S-3");
    } else {
        failed.push("S-3");
    }

    // S-4: every rationale references wedge or ICP → +15
    const wedgeLower = state.vision.wedge_statement.toLowerCase();
    const roleLower = state.vision.icp.role.toLowerCase();
    const allRationaleRef = state.scope.features.every((f) => {
        const r = f.rationale.toLowerCase();
        return (
            r.includes("wedge") ||
            r.includes(roleLower) ||
            r.includes(wedgeLower.slice(0, 20))
        );
    });
    if (allRationaleRef) {
        score += 15;
        applied.push("S-4");
    } else {
        failed.push("S-4");
    }

    // S-5: kill-list items distinct from features → +10
    const featureNames = new Set(
        state.scope.features.map((f) => f.name.toLowerCase())
    );
    const killOverlap = state.scope.kill_list.some((k) =>
        featureNames.has(k.toLowerCase())
    );
    if (!killOverlap) {
        score += 10;
        applied.push("S-5");
    } else {
        failed.push("S-5");
    }

    // QA consistency bonus: +10 if no scope-related conflicts
    const hasScopeConflicts = state.qa.conflicts.some(
        (c) =>
            c.target_agent === "scope" ||
            c.related_fields.some((f) => f.startsWith("scope."))
    );
    if (!hasScopeConflicts) {
        score += 10;
    }

    score = Math.max(0, score);

    return {
        score,
        rules_applied: applied,
        rules_failed: failed,
        caps_applied: caps,
        explanation:
            failed.length === 0
                ? "All 3 features and 3 kill-list items present. Rationales reference the wedge."
                : `Scope issues: ${failed.join(", ")} failed.`,
    };
}

// ---- Feasibility (20%) --------------------------------------------

function scoreFeasibility(state: DraftState): CategoryExplanation {
    const applied: string[] = [];
    const failed: string[] = [];
    const caps: string[] = [];
    let score = 0;

    const arch = state.architecture;

    // F-8: architecture entirely missing → score = 0
    if (!arch || (!arch.stack?.length && !arch.data_model && !arch.api_surface?.length)) {
        return {
            score: 0,
            rules_applied: [],
            rules_failed: ["F-8"],
            caps_applied: ["F-8"],
            explanation: "Architecture section is entirely missing. Feasibility score is 0.",
        };
    }

    // F-1: stack present and non-empty → +20
    if (arch.stack && arch.stack.length > 0) {
        score += 20;
        applied.push("F-1");
    } else {
        failed.push("F-1");
    }

    // F-2: data_model present and non-empty → +15
    if (arch.data_model && arch.data_model.description) {
        score += 15;
        applied.push("F-2");
    } else {
        failed.push("F-2");
    }

    // F-3: api_surface present and non-empty → +15
    if (arch.api_surface && arch.api_surface.length > 0) {
        score += 15;
        applied.push("F-3");
    } else {
        failed.push("F-3");
    }

    // F-4: fourteen_day_plan present with ≥ 3 phases → +20
    if (arch.fourteen_day_plan && arch.fourteen_day_plan.length >= 3) {
        score += 20;
        applied.push("F-4");
    } else {
        failed.push("F-4");
    }

    // F-5 / F-7: plan fits within timeline_days → +15, exceeds → -20
    const timelineDays = state.intake.constraints.timeline_days;
    let planExceeds = false;
    if (arch.fourteen_day_plan && arch.fourteen_day_plan.length > 0) {
        const lastPhase = arch.fourteen_day_plan[arch.fourteen_day_plan.length - 1];
        const dayMatch = lastPhase.match(/Days?\s+\d+[–-](\d+)/i);
        if (dayMatch) {
            const lastDay = parseInt(dayMatch[1], 10);
            if (lastDay <= timelineDays) {
                score += 15;
                applied.push("F-5");
            } else {
                planExceeds = true;
                score -= 20;
                failed.push("F-7");
            }
        } else {
            // Can't parse, assume fits
            score += 15;
            applied.push("F-5");
        }
    } else {
        failed.push("F-5");
    }

    // F-6: API surface covers all 3 features → +15
    if (state.scope.features.length === 3 && arch.api_surface) {
        const featureNames = state.scope.features.map((f) => f.name.toLowerCase());
        const coveredFeatures = new Set<string>();
        for (const endpoint of arch.api_surface) {
            const match = endpoint.match(/\(supports:\s*(.+?)\)/i);
            if (match) {
                coveredFeatures.add(match[1].toLowerCase().trim());
            }
        }
        const allCovered = featureNames.every((fn) => coveredFeatures.has(fn));
        if (allCovered) {
            score += 15;
            applied.push("F-6");
        } else {
            failed.push("F-6");
        }
    } else {
        failed.push("F-6");
    }

    score = Math.max(0, score);

    const explanationParts: string[] = [];
    if (applied.includes("F-1") && applied.includes("F-4")) {
        explanationParts.push("Architecture is complete with stack and phased plan.");
    }
    if (planExceeds) {
        explanationParts.push(
            `Plan exceeds timeline_days=${timelineDays}.`
        );
    }
    if (failed.includes("F-6")) {
        explanationParts.push("Not all features have dedicated API endpoints.");
    }

    return {
        score,
        rules_applied: applied,
        rules_failed: failed,
        caps_applied: caps,
        explanation:
            explanationParts.join(" ") ||
            "Feasibility scoring completed with no issues.",
    };
}

// ---- Distribution Readiness (30%) ---------------------------------

function scoreDistribution(state: DraftState): CategoryExplanation {
    const applied: string[] = [];
    const failed: string[] = [];
    const caps: string[] = [];
    let score = 0;

    const dist = state.distribution;

    // D-1: first_10_plan present and non-empty → +25
    if (
        dist.first_10_plan &&
        dist.first_10_plan.channel &&
        dist.first_10_plan.strategy &&
        dist.first_10_plan.timeline
    ) {
        score += 25;
        applied.push("D-1");
    } else {
        failed.push("D-1");
    }

    // D-2: channel specified → +10
    if (dist.first_10_plan?.channel) {
        score += 10;
        applied.push("D-2");
    } else {
        failed.push("D-2");
    }

    // D-3: strategy has concrete numbers → +15
    if (dist.first_10_plan?.strategy && /\d+/.test(dist.first_10_plan.strategy)) {
        score += 15;
        applied.push("D-3");
    } else {
        failed.push("D-3");
    }

    // D-4: timeline within intake.constraints.timeline_days → +10
    if (dist.first_10_plan?.timeline) {
        const dayMatch = dist.first_10_plan.timeline.match(
            /Days?\s+\d+[–-](\d+)/i
        );
        if (dayMatch) {
            const lastDay = parseInt(dayMatch[1], 10);
            if (lastDay <= state.intake.constraints.timeline_days) {
                score += 10;
                applied.push("D-4");
            } else {
                failed.push("D-4");
            }
        } else {
            // Can't parse, give benefit of doubt
            score += 10;
            applied.push("D-4");
        }
    } else {
        failed.push("D-4");
    }

    // D-5: outreach_message present → +15
    if (dist.outreach_message && dist.outreach_message.length > 0) {
        score += 15;
        applied.push("D-5");
    } else {
        failed.push("D-5");
    }

    // D-6: outreach_message ≤ 300 chars → +5
    if (dist.outreach_message && dist.outreach_message.length <= 300) {
        score += 5;
        applied.push("D-6");
    } else {
        failed.push("D-6");
    }

    // D-7: channel_icp_alignment present → +10
    if (
        dist.channel_icp_alignment &&
        dist.channel_icp_alignment.length > 0
    ) {
        score += 10;
        applied.push("D-7");
    } else {
        failed.push("D-7");
    }

    // D-8: channel matches ICP habitat → +10 (heuristic: channel mentions ICP role or industry)
    if (dist.first_10_plan?.channel) {
        const channelLower = dist.first_10_plan.channel.toLowerCase();
        const roleLower = state.vision.icp.role.toLowerCase();
        const industryLower = state.vision.icp.industry.toLowerCase();
        if (
            channelLower.includes(roleLower) ||
            channelLower.includes(industryLower) ||
            channelLower.includes("linkedin") ||
            channelLower.includes("reddit")
        ) {
            score += 10;
            applied.push("D-8");
        } else {
            failed.push("D-8");
        }
    } else {
        failed.push("D-8");
    }

    // D-9 cap: first_10_plan missing → cap at 60
    if (
        !dist.first_10_plan ||
        !dist.first_10_plan.channel ||
        !dist.first_10_plan.strategy
    ) {
        score = Math.min(score, 60);
        caps.push("D-9");
    }

    // D-10 cap: outreach_message missing → cap at 60
    if (!dist.outreach_message || dist.outreach_message.length === 0) {
        score = Math.min(score, 60);
        caps.push("D-10");
    }

    score = Math.max(0, score);

    const explanationParts: string[] = [];
    if (applied.includes("D-1") && applied.includes("D-3")) {
        explanationParts.push("First-10 plan is concrete with numbers.");
    }
    if (failed.includes("D-6")) {
        explanationParts.push("Outreach message exceeds 300 characters.");
    }
    if (caps.length > 0) {
        explanationParts.push(`Caps applied: ${caps.join(", ")}.`);
    }

    return {
        score,
        rules_applied: applied,
        rules_failed: failed,
        caps_applied: caps,
        explanation:
            explanationParts.join(" ") ||
            "Distribution scoring completed with no issues.",
    };
}
