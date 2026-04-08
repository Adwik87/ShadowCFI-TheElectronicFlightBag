"use client";

import { useState } from "react";

export function ChartsDock() {
  const [airport, setAirport] = useState("KBOS");

  const chartUrl = `https://www.aviationapi.com/charts?apt=${airport}`;
  const afdUrl = `https://www.aviationapi.com/charts/afd?apt=${airport}`;
  const airportInfoUrl = `https://www.aviationapi.com/airport-info`;

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Charts And Documents
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Quick links for airport diagrams, plates, and reference material.
        </h2>
      </div>

      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
        <label className="block max-w-sm">
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Airport ICAO
          </span>
          <input
            value={airport}
            onChange={(event) => setAirport(event.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {[
            {
              title: "Charts",
              description: "Open available procedures and airport documents.",
              href: chartUrl,
            },
            {
              title: "AFD",
              description: "Open the chart supplement / airport directory surface.",
              href: afdUrl,
            },
            {
              title: "Airport Info",
              description: "Use the airport info page for operational airport reference.",
              href: airportInfoUrl,
            },
          ].map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5 transition hover:border-sky-300/20 hover:bg-slate-950/60"
            >
              <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
