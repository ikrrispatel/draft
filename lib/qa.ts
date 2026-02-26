/* ------------------------------------------------------------------ */
/*  lib/qa.ts — Deterministic QA (no LLM)                              */
/* ------------------------------------------------------------------ */

import type { DraftState, QA } from "@/lib/state";

type TargetAgent = "vision" | "scope" | "distribution" | "architecture";

function containsAny(haystack: string, needles: string[]): boolean {
  const s = haystack.toLowerCase();
  return needles.some((n) => s.includes(n));
}

function isDaysRange(s: string): boolean {
  // Accept "Days 1–4" or "Days 1-4"
  return /^Days?\s+\d+\s*[–-]\s*\d+$/i.test(s.trim());
}

function maxDayFromPlan(plan: string[]): number | null {
  let max = -1;
  for (const line of plan) {
    const m = line.match(/Days?\s+(\d+)\s*[–-]\s*(\d+)/i);
    if (!m) continue;
    const end = parseInt(m[2], 10);
    if (!Number.isNaN(end)) max = Math.max(max, end);
  }
  return max >= 0 ? max : null;
}

export function runDeterministicQA(state: DraftState): QA {
  const violations: QA["violations"] = [];
  const conflicts: QA["conflicts"] = [];
  const revision_requests: QA["revision_requests"] = [];

  // --- wedge_is_single (simple deterministic heuristic) ---
  const wedge = (state.vision?.wedge_statement ?? "").trim();
  // multi-prop if contains " & " OR more than 1 standalone "and"
  const andCount = (wedge.match(/\band\b/gi) ?? []).length;
  const wedgeIsSingle = wedge.length > 0 && !wedge.includes(" & ") && andCount <= 1;

  if (!wedgeIsSingle) {
    violations.push({
      code: "WEDGE_NOT_SINGLE",
      message: "Wedge must express a single proposition (avoid multi-prop 'and' / '&').",
      field_path: "vision.wedge_statement",
      target_agent: "vision",
    });
  }

  // --- ICP present ---
  if (!state.vision?.icp?.role || state.vision.icp.role.trim().length === 0) {
    violations.push({
      code: "ICP_MISSING",
      message: "vision.icp.role must be non-empty.",
      field_path: "vision.icp.role",
      target_agent: "vision",
    });
  }

  // --- Exactly 3 features ---
  const features = state.scope?.features ?? [];
  if (features.length !== 3) {
    violations.push({
      code: "FEATURE_COUNT_MISMATCH",
      message: `scope.features must have exactly 3 items (got ${features.length}).`,
      field_path: "scope.features",
      target_agent: "scope",
    });
  }

  // --- Exactly 3 kill_list ---
  const kill = state.scope?.kill_list ?? [];
  if (kill.length !== 3) {
    violations.push({
      code: "KILL_LIST_COUNT_MISMATCH",
      message: `scope.kill_list must have exactly 3 items (got ${kill.length}).`,
      field_path: "scope.kill_list",
      target_agent: "scope",
    });
  }

  // --- Distribution first_10_plan present + complete ---
  const f10 = state.distribution?.first_10_plan;
  if (!f10 || !f10.channel?.trim() || !f10.strategy?.trim() || !f10.timeline?.trim()) {
    violations.push({
      code: "FIRST_10_PLAN_MISSING",
      message: "distribution.first_10_plan must include channel, strategy, and timeline.",
      field_path: "distribution.first_10_plan",
      target_agent: "distribution",
    });
  }

  // --- Outreach present ---
  const outreach = (state.distribution?.outreach_message ?? "").trim();
  if (!outreach) {
    violations.push({
      code: "OUTREACH_MESSAGE_MISSING",
      message: "distribution.outreach_message must be non-empty.",
      field_path: "distribution.outreach_message",
      target_agent: "distribution",
    });
  }

  // --- Timeline within constraint + parseable ---
  const timelineDays = state.intake?.constraints?.timeline_days ?? 14;
  const plan = state.architecture?.fourteen_day_plan ?? [];
  const maxDay = maxDayFromPlan(plan);
  if (plan.length === 0 || maxDay === null || maxDay > timelineDays) {
    violations.push({
      code: "TIMELINE_EXCEEDS_CONSTRAINT",
      message: `architecture.fourteen_day_plan must fit within intake.constraints.timeline_days=${timelineDays}.`,
      field_path: "architecture.fourteen_day_plan",
      target_agent: "architecture",
    });
  }

  // --- Architecture stack present ---
  const stack = state.architecture?.stack ?? [];
  if (!Array.isArray(stack) || stack.length === 0) {
    violations.push({
      code: "ARCH_MISSING",
      message: "architecture.stack must be a non-empty array of strings.",
      field_path: "architecture.stack",
      target_agent: "architecture",
    });
  }

  // --- Deterministic extras (enforced with existing codes) ---
  // A) Feature name bans (implementation/integration)
  const banned = ["integration", "gpt", "llm", "model", "backend", "api", "database", "infrastructure"];
  const badName = features.some((f) => containsAny(f.name ?? "", banned));
  if (badName) {
    violations.push({
      code: "FEATURE_COUNT_MISMATCH",
      message: "Feature names must be user-facing; remove integration/implementation features and rewrite as Input→Transform→Output.",
      field_path: "scope.features",
      target_agent: "scope",
    });
  }

  // B) Timeline format for first_10_plan
  if (f10?.timeline && !isDaysRange(f10.timeline)) {
    violations.push({
      code: "TIMELINE_EXCEEDS_CONSTRAINT",
      message: "distribution.first_10_plan.timeline must be formatted 'Days X–Y'.",
      field_path: "distribution.first_10_plan.timeline",
      target_agent: "distribution",
    });
  }

  // C) Outreach anti-hallucination
  if (outreach && (outreach.includes("[Company]") || /I'm an SDR|I work at|I am an SDR/i.test(outreach))) {
    violations.push({
      code: "OUTREACH_MESSAGE_MISSING",
      message: "Remove fake identity/placeholders. Write as the builder; only {first_name} placeholder allowed.",
      field_path: "distribution.outreach_message",
      target_agent: "distribution",
    });
  }

  // --- Conflicts (lightweight, deterministic heuristics) ---
  // FEATURE_WEDGE_MISMATCH: if wedge surface mentions LinkedIn/Chrome but no feature mentions it
  const wedgeLower = wedge.toLowerCase();
  const featureBlob = features.map((f) => `${f.name} ${f.description} ${f.rationale}`.toLowerCase()).join(" | ");
  if (wedgeLower && wedgeLower.includes("linkedin") && !featureBlob.includes("linkedin")) {
    conflicts.push({
      message: "FEATURE_WEDGE_MISMATCH: wedge mentions LinkedIn but features do not reference LinkedIn.",
      related_fields: ["scope.features", "vision.wedge_statement"],
      target_agent: "scope",
    });
  }

  // ARCH_SCOPE_CREEP: if api_surface supports features not in scope (via "(supports: X)")
  const api = state.architecture?.api_surface ?? [];
  const featureNames = new Set(features.map((f) => (f.name ?? "").toLowerCase().trim()));
  const unsupported = api.some((ep) => {
    const m = ep.match(/\(supports:\s*(.+?)\)/i);
    if (!m) return false;
    const sup = m[1].toLowerCase().trim();
    return sup && !featureNames.has(sup);
  });
  if (unsupported) {
    conflicts.push({
      message: "ARCH_SCOPE_CREEP: api_surface references a feature not in scope.features.",
      related_fields: ["architecture.api_surface", "scope.features"],
      target_agent: "architecture",
    });
  }

  // CHANNEL_ICP_MISMATCH: basic check (if SDR, LinkedIn is acceptable; otherwise leave as conflict)
  if (state.vision?.icp?.role && f10?.channel) {
    const role = state.vision.icp.role.toLowerCase();
    const chan = f10.channel.toLowerCase();
    if (role.includes("sdr") && !(chan.includes("linkedin") || chan.includes("dm"))) {
      conflicts.push({
        message: "CHANNEL_ICP_MISMATCH: SDR ICP usually aligns with LinkedIn DMs; channel seems misaligned.",
        related_fields: ["distribution.first_10_plan.channel", "vision.icp"],
        target_agent: "distribution",
      });
    }
  }

  // --- Revision requests (max 1 per agent, actionable) ---
  const byAgent = new Map<TargetAgent, string[]>();

  function addReq(agent: TargetAgent, instruction: string) {
    if (!byAgent.has(agent)) byAgent.set(agent, []);
    byAgent.get(agent)!.push(instruction);
  }

  for (const v of violations) {
    if (v.target_agent === "vision") {
      addReq("vision", "Rewrite wedge into a single proposition and ensure vision.icp.role is populated.");
    }
    if (v.target_agent === "scope") {
      addReq("scope", "Rewrite the 3 features into Input→Transform→Output aligned to the wedge surface; remove integration/implementation feature names.");
    }
    if (v.target_agent === "distribution") {
      addReq("distribution", "Provide first_10_plan with concrete numbers and timeline 'Days X–Y', and write a <=300 char outreach message with no fake identity (only {first_name} allowed).");
    }
    if (v.target_agent === "architecture") {
      addReq("architecture", "Ensure stack is non-empty and fourteen_day_plan fits within timeline_days; ensure api_surface supports only the 3 features.");
    }
  }

  for (const c of conflicts) {
    addReq(c.target_agent as TargetAgent, c.message);
  }

  for (const [agent, parts] of byAgent.entries()) {
    const instruction = Array.from(new Set(parts)).slice(0, 2).join(" ");
    revision_requests.push({ target_agent: agent, instruction });
  }

  const pass = violations.length === 0;

  const qa: QA = {
    wedge_is_single: wedgeIsSingle,
    violations,
    conflicts,
    revision_requests,
    reruns_triggered: [], // orchestrator fills this
    pass,
  };

  return qa;
}
