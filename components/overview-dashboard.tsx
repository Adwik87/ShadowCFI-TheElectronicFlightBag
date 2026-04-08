import Link from "next/link";

const overviewCards = [
  {
    title: "Plan Review",
    value: "Live",
    description: "Run an AI-assisted weather and route review before dispatch.",
    href: "/plan-review",
  },
  {
    title: "Weather Desk",
    value: "NOAA",
    description: "Compare origin and destination conditions without opening the evaluator.",
    href: "/weather",
  },
  {
    title: "Flight Logs",
    value: "Sync",
    description: "Review prior evaluations and saved decision support history.",
    href: "/logs",
  },
  {
    title: "Flight Planner",
    value: "Core",
    description: "Build the deterministic route engine for winds, fuel, hazards, and nav logs.",
    href: "/planner",
  },
  {
    title: "Briefing",
    value: "AI",
    description: "Turn hard planning outputs into dispatch or CFI-style briefings.",
    href: "/briefing",
  },
];

export function OverviewDashboard() {
  return (
    <div className="space-y-8 p-5 sm:p-8">
      <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,rgba(17,30,51,0.96),rgba(8,16,30,0.98))] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.5em] text-sky-300/80">
            Operations Overview
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            A proper EFB workspace, with AI where it adds judgment instead of clutter.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Shadow CFI is now structured like a working flight deck: separate planning,
            weather, logbook, and aircraft surfaces, all tied together by a shared
            operational shell.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/plan-review"
              className="rounded-full bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white"
            >
              Open Plan Review
            </Link>
            <Link
              href="/weather"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-200"
            >
              Open Weather Desk
            </Link>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500">
            AI Workflows
          </p>
          <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
            <p>Translate METAR and TAF strings into plain-language operational briefings.</p>
            <p>Flag route-altitude mismatches and deteriorating forecast signals before launch.</p>
            <p>Store signed-in evaluations in Supabase so the briefing trail stays reviewable.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {overviewCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:border-sky-300/20 hover:bg-white/7"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                {card.title}
              </p>
              <span className="rounded-full bg-sky-400/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-100">
                {card.value}
              </span>
            </div>
            <p className="mt-4 text-xl font-semibold text-white">{card.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
