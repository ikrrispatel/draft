"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Intake = {
  idea_summary: string;
  problem_statement: string;
  target_buyer: { role: string; industry: string; company_size: string };
  ai_component: string;
  constraints: { timeline_days: number; skill_level: string; budget: string };
  existing_alternatives: string[];
};

type DraftResponse = any;

function defaultIntake(): Intake {
  return {
    idea_summary:
      "AI-powered cold email personaliser that generates custom opening lines from LinkedIn profile data for B2B sales reps",
    problem_statement:
      "SDRs spend 10+ minutes per prospect manually researching and writing personalised email openers, limiting daily outbound volume",
    target_buyer: { role: "SDR", industry: "B2B SaaS", company_size: "10-50 employees" },
    ai_component: "Generate a personalized first-line from LinkedIn profile context",
    constraints: { timeline_days: 14, skill_level: "advanced", budget: "low" },
    existing_alternatives: ["Lemlist", "Instantly", "Manual research"],
  };
}

const STEPS = [
  "Validate intake",
  "Vision",
  "Scope",
  "Distribution",
  "Architecture",
  "Deterministic QA",
  "Deterministic scoring",
  "Assemble blueprint",
];

export default function DraftAppPage() {
  const [intake, setIntake] = useState<Intake>(() => defaultIntake());
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<DraftResponse | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  const alternativesText = useMemo(
    () => intake.existing_alternatives.join(", "),
    [intake.existing_alternatives]
  );

  async function runDraft() {
    setStatus("running");
    setError("");
    setResult(null);
    setActiveStep(0);

    const t = setInterval(() => {
      setActiveStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 650);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intake),
      });

      const data = await res.json();

      if (!res.ok) {
        clearInterval(t);
        setStatus("error");
        setError(data?.error ?? "Request failed");
        setActiveStep(0);
        return;
      }

      clearInterval(t);
      setResult(data);
      setStatus("done");
      setActiveStep(STEPS.length - 1);
    } catch (e: any) {
      clearInterval(t);
      setStatus("error");
      setError(e?.message ?? "Unknown error");
      setActiveStep(0);
    }
  }

  function downloadBlueprint() {
    if (!result?.blueprint_md) return;
    const blob = new Blob([result.blueprint_md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft-blueprint.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  const overall = result?.scores?.overall ?? null;
  const qaPass = result?.qa?.pass ?? null;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-zinc-900" />
          <div className="text-sm font-semibold">Draft</div>
          <div className="hidden text-xs text-zinc-500 md:block">
            Execution discipline for AI builders
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runDraft}
            disabled={status === "running"}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {status === "running" ? "Running…" : "Run Draft"}
          </button>
          <button
            onClick={downloadBlueprint}
            disabled={!result?.blueprint_md}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            Download .md
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-16 md:grid-cols-2">
        {/* Intake */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold">Intake</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Keep it tight. Draft will punish scope creep.
          </p>

          <div className="mt-5 space-y-4">
            <Field label="Idea summary">
              <textarea
                className="min-h-[90px] w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                value={intake.idea_summary}
                onChange={(e) => setIntake({ ...intake, idea_summary: e.target.value })}
              />
            </Field>

            <Field label="Problem statement">
              <textarea
                className="min-h-[90px] w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                value={intake.problem_statement}
                onChange={(e) =>
                  setIntake({ ...intake, problem_statement: e.target.value })
                }
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Buyer role">
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.target_buyer.role}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      target_buyer: { ...intake.target_buyer, role: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Industry">
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.target_buyer.industry}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      target_buyer: {
                        ...intake.target_buyer,
                        industry: e.target.value,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Company size">
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.target_buyer.company_size}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      target_buyer: {
                        ...intake.target_buyer,
                        company_size: e.target.value,
                      },
                    })
                  }
                />
              </Field>
            </div>

            <Field label="AI component">
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                value={intake.ai_component}
                onChange={(e) => setIntake({ ...intake, ai_component: e.target.value })}
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Timeline (days)">
                <input
                  type="number"
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.constraints.timeline_days}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      constraints: {
                        ...intake.constraints,
                        timeline_days: Number(e.target.value || 14),
                      },
                    })
                  }
                />
              </Field>
              <Field label="Skill level">
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.constraints.skill_level}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      constraints: { ...intake.constraints, skill_level: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Budget">
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                  value={intake.constraints.budget}
                  onChange={(e) =>
                    setIntake({
                      ...intake,
                      constraints: { ...intake.constraints, budget: e.target.value },
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Existing alternatives (comma-separated)">
              <input
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                value={alternativesText}
                onChange={(e) =>
                  setIntake({
                    ...intake,
                    existing_alternatives: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>
        </section>

        {/* Output */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Output</h2>
            <div className="text-xs text-zinc-500">
              {status === "idle" && "Ready"}
              {status === "running" && "Running…"}
              {status === "done" && "Done"}
              {status === "error" && "Error"}
            </div>
          </div>

          {status === "running" && (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">PIPELINE</div>
              <div className="mt-3 grid gap-2">
                {STEPS.map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      i === activeStep
                        ? "border-zinc-300 bg-white"
                        : i < activeStep
                        ? "border-zinc-200 bg-white/70 text-zinc-700"
                        : "border-zinc-200 bg-transparent text-zinc-500"
                    }`}
                  >
                    <span>{s}</span>
                    <span className="text-xs">
                      {i < activeStep ? "✓" : i === activeStep ? "…" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-semibold">Request failed</div>
              <div className="mt-2 break-words text-xs">{error}</div>
            </div>
          )}

          {status === "idle" && (
            <div className="mt-6 text-sm text-zinc-600">
              Click <span className="font-semibold text-zinc-900">Run Draft</span>{" "}
              to generate a scoped blueprint and readiness score.
            </div>
          )}

          {status === "done" && result && (
            <div className="mt-6 space-y-5">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500">
                      EXECUTION READINESS
                    </div>
                    <div className="mt-1 text-3xl font-semibold">{overall ?? "—"}/100</div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge label={`Vision ${result.scores?.vision_clarity ?? "—"}`} />
                      <Badge label={`Scope ${result.scores?.scope_discipline ?? "—"}`} />
                      <Badge label={`Feas ${result.scores?.feasibility ?? "—"}`} />
                      <Badge label={`Dist ${result.scores?.distribution_readiness ?? "—"}`} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500">QA</span>
                    {qaPass === true && <StatusPill tone="good" text="PASS" />}
                    {qaPass === false && <StatusPill tone="bad" text="FAIL" />}
                    {qaPass === null && <StatusPill tone="neutral" text="—" />}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyText(result.blueprint_md ?? "")}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                  Copy blueprint
                </button>
                <button
                  onClick={() => copyText(JSON.stringify(result, null, 2))}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                >
                  Copy JSON
                </button>
              </div>

              <div className="rounded-3xl border border-zinc-200">
                <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
                  <div className="text-sm font-semibold">Blueprint</div>
                  <div className="text-xs text-zinc-500">Rendered Markdown</div>
                </div>

                <div className="max-h-[560px] overflow-auto px-4 py-4">
                  <article className="prose prose-zinc max-w-none prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:text-zinc-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.blueprint_md ?? ""}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-zinc-600">{label}</div>
      {children}
    </label>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700">
      {label}
    </span>
  );
}

function StatusPill({
  tone,
  text,
}: {
  tone: "good" | "bad" | "neutral";
  text: string;
}) {
  const cls =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-zinc-200 bg-white text-zinc-600";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>
      {text}
    </span>
  );
}
