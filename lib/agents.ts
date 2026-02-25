/* ------------------------------------------------------------------ */
/*  lib/agents.ts — Mock agent implementations (no LLM yet)            */
/* ------------------------------------------------------------------ */

import type {
    Intake,
    Vision,
    Scope,
    Distribution,
    Architecture,
    QA,
} from "@/lib/state";

export type AgentName =
    | "vision"
    | "scope"
    | "distribution"
    | "architecture"
    | "qa";

/**
 * Mock agent call. Returns deterministic data that passes the
 * corresponding JSON schema. Replace with real LLM calls later.
 */
export async function callAgent(
    agentName: AgentName,
    input: Record<string, unknown>
): Promise<unknown> {
    switch (agentName) {
        case "vision":
            return mockVision(input.intake as Intake);
        case "scope":
            return mockScope(input.intake as Intake, input.vision as Vision);
        case "distribution":
            return mockDistribution(
                input.intake as Intake,
                input.vision as Vision,
                input.scope as Scope
            );
        case "architecture":
            return mockArchitecture(
                input.intake as Intake,
                input.vision as Vision,
                input.scope as Scope
            );
        case "qa":
            return mockQA(input as Record<string, unknown>);
        default:
            throw new Error(`Unknown agent: ${agentName}`);
    }
}

// ---- Mock implementations ------------------------------------------

function mockVision(intake: Intake): Vision {
    return {
        wedge_statement: `AI-powered ${intake.ai_component} for ${intake.target_buyer.role}s in ${intake.target_buyer.industry}`,
        icp: {
            role: intake.target_buyer.role,
            industry: intake.target_buyer.industry,
            company_size: intake.target_buyer.company_size,
            behavior_qualifier: `Actively looking for AI solutions to ${intake.problem_statement.slice(0, 60).toLowerCase()}`,
            pain_trigger_event: `Realizes current workflow is too slow after trying ${intake.existing_alternatives[0] || "manual processes"}`,
        },
        differentiation_angle: `Unlike ${intake.existing_alternatives[0] || "existing tools"}, this focuses exclusively on the single wedge for ${intake.target_buyer.role}s`,
        assumptions: [
            `${intake.target_buyer.role}s in ${intake.target_buyer.industry} are willing to pay for this solution`,
            "The AI component delivers sufficient quality for the core use case",
        ],
    };
}

function mockScope(intake: Intake, vision: Vision): Scope {
    return {
        features: [
            {
                name: "Core AI Action",
                description: `Primary AI-powered action that delivers the wedge value for ${vision.icp.role}s`,
                rationale: `Directly validates the wedge: ${vision.wedge_statement.slice(0, 80)}`,
            },
            {
                name: "Input Interface",
                description: `Simple interface for ${vision.icp.role}s to provide data for the AI action`,
                rationale: `Required for ${vision.icp.role}s to access the core value proposition`,
            },
            {
                name: "Output Delivery",
                description: "Delivers the AI-generated result in a usable format",
                rationale: `Minimal output mechanism so ${vision.icp.role}s can act on results immediately`,
            },
        ],
        kill_list: [
            "User dashboard and analytics",
            "Team collaboration features",
            "Third-party integrations and API access",
        ],
    };
}

function mockDistribution(
    intake: Intake,
    vision: Vision,
    _scope: Scope
): Distribution {
    const lastDays = intake.constraints.timeline_days;
    const outreachStart = Math.max(1, lastDays - 2);
    return {
        first_10_plan: {
            channel: `LinkedIn DMs to ${vision.icp.role}s in ${vision.icp.industry}`,
            strategy: `Identify 30 prospects, DM 10/day for 3 days, offer free 7-day trial`,
            timeline: `Days ${outreachStart}–${lastDays}`,
        },
        outreach_message: `Hey, I built a tool that helps ${vision.icp.role}s with ${intake.problem_statement.slice(0, 50).toLowerCase()}. Would you try it free for a week?`,
        channel_icp_alignment: `${vision.icp.role}s in ${vision.icp.industry} are active on LinkedIn, making DMs the natural outreach channel`,
    };
}

function mockArchitecture(
    intake: Intake,
    _vision: Vision,
    scope: Scope
): Architecture {
    const days = intake.constraints.timeline_days;
    const f0 = scope.features[0].name;
    const f1 = scope.features[1].name;
    const f2 = scope.features[2].name;

    // Compute plan phases that fit within timeline_days
    const phase1End = Math.min(Math.ceil(days * 0.3), days);
    const phase2End = Math.min(Math.ceil(days * 0.6), days);
    const phase3End = Math.min(Math.ceil(days * 0.85), days);

    return {
        stack: [
            "Next.js (TypeScript)",
            "Tailwind CSS",
            "OpenAI GPT-4o API",
            intake.constraints.budget === "low" ? "SQLite" : "PostgreSQL",
        ],
        data_model: {
            tables: ["users", "requests", "outputs"],
            description:
                "users: auth and subscription status; requests: user inputs; outputs: AI-generated results with timestamps",
        },
        api_surface: [
            `POST /api/generate (supports: ${f0})`,
            `POST /api/input (supports: ${f1})`,
            `GET /api/result (supports: ${f2})`,
        ],
        fourteen_day_plan: [
            `Days 1–${phase1End}: Set up project scaffold, data model, and ${f1}`,
            `Days ${phase1End + 1}–${phase2End}: Implement ${f0} with AI integration`,
            `Days ${phase2End + 1}–${phase3End}: Build ${f2} and end-to-end testing`,
            `Days ${phase3End + 1}–${days}: Landing page, deployment, and first-10 outreach`,
        ],
    };
}

