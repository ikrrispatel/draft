/* ------------------------------------------------------------------ */
/*  lib/state.ts — Canonical TypeScript types for DraftState           */
/* ------------------------------------------------------------------ */

// ---- Intake --------------------------------------------------------

export interface TargetBuyer {
    role: string;
    industry: string;
    company_size: string;
}

export interface Constraints {
    timeline_days: number;
    skill_level: "beginner" | "intermediate" | "advanced";
    budget: "low" | "medium" | "high";
}

export interface Intake {
    idea_summary: string;
    problem_statement: string;
    target_buyer: TargetBuyer;
    ai_component: string;
    constraints: Constraints;
    existing_alternatives: string[];
}

// ---- Vision --------------------------------------------------------

export interface ICP {
    role: string;
    industry: string;
    company_size: string;
    behavior_qualifier: string;
    pain_trigger_event: string;
}

export interface Vision {
    wedge_statement: string;
    icp: ICP;
    differentiation_angle: string;
    assumptions: string[];
}

// ---- Scope ---------------------------------------------------------

export interface Feature {
    name: string;
    description: string;
    rationale: string;
}

export interface Scope {
    features: [Feature, Feature, Feature];
    kill_list: [string, string, string];
}

// ---- Distribution --------------------------------------------------

export interface First10Plan {
    channel: string;
    strategy: string;
    timeline: string;
}

export interface Distribution {
    first_10_plan: First10Plan;
    outreach_message: string;
    channel_icp_alignment: string;
}

// ---- Architecture --------------------------------------------------

export interface DataModel {
    tables: string[];
    description: string;
}

export interface Architecture {
    stack: string[];
    data_model: DataModel;
    api_surface: string[];
    fourteen_day_plan: string[];
}

// ---- QA ------------------------------------------------------------

export interface Violation {
    code: string;
    message: string;
    field_path: string;
    target_agent: "vision" | "scope" | "distribution" | "architecture";
}

export interface Conflict {
    message: string;
    related_fields: string[];
    target_agent: "vision" | "scope" | "distribution" | "architecture";
}

export interface RevisionRequest {
    target_agent: "vision" | "scope" | "distribution" | "architecture";
    instruction: string;
}

export interface QA {
    wedge_is_single: boolean;
    violations: Violation[];
    conflicts: Conflict[];
    revision_requests: RevisionRequest[];
    reruns_triggered: string[];
    pass: boolean;
}

// ---- Scores --------------------------------------------------------

export interface CategoryExplanation {
    score: number;
    rules_applied: string[];
    rules_failed: string[];
    caps_applied: string[];
    explanation: string;
}

export interface ScoreExplanations {
    vision_clarity: CategoryExplanation;
    scope_discipline: CategoryExplanation;
    feasibility: CategoryExplanation;
    distribution_readiness: CategoryExplanation;
}

export interface Scores {
    vision_clarity: number;
    scope_discipline: number;
    feasibility: number;
    distribution_readiness: number;
    overall: number;
    explanations: ScoreExplanations;
}

// ---- DraftState (top-level) ----------------------------------------

export interface DraftState {
    intake: Intake;
    vision: Vision;
    scope: Scope;
    distribution: Distribution;
    architecture: Architecture;
    qa: QA;
    scores: Scores;
    blueprint_md: string;
}
