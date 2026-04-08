"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Dashboard", code: "OVR" },
  { href: "/plan-review", label: "Plan Review", code: "CFI" },
  { href: "/planner", label: "Flight Planner", code: "PLN" },
  { href: "/briefing", label: "Briefing", code: "BRF" },
  { href: "/weather", label: "Weather Desk", code: "WX" },
  { href: "/charts", label: "Charts", code: "DOC" },
  { href: "/logs", label: "Logs", code: "LOG" },
  { href: "/aircraft", label: "Aircraft", code: "ACF" },
  { href: "/settings", label: "Settings", code: "SYS" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function FlightDeckShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_22%),linear-gradient(180deg,#040b16_0%,#020814_52%,#01050d_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-b border-white/8 bg-slate-950/55 px-4 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
              Shadow CFI
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Flight Deck
            </h1>
            <p className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-400">
              Agentic EFB for planning, weather review, and pilot decision support.
            </p>
          </div>

          <nav className="mt-8 grid gap-2">
            {navigation.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-2xl px-4 py-3 transition ${
                    active
                      ? "border border-sky-300/15 bg-sky-400/10 text-white shadow-[0_12px_30px_rgba(14,165,233,0.12)]"
                      : "border border-transparent text-slate-300 hover:border-white/8 hover:bg-white/6 hover:text-white"
                  }`}
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${
                      active
                        ? "bg-sky-300/12 text-sky-100"
                        : "bg-slate-900/80 text-slate-500 group-hover:text-slate-300"
                    }`}
                  >
                    {item.code}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Active Stack
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>AI Briefing</span>
                <span className="text-sky-200">Groq</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Weather</span>
                <span className="text-sky-200">NOAA AWC</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Flight Logs</span>
                <span className="text-sky-200">Supabase</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(10,18,33,0.96),rgba(4,10,19,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