function mockQA(state: Record<string, unknown>): QA {
    const vision = state.vision as Vision;
    const scope = state.scope as Scope;
    const distribution = state.distribution as Distribution;
    const architecture = state.architecture as Architecture;
    const intake = state.intake as Intake;

    const violations: QA["violations"] = [];
    const conflicts: QA["conflicts"] = [];
    const revisionRequests: QA["revision_requests"] = [];

    // Check wedge singularity
    const wedgeHasAnd =
        vision.wedge_statement.includes(" and ") &&
        vision.wedge_statement.split(" and ").length > 2;
    const wedgeIsSingle = !wedgeHasAnd;

    if (!wedgeIsSingle) {
        violations.push({
            code: "WEDGE_NOT_SINGLE",
            message: "Wedge statement contains multiple value propositions",
            field_path: "vision.wedge_statement",
            target_agent: "vision",
        });
    }

    // Check ICP
    if (!vision.icp.role) {
        violations.push({
            code: "ICP_MISSING",
            message: "vision.icp.role is empty",
            field_path: "vision.icp.role",
            target_agent: "vision",
        });
    }

    // Check feature count
    if (scope.features.length !== 3) {
        violations.push({
            code: "FEATURE_COUNT_MISMATCH",
            message: `Expected 3 features, got ${scope.features.length}`,
            field_path: "scope.features",
            target_agent: "scope",
        });
    }

    // Check kill list count
    if (scope.kill_list.length !== 3) {
        violations.push({
            code: "KILL_LIST_COUNT_MISMATCH",
            message: `Expected 3 kill-list items, got ${scope.kill_list.length}`,
            field_path: "scope.kill_list",
            target_agent: "scope",
        });
    }

    // Check distribution
    if (
        !distribution.first_10_plan ||
        !distribution.first_10_plan.channel ||
        !distribution.first_10_plan.strategy ||
        !distribution.first_10_plan.timeline
    ) {
        violations.push({
            code: "FIRST_10_PLAN_MISSING",
            message: "first_10_plan is missing or incomplete",
            field_path: "distribution.first_10_plan",
            target_agent: "distribution",
        });
    }

    if (!distribution.outreach_message) {
        violations.push({
            code: "OUTREACH_MESSAGE_MISSING",
            message: "outreach_message is empty",
            field_path: "distribution.outreach_message",
            target_agent: "distribution",
        });
    }

    // Check timeline
    const planPhases = architecture.fourteen_day_plan;
    if (planPhases.length > 0) {
        const lastPhase = planPhases[planPhases.length - 1];
        const dayMatch = lastPhase.match(/Days?\s+\d+[–-](\d+)/i);
        if (dayMatch) {
            const lastDay = parseInt(dayMatch[1], 10);
            if (lastDay > intake.constraints.timeline_days) {
                violations.push({
                    code: "TIMELINE_EXCEEDS_CONSTRAINT",
                    message: `Plan ends on day ${lastDay}, exceeds timeline_days=${intake.constraints.timeline_days}`,
                    field_path: "architecture.fourteen_day_plan",
                    target_agent: "architecture",
                });
            }
        }
    }

    // Check architecture present
    if (!architecture.stack || architecture.stack.length === 0) {
        violations.push({
            code: "ARCH_MISSING",
            message: "Architecture stack is empty",
            field_path: "architecture.stack",
            target_agent: "architecture",
        });
    }

    // Cross-agent conflict: feature-wedge alignment (simple heuristic)
    const wedgeLower = vision.wedge_statement.toLowerCase();
    for (const feature of scope.features) {
        const rationaleLower = feature.rationale.toLowerCase();
        if (
            !rationaleLower.includes("wedge") &&
            !rationaleLower.includes(vision.icp.role.toLowerCase())
        ) {
            conflicts.push({
                message: `FEATURE_WEDGE_MISMATCH: Feature "${feature.name}" rationale does not reference wedge or ICP role`,
                related_fields: ["scope.features", "vision.wedge_statement"],
                target_agent: "scope",
            });
            break;
        }
    }

    // Cross-agent conflict: architecture scope creep
    const featureNames = scope.features.map((f) => f.name.toLowerCase());
    for (const endpoint of architecture.api_surface) {
        const supportsMatch = endpoint.match(/\(supports:\s*(.+?)\)/i);
        if (supportsMatch) {
            const supportedFeature = supportsMatch[1].toLowerCase().trim();
            if (!featureNames.some((fn) => fn === supportedFeature)) {
                conflicts.push({
                    message: `ARCH_SCOPE_CREEP: Endpoint "${endpoint}" supports a feature not in scope`,
                    related_fields: ["architecture.api_surface", "scope.features"],
                    target_agent: "architecture",
                });
                break;
            }
        }
    }

    // Build revision requests (max 1 per agent)
    const agentViolations = new Map<string, string[]>();
    for (const v of violations) {
        const existing = agentViolations.get(v.target_agent) || [];
        existing.push(v.message);
        agentViolations.set(v.target_agent, existing);
    }
    for (const c of conflicts) {
        const existing = agentViolations.get(c.target_agent) || [];
        existing.push(c.message);
        agentViolations.set(c.target_agent, existing);
    }

    for (const [agent, messages] of agentViolations) {
        revisionRequests.push({
            target_agent: agent as RevisionRequest["target_agent"],
            instruction: `Fix: ${messages.join(". ")}`,
        });
    }

    return {
        wedge_is_single: wedgeIsSingle,
        violations,
        conflicts,
        revision_requests: revisionRequests,
        reruns_triggered: [],
        pass: violations.length === 0,
    };
}

// Re-export the type for revision requests
type RevisionRequest = QA["revision_requests"][number];
