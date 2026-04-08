"use client";

import { useMemo, useState } from "react";

const aircraftProfiles = [
  {
    name: "Cessna 172S",
    mission: "Primary training and local cross-country",
    profile: "Balanced baseline for GA planning with conservative reserves.",
    emptyWeight: 1680,
    maxGross: 2550,
    arms: {
      frontSeats: 37,
      rearSeats: 73,
      baggage: 95,
      fuel: 48,
    },
  },
  {
    name: "Cirrus SR22",
    mission: "Higher-speed IFR-capable personal transport",
    profile: "Useful when route planning starts to include longer legs and alternates.",
    emptyWeight: 2350,
    maxGross: 3400,
    arms: {
      frontSeats: 140,
      rearSeats: 180,
      baggage: 208,
      fuel: 153,
    },
  },
  {
    name: "Diamond DA40",
    mission: "Efficient cross-country trainer",
    profile: "Good template for structured performance and fuel planning later.",
    emptyWeight: 1785,
    maxGross: 2646,
    arms: {
      frontSeats: 90,
      rearSeats: 133,
      baggage: 170,
      fuel: 103,
    },
  },
];

export function AircraftHangar() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [frontSeats, setFrontSeats] = useState("340");
  const [rearSeats, setRearSeats] = useState("0");
  const [baggage, setBaggage] = useState("20");
  const [fuelGallons, setFuelGallons] = useState("40");

  const selected = aircraftProfiles[selectedIndex];

  const wb = useMemo(() => {
    const fuelWeight = Number(fuelGallons) * 6;
    const totalWeight =
      selected.emptyWeight +
      Number(frontSeats) +
      Number(rearSeats) +
      Number(baggage) +
      fuelWeight;

    const withinLimits = totalWeight <= selected.maxGross;

    return {
      totalWeight,
      fuelWeight,
      withinLimits,
    };
  }, [baggage, fuelGallons, frontSeats, rearSeats, selected]);

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Aircraft
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Keep aircraft assumptions separate from route judgment.
        </h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {aircraftProfiles.map((aircraft, index) => (
          <div
            key={aircraft.name}
            className={`rounded-[1.6rem] border p-6 transition ${
              selectedIndex === index
                ? "border-sky-300/20 bg-sky-400/8"
                : "border-white/10 bg-white/5"
            }`}
          >
            <button
              type="button"
              onClick={() => setSelectedIndex(index)}
              className="w-full text-left"
            >
            <h3 className="text-2xl font-semibold text-white">{aircraft.name}</h3>
            <p className="mt-3 text-sm text-sky-100">{aircraft.mission}</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{aircraft.profile}</p>
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
            Weight And Balance
          </p>
          <h3 className="mt-4 text-2xl font-semibold text-white">{selected.name}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">
                Front Seats (lb)
              </span>
              <input
                value={frontSeats}
                onChange={(event) => setFrontSeats(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">
                Rear Seats (lb)
              </span>
              <input
                value={rearSeats}
                onChange={(event) => setRearSeats(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">
                Baggage (lb)
              </span>
              <input
                value={baggage}
                onChange={(event) => setBaggage(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-500">
                Fuel (gal)
              </span>
              <input
                value={fuelGallons}
                onChange={(event) => setFuelGallons(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
            Performance Snapshot
          </p>
          <div className="mt-5 space-y-4 text-sm text-slate-200">
            <p>Empty weight: {selected.emptyWeight.toLocaleString()} lb</p>
            <p>Max gross: {selected.maxGross.toLocaleString()} lb</p>
            <p>Fuel weight: {wb.fuelWeight.toLocaleString()} lb</p>
            <p>Total loaded weight: {wb.totalWeight.toLocaleString()} lb</p>
            <p className={wb.withinLimits ? "text-emerald-200" : "text-rose-200"}>
              {wb.withinLimits
                ? "Current loading is within gross-weight limits."
                : "Current loading exceeds max gross weight."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
