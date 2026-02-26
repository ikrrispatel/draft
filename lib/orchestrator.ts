/* ------------------------------------------------------------------ */
/*  lib/orchestrator.ts — Draft pipeline orchestrator                  */
/* ------------------------------------------------------------------ */

import type {
    DraftState,
    Intake,
    Vision,
    Scope,
    Distribution,
    Architecture,
    QA,
    Scores,
} from "@/lib/state";
import { callAgent, type AgentName } from "@/lib/agents";
import {
    validateIntakeOrThrow,
    validateVisionOrThrow,
    validateScopeOrThrow,
    validateDistributionOrThrow,
    validateArchitectureOrThrow,
    validateQAOrThrow,
    validateScoresOrThrow,
} from "@/lib/validators";
import { computeScores } from "@/lib/scoring";
import { buildBlueprint } from "@/lib/blueprint";

/**
 * Run the full Draft pipeline.
 *
 * Pipeline:
 *   validate intake → vision → scope → distribution → architecture →
 *   qa → (optional targeted reruns) → scoring → blueprint
 */
export async function runDraft(intakeUnknown: unknown): Promise<DraftState> {
    // 1. Validate intake
    validateIntakeOrThrow(intakeUnknown);
    const intake = intakeUnknown as Intake;

    // 2. Vision agent
    const visionRaw = await callAgent("vision", { intake });
    validateVisionOrThrow(visionRaw);
    let vision = visionRaw as Vision;

    // 3. Scope agent
    const scopeRaw = await callAgent("scope", { intake, vision });
    validateScopeOrThrow(scopeRaw);
    let scope = scopeRaw as Scope;

    // 4. Distribution agent
    const distributionRaw = await callAgent("distribution", {
        intake,
        vision,
        scope,
    });
    validateDistributionOrThrow(distributionRaw);
    let distribution = distributionRaw as Distribution;

    // 5. Architecture agent
    const architectureRaw = await callAgent("architecture", {
        intake,
        vision,
        scope,
        distribution,
    });

    // normalize stack to string[] (local models sometimes return objects)
    if (architectureRaw && Array.isArray((architectureRaw as any).stack)) {
        (architectureRaw as any).stack = (architectureRaw as any).stack.map((x: any) => {
            if (typeof x === "string") return x;
            if (x && typeof x === "object") {
                return String(x.name ?? x.label ?? x.value ?? JSON.stringify(x));
            }
            return String(x);
        });
    }

    validateArchitectureOrThrow(architectureRaw);
    let architecture = architectureRaw as Architecture;

    // 6. QA agent
    const qaRaw = await callAgent("qa", {
        intake,
        vision,
        scope,
        distribution,
        architecture,
    });
    validateQAOrThrow(qaRaw);
    let qa = qaRaw as QA;

    // 7. Handle targeted reruns (max 1 per agent, single pass)
    if (qa.revision_requests.length > 0) {
        // Deduplicate: keep only the first revision_request per agent
        const seen = new Set<string>();
        const dedupedRequests = qa.revision_requests.filter((r) => {
            if (seen.has(r.target_agent)) return false;
            seen.add(r.target_agent);
            return true;
        });

        const rerunSet = new Set<string>();

        for (const request of dedupedRequests) {
            const agentName = request.target_agent as AgentName;

            // Build agent-specific rerun input (minimal context per agent)
            let rerunInput: Record<string, unknown>;
            switch (agentName) {
                case "vision":
                    rerunInput = { intake, revision_instruction: request.instruction };
                    break;
                case "scope":
                    rerunInput = { intake, vision, revision_instruction: request.instruction };
                    break;
                case "distribution":
                    rerunInput = { intake, vision, scope, revision_instruction: request.instruction };
                    break;
                case "architecture":
                    rerunInput = { intake, vision, scope, distribution, revision_instruction: request.instruction };
                    break;
                default:
                    continue; // skip unknown agents
            }

            const rerunResult = await callAgent(agentName, rerunInput);

            // Validate and replace the agent's output
            switch (agentName) {
                case "vision":
                    validateVisionOrThrow(rerunResult);
                    vision = rerunResult as Vision;
                    break;
                case "scope":
                    validateScopeOrThrow(rerunResult);
                    scope = rerunResult as Scope;
                    break;
                case "distribution":
                    validateDistributionOrThrow(rerunResult);
                    distribution = rerunResult as Distribution;
                    break;
                case "architecture":
                    validateArchitectureOrThrow(rerunResult);
                    architecture = rerunResult as Architecture;
                    break;
            }

            rerunSet.add(agentName);
        }

        // Re-run QA once after all reruns
        const qaRerunRaw = await callAgent("qa", {
            intake,
            vision,
            scope,
            distribution,
            architecture,
        });
        validateQAOrThrow(qaRerunRaw);
        qa = qaRerunRaw as QA;
        qa.reruns_triggered = [...rerunSet];
    }

    // 8. Scoring (deterministic — no agent call)
    const partialState: DraftState = {
        intake,
        vision,
        scope,
        distribution,
        architecture,
        qa,
        scores: null as unknown as Scores,
        blueprint_md: "",
    };
    const scores = computeScores(partialState);
    validateScoresOrThrow(scores);

    // 9. Blueprint assembly
    const finalState: DraftState = {
        intake,
        vision,
        scope,
        distribution,
        architecture,
        qa,
        scores,
        blueprint_md: "",
    };
    finalState.blueprint_md = buildBlueprint(finalState);

    return finalState;
}
