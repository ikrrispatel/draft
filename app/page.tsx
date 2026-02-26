import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-zinc-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_60%)] blur-2xl animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 left-1/3 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_60%)] blur-2xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,63,94,0.10),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,197,94,0.10),transparent_45%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.10),transparent_45%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,rgba(0,0,0,0.35)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.35)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-zinc-900" />
          <span className="text-sm font-semibold tracking-tight">Draft</span>
        </div>

        <Link
          href="/draft"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Open Draft →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-20 text-center md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs text-zinc-600 backdrop-blur">
          Deterministic scoring • Hard constraints • No fluff
        </div>

        <h1 className="mt-8 text-balance text-5xl font-semibold tracking-tight md:text-7xl">
          One wedge. Three features.
          <br />
          Ship in 14 days.
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base text-zinc-600 md:text-lg">
          Draft turns vague AI SaaS ideas into an execution-ready blueprint: scoped MVP, architecture, first-10 plan,
          outreach message, and a deterministic readiness score.
        </p>

        {/* Single primary CTA */}
        <div className="mt-10 flex flex-col items-center">
          <Link
            href="/draft"
            className="rounded-full bg-zinc-900 px-7 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Generate a blueprint
          </Link>

          <div className="mt-3 text-xs text-zinc-500">
            Runs locally with Ollama • No account • No database • Export Markdown
          </div>

          <a href="#how" className="mt-3 text-sm font-semibold text-zinc-700 hover:text-zinc-900">
            See how it works →
          </a>
        </div>

        {/* Output preview card */}
        <div className="mt-8 w-full max-w-5xl rounded-3xl border border-zinc-100 bg-white/75 p-6 text-left backdrop-blur shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-500">OUTPUT PREVIEW</div>
              <div className="mt-2 text-lg font-semibold text-zinc-900">Example blueprint output</div>
              <div className="mt-2 text-sm text-zinc-600">
                <span className="font-semibold text-zinc-900">Wedge:</span>{" "}
                Chrome extension on LinkedIn generates a personalized first-line from the profile and copies it to your
                sequence in one click.
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniCard title="Feature 1 (Input)" body="LinkedIn Profile Capture" />
                <MiniCard title="Feature 2 (Transform)" body="First-line Generator" />
                <MiniCard title="Feature 3 (Output)" body="Copy to Sequence" />
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:w-[260px]">
              <div className="text-xs font-semibold text-zinc-500">EXECUTION READINESS</div>
              <div className="mt-1 text-4xl font-semibold">86/100</div>
              <div className="mt-2 text-xs text-zinc-600">Vision 90 • Scope 95 • Feas 80 • Dist 85</div>
              <div className="mt-3 text-xs text-zinc-500">
                Deterministic scoring — identical input yields identical score.
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div
          id="how"
          className="mt-12 w-full max-w-4xl rounded-3xl border border-zinc-100 bg-white/65 p-6 text-left backdrop-blur shadow-[0_10px_30px_rgba(0,0,0,0.05)]"
        >
          <div className="grid gap-6 md:grid-cols-3">
            <Step title="STEP 1" heading="Lock the wedge" body="Force a single surface + workflow + output. No generic “saves time” wedges." />
            <Step title="STEP 2" heading="Scope the MVP" body="Exactly 3 features + 3 kill-list items. Input → Transform → Output." />
            <Step title="STEP 3" heading="Score readiness" body="Deterministic scoring + QA enforcement. Blueprint exported as Markdown." />
          </div>
        </div>

        <div className="mt-10 mb-16 max-w-4xl text-sm text-zinc-600">
          Draft is opinionated by design: it punishes scope creep and forces distribution. That’s the point.
        </div>
      </section>
    </main>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <div className="text-xs font-semibold text-zinc-500">{title}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{body}</div>
    </div>
  );
}

function Step({ title, heading, body }: { title: string; heading: string; body: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-zinc-500">{title}</div>
      <div className="mt-2 text-base font-semibold">{heading}</div>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
    </div>
  );
}