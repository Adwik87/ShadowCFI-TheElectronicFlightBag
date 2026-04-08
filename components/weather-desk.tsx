"use client";

import { FormEvent, useState } from "react";

import type { WeatherReport } from "@/lib/types";

type WeatherDeskResponse = {
  airports: WeatherReport[];
};

function WeatherStation({ report }: { report: WeatherReport }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            Airport
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{report.icao}</h3>
        </div>
        <span className="rounded-full bg-sky-400/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-100">
          Weather
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
            METAR
          </p>
          <div className="rounded-2xl bg-slate-950/60 p-4 font-mono text-xs leading-6 text-slate-200">
            {report.metar ?? "No current METAR available."}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
            TAF
          </p>
          <div className="rounded-2xl bg-slate-950/60 p-4 font-mono text-xs leading-6 text-slate-200">
            {report.taf ?? "No current TAF available."}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeatherDesk() {
  const [airports, setAirports] = useState("KJFK, KBOS");
  const [data, setData] = useState<WeatherDeskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/weather?airports=${encodeURIComponent(airports)}`,
      );
      const payload = (await response.json()) as WeatherDeskResponse & {
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(payload.details || payload.error || "Weather lookup failed.");
      }

      setData(payload);
    } catch (lookupError) {
      setData(null);
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to load airport weather.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Weather Desk
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Compare stations without entering the AI review loop.
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Airports
            </span>
            <input
              value={airports}
              onChange={(event) => setAirports(event.target.value.toUpperCase())}
              placeholder="KJFK, KBOS, KTEB"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-base tracking-[0.18em] text-white outline-none transition focus:border-sky-300/50"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="self-end rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white disabled:opacity-70"
          >
            {loading ? "Loading..." : "Load Weather"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-[1.6rem] border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(data?.airports ?? []).map((report) => (
          <WeatherStation key={report.icao} report={report} />
        ))}
      </div>
    </div>
  );
}
