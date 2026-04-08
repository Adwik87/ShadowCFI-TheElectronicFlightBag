"use client";

import { FormEvent, useState } from "react";

type BriefingMode = "dispatch" | "training";

type BriefingBundle = {
  planning: {
    riskAssessment: {
      score: number;
      status: "APPROVED" | "MARGINAL" | "REJECTED";
      categories: Array<{ name: string; summary: string }>;
    };
    hazards: {
      advisoryHighlights: string[];
      pirepHighlights: string[];
    };
  };
  evaluation: {
    weather_summary: string;
    cfi_feedback: string;
    status: "APPROVED" | "MARGINAL" | "REJECTED";
  };
};

const defaultAircraft = {
  id: "c172-default",
  displayName: "Cessna 172S",
  aircraftType: "C172S",
  cruiseSpeedKts: 110,
  fuelBurnGph: 9.2,
  enduranceHours: 5.1,
  reserveMinutes: 45,
  emptyWeightLb: 1680,
  maxGrossWeightLb: 2550,
  stationData: [],
  performanceData: {
    climbRateFpm: 730,
    takeoffDistanceFt: 1630,
    landingDistanceFt: 1335,
    serviceCeilingFt: 14000,
  },
};

export function BriefingStation() {
  const [mode, setMode] = useState<BriefingMode>("dispatch");
  const [bundle, setBundle] = useState<BriefingBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuildBriefing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const planningRequest = fetch("/api/planning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure: "KJFK",
          arrival: "KBOS",
          altitudeFt: 6500,
          distanceNm: 165,
          courseMagnetic: 45,
          filingRules: "VFR",
          aircraft: defaultAircraft,
          departureRunways: [
            { runway: "04L", headingMagnetic: 44 },
            { runway: "13R", headingMagnetic: 134 },
          ],
          arrivalRunways: [
            { runway: "04R", headingMagnetic: 44 },
            { runway: "33L", headingMagnetic: 334 },
          ],
        }),
      });

      const evaluationRequest = fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure: "KJFK",
          arrival: "KBOS",
          altitude: 6500,
        }),
      });

      const [planningResponse, evaluationResponse] = await Promise.all([
        planningRequest,
        evaluationRequest,
      ]);

      const planningData = await planningResponse.json();
      const evaluationData = await evaluationResponse.json();

      if (!planningResponse.ok) {
        throw new Error(planningData.details || planningData.error || "Planning bundle failed.");
      }

      if (!evaluationResponse.ok) {
        throw new Error(evaluationData.details || evaluationData.error || "Evaluation bundle failed.");
      }

      setBundle({
        planning: {
          riskAssessment: planningData.planning.riskAssessment,
          hazards: planningData.planning.hazards,
        },
        evaluation: evaluationData.evaluation,
      });
    } catch (briefingError) {
      setBundle(null);
      setError(
        briefingError instanceof Error
          ? briefingError.message
          : "Unable to build briefing bundle.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Briefing
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          FAA-style preflight briefing, training debrief, and dispatch packet synthesis.
        </h2>
      </div>

      <form
        onSubmit={handleBuildBriefing}
        className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm text-slate-300">
            <span className="mr-2 text-xs uppercase tracking-[0.3em] text-slate-500">
              Mode
            </span>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as BriefingMode)}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
            >
              <option value="dispatch">Operational Dispatch</option>
              <option value="training">Explain Like A CFI</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white disabled:opacity-70"
          >
            {loading ? "Building..." : "Build Briefing"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-[1.6rem] border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {bundle ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Executive Summary
            </p>
            <p className="mt-5 text-2xl font-semibold text-white">
              {bundle.planning.riskAssessment.status} / {bundle.planning.riskAssessment.score}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {mode === "dispatch"
                ? bundle.evaluation.weather_summary
                : bundle.evaluation.cfi_feedback}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Actionable Risks
            </p>
            <div className="mt-5 space-y-3">
              {bundle.planning.riskAssessment.categories.map((category) => (
                <div key={category.name} className="rounded-2xl bg-slate-950/55 p-4">
                  <p className="text-sm font-semibold text-white">{category.name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{category.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 xl:col-span-2">
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  Advisory Highlights
                </p>
                <div className="mt-4 space-y-3">
                  {(bundle.planning.hazards.advisoryHighlights.length > 0
                    ? bundle.planning.hazards.advisoryHighlights
                    : ["No advisory highlights returned."]
                  ).map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                  PIREP Highlights
                </p>
                <div className="mt-4 space-y-3">
                  {(bundle.planning.hazards.pirepHighlights.length > 0
                    ? bundle.planning.hazards.pirepHighlights
                    : ["No route-area PIREPs returned."]
                  ).map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
