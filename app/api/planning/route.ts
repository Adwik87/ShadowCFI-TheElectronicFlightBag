import { z } from "zod";

import type { AircraftPerformanceProfile, FilingRules } from "@/lib/efb-types";
import { getAlternateCandidates, scoreAlternate } from "@/lib/alternates";
import {
  buildRouteBoundingBox,
  fetchRouteHazards,
  summarizeRouteHazards,
} from "@/lib/hazards";
import { buildPlanningOutput } from "@/lib/planning";
import { fetchAirportWeather } from "@/lib/weather";

const requestSchema = z.object({
  departure: z.string().trim().length(4),
  arrival: z.string().trim().length(4),
  altitudeFt: z.coerce.number().int().positive().max(60000),
  distanceNm: z.coerce.number().positive().max(5000),
  courseMagnetic: z.coerce.number().min(0).max(359),
  filingRules: z.enum(["VFR", "IFR"]).default("VFR"),
  aircraft: z.object({
    id: z.string(),
    displayName: z.string(),
    aircraftType: z.string(),
    cruiseSpeedKts: z.number().optional(),
    fuelBurnGph: z.number().optional(),
    enduranceHours: z.number().optional(),
    reserveMinutes: z.number().optional(),
    emptyWeightLb: z.number().optional(),
    maxGrossWeightLb: z.number().optional(),
    stationData: z.array(
      z.object({
        name: z.string(),
        armInches: z.number(),
        maxWeightLb: z.number().optional(),
      }),
    ),
    performanceData: z.record(z.string(), z.unknown()),
  }),
  departureRunways: z.array(
    z.object({
      runway: z.string(),
      headingMagnetic: z.number().min(0).max(360),
    }),
  ),
  arrivalRunways: z.array(
    z.object({
      runway: z.string(),
      headingMagnetic: z.number().min(0).max(360),
    }),
  ),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid planning payload.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const departure = parsed.data.departure.toUpperCase();
    const arrival = parsed.data.arrival.toUpperCase();

    const [departureWeather, arrivalWeather] = await Promise.all([
      fetchAirportWeather(departure),
      fetchAirportWeather(arrival),
    ]);

    const bbox = buildRouteBoundingBox(departureWeather, arrivalWeather);
    const routeHazards = bbox
      ? summarizeRouteHazards(await fetchRouteHazards(bbox))
      : {
          icingRisk: "none" as const,
          turbulenceRisk: "none" as const,
          convectiveRisk: "none" as const,
          cloudLayers: [],
          pirepCount: 0,
          advisoryCount: 0,
          notamCount: 0,
          pirepHighlights: [],
          advisoryHighlights: [],
        };

    const alternateCandidates = getAlternateCandidates(arrival);
    const alternateWeather = await Promise.all(
      alternateCandidates.map((airport) => fetchAirportWeather(airport)),
    );
    const alternates = alternateWeather
      .map((weather) => scoreAlternate(weather))
      .sort((a, b) => b.score - a.score);

    const planning = buildPlanningOutput({
      altitudeFt: parsed.data.altitudeFt,
      distanceNm: parsed.data.distanceNm,
      courseMagnetic: parsed.data.courseMagnetic,
      filingRules: parsed.data.filingRules as FilingRules,
      departureWeather,
      arrivalWeather,
      aircraft: parsed.data.aircraft as AircraftPerformanceProfile,
      departureRunways: parsed.data.departureRunways,
      arrivalRunways: parsed.data.arrivalRunways,
    }, routeHazards);

    return Response.json({
      departure,
      arrival,
      departureWeather,
      arrivalWeather,
      planning,
      alternates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected planning failure.";

    return Response.json(
      { error: "Unable to build flight plan analysis.", details: message },
      { status: 500 },
    );
  }
}
