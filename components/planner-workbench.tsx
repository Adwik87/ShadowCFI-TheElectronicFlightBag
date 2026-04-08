"use client";

import { FormEvent, useState } from "react";

type PlanningResponse = {
  departure: string;
  arrival: string;
  alternates: Array<{
    icao: string;
    score: number;
    summary: string;
    weather: {
      metar: string | null;
      taf: string | null;
    };
  }>;
  planning: {
    windsAloft: {
      direction: number;
      speed: number;
      headwindComponent: number;
      crosswindComponent: number;
      groundspeedKts: number;
    };
    altitudeValidation: {
      valid: boolean;
      summary: string;
    };
    fuelPlan: {
      totalRequiredFuelGal: number;
      tripFuelGal: number;
      reserveFuelGal: number;
      rangeNm: number;
    };
    performance: {
      departureDensityAltitudeFt: number;
      departurePressureAltitudeFt: number;
      warnings: string[];
    };
    hazards: {
      icingRisk: string;
      turbulenceRisk: string;
      convectiveRisk: string;
      freezingLevelFtMsl?: number;
      pirepCount?: number;
      advisoryCount?: number;
      pirepHighlights: string[];
      advisoryHighlights: string[];
    };
    runwayAnalysis: {
      departure: Array<{
        runway: string;
        crosswind: number;
        headwind: number;
        tailwind: number;
      }>;
      arrival: Array<{
        runway: string;
        crosswind: number;
        headwind: number;
        tailwind: number;
      }>;
    };
    riskAssessment: {
      score: number;
      status: "APPROVED" | "MARGINAL" | "REJECTED";
      categories: Array<{
        name: string;
        summary: string;
      }>;
    };
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

export function PlannerWorkbench() {
  const [departure, setDeparture] = useState("KJFK");
  const [arrival, setArrival] = useState("KBOS");
  const [altitudeFt, setAltitudeFt] = useState("6500");
  const [distanceNm, setDistanceNm] = useState("165");
  const [courseMagnetic, setCourseMagnetic] = useState("045");
  const [filingRules, setFilingRules] = useState<"VFR" | "IFR">("VFR");
  const [result, setResult] = useState<PlanningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/planning", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departure,
          arrival,
          altitudeFt: Number(altitudeFt),
          distanceNm: Number(distanceNm),
          courseMagnetic: Number(courseMagnetic),
          filingRules,
          aircraft: defaultAircraft,
          departureRunways: [
            { runway: "04L", headingMagnetic: 44 },
            { runway: "13R", headingMagnetic: 134 },
            { runway: "22L", headingMagnetic: 224 },
          ],
          arrivalRunways: [
            { runway: "04R", headingMagnetic: 44 },
            { runway: "15R", headingMagnetic: 154 },
            { runway: "33L", headingMagnetic: 334 },
          ],
        }),
      });

      const payload = (await response.json()) as PlanningResponse & {
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(payload.details || payload.error || "Planning failed.");
      }

      setResult(payload);
    } catch (planningError) {
      setResult(null);
      setError(
        planningError instanceof Error
          ? planningError.message
          : "Unable to build the flight planning analysis.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-4xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Flight Planner
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Deterministic planning engine for winds, fuel, runway fit, and route risk.
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-white/5 p-5 xl:grid-cols-6"
      >
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Departure
          </span>
          <input
            value={departure}
            onChange={(event) => setDeparture(event.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Arrival
          </span>
          <input
            value={arrival}
            onChange={(event) => setArrival(event.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Altitude
          </span>
          <input
            value={altitudeFt}
            onChange={(event) => setAltitudeFt(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Distance NM
          </span>
          <input
            value={distanceNm}
            onChange={(event) => setDistanceNm(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Course
          </span>
          <input
            value={courseMagnetic}
            onChange={(event) => setCourseMagnetic(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] uppercase tracking-[0.3em] text-slate-500">
            Rules
          </span>
          <select
            value={filingRules}
            onChange={(event) => setFilingRules(event.target.value as "VFR" | "IFR")}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          >
            <option value="VFR">VFR</option>
            <option value="IFR">IFR</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="xl:col-span-6 rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white disabled:opacity-70"
        >
          {loading ? "Computing..." : "Run Planning Analysis"}
        </button>
      </form>

      {error ? (
        <div className="rounded-[1.6rem] border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Winds Aloft
            </p>
            <div className="mt-5 grid gap-3 text-sm text-slate-200">
              <p>
                {result.planning.windsAloft.direction}° at {result.planning.windsAloft.speed} kt
              </p>
              <p>Groundspeed: {result.planning.windsAloft.groundspeedKts} kt</p>
              <p>Headwind: {result.planning.windsAloft.headwindComponent} kt</p>
              <p>Crosswind drift: {result.planning.windsAloft.crosswindComponent} kt</p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Fuel Plan
            </p>
            <div className="mt-5 grid gap-3 text-sm text-slate-200">
              <p>Total required: {result.planning.fuelPlan.totalRequiredFuelGal} gal</p>
              <p>Trip fuel: {result.planning.fuelPlan.tripFuelGal} gal</p>
              <p>Reserve fuel: {result.planning.fuelPlan.reserveFuelGal} gal</p>
              <p>Estimated range: {result.planning.fuelPlan.rangeNm} nm</p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Altitude Validation
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-200">
              {result.planning.altitudeValidation.summary}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Hazard Layer
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-200">
              <p>Icing risk: {result.planning.hazards.icingRisk}</p>
              <p>Turbulence risk: {result.planning.hazards.turbulenceRisk}</p>
              <p>Convective risk: {result.planning.hazards.convectiveRisk}</p>
              <p>PIREP count: {result.planning.hazards.pirepCount ?? 0}</p>
              <p>Advisories: {result.planning.hazards.advisoryCount ?? 0}</p>
              {result.planning.hazards.freezingLevelFtMsl ? (
                <p>Freezing level: {result.planning.hazards.freezingLevelFtMsl.toLocaleString()} ft MSL</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Performance
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-200">
              <p>
                Pressure altitude: {result.planning.performance.departurePressureAltitudeFt.toLocaleString()} ft
              </p>
              <p>
                Density altitude: {result.planning.performance.departureDensityAltitudeFt.toLocaleString()} ft
              </p>
              {(result.planning.performance.warnings.length > 0
                ? result.planning.performance.warnings
                : ["No immediate density-altitude performance warning in this early-pass check."]
              ).map((item) => (
                <div key={item} className="rounded-2xl bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Weighted Risk
            </p>
            <p className="mt-5 text-2xl font-semibold text-white">
              {result.planning.riskAssessment.status} / {result.planning.riskAssessment.score}
            </p>
            <div className="mt-4 space-y-3">
              {result.planning.riskAssessment.categories.map((category) => (
                <div key={category.name} className="rounded-2xl bg-slate-950/55 p-4">
                  <p className="text-sm font-semibold text-white">{category.name}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{category.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 xl:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Route Advisories and PIREPs
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">Advisories</p>
                {(result.planning.hazards.advisoryHighlights.length > 0
                  ? result.planning.hazards.advisoryHighlights
                  : ["No active route-area advisories returned for this corridor."]
                ).map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white">PIREPs</p>
                {(result.planning.hazards.pirepHighlights.length > 0
                  ? result.planning.hazards.pirepHighlights
                  : ["No route-area PIREPs returned for this bounding box right now."]
                ).map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-950/55 p-4 text-sm leading-6 text-slate-300">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 xl:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Alternate Airport Scoring
            </p>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              {result.alternates.length > 0 ? (
                result.alternates.map((alternate) => (
                  <div
                    key={alternate.icao}
                    className="rounded-2xl bg-slate-950/55 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-white">{alternate.icao}</p>
                      <span className="rounded-full bg-sky-400/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-sky-100">
                        {alternate.score}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {alternate.summary}
                    </p>
                    <p className="mt-3 font-mono text-xs leading-6 text-slate-400">
                      {alternate.weather.metar ?? "No METAR available."}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl bg-slate-950/55 p-4 text-sm text-slate-300 xl:col-span-3">
                  No alternate candidates are configured yet for this arrival airport.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
