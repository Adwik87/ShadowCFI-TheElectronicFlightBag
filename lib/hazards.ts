import type { WeatherHazardSummary } from "@/lib/efb-types";
import type { WeatherReport } from "@/lib/types";

type HazardRecord = Record<string, unknown>;

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

function parseCoords(record: HazardRecord) {
  const coords = record.coords;
  if (!Array.isArray(coords)) return [];

  return coords
    .map((coord) => {
      if (typeof coord !== "object" || coord === null) return null;
      const lat = Number((coord as Record<string, unknown>).lat);
      const lon = Number((coord as Record<string, unknown>).lon);
      return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    })
    .filter((coord): coord is { lat: number; lon: number } => coord !== null);
}

function intersectsBox(coords: Array<{ lat: number; lon: number }>, bbox: BoundingBox) {
  return coords.some(
    (coord) =>
      coord.lat >= bbox.minLat &&
      coord.lat <= bbox.maxLat &&
      coord.lon >= bbox.minLon &&
      coord.lon <= bbox.maxLon,
  );
}

async function fetchJsonArray(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "shadow-cfi/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Hazard fetch failed: ${response.status} ${body}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    return [];
  }

  const data = JSON.parse(text) as unknown;
  return Array.isArray(data) ? (data as HazardRecord[]) : [];
}

export function buildRouteBoundingBox(
  departureWeather: WeatherReport,
  arrivalWeather: WeatherReport,
  padding = 1.5,
): BoundingBox | null {
  const departure = departureWeather.metarDecoded as Record<string, unknown> | null;
  const arrival = arrivalWeather.metarDecoded as Record<string, unknown> | null;

  const depLat = Number(departure?.lat);
  const depLon = Number(departure?.lon);
  const arrLat = Number(arrival?.lat);
  const arrLon = Number(arrival?.lon);

  if (![depLat, depLon, arrLat, arrLon].every(Number.isFinite)) {
    return null;
  }

  return {
    minLon: Math.min(depLon, arrLon) - padding,
    minLat: Math.min(depLat, arrLat) - padding,
    maxLon: Math.max(depLon, arrLon) + padding,
    maxLat: Math.max(depLat, arrLat) + padding,
  };
}

export async function fetchRouteHazards(bbox: BoundingBox) {
  const bboxParam = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;

  const [pireps, gairmets, sigmets] = await Promise.all([
    fetchJsonArray(
      `https://aviationweather.gov/api/data/pirep?format=json&bbox=${bboxParam}`,
    ),
    fetchJsonArray("https://aviationweather.gov/api/data/gairmet?format=json"),
    fetchJsonArray(
      "https://aviationweather.gov/api/data/airsigmet?format=json&hazard=all",
    ),
  ]);

  const filteredGairmets = gairmets.filter((record) =>
    intersectsBox(parseCoords(record), bbox),
  );
  const filteredSigmets = sigmets.filter((record) =>
    intersectsBox(parseCoords(record), bbox),
  );

  return {
    pireps,
    gairmets: filteredGairmets,
    sigmets: filteredSigmets,
  };
}

export function summarizeRouteHazards(hazards: {
  pireps: HazardRecord[];
  gairmets: HazardRecord[];
  sigmets: HazardRecord[];
}): WeatherHazardSummary & {
  pirepHighlights: string[];
  advisoryHighlights: string[];
} {
  const allAdvisories = [...hazards.gairmets, ...hazards.sigmets];
  const hazardStrings = allAdvisories
    .map((record) => String(record.hazard ?? ""))
    .filter(Boolean);

  const hasIcing = hazardStrings.some((hazard) => hazard.includes("ICE"));
  const hasTurb =
    hazardStrings.some((hazard) => hazard.includes("TURB")) ||
    hazardStrings.some((hazard) => hazard.includes("LLWS"));
  const hasConvective = hazardStrings.some((hazard) => hazard.includes("CONVECTIVE"));
  const freezingLevelRecord = allAdvisories.find(
    (record) => String(record.hazard ?? "").includes("FZLVL"),
  );

  const pirepHighlights = hazards.pireps.slice(0, 5).map((record) => {
    const raw = record.rawOb ?? record.raw_text ?? record.rawText ?? record.report_type;
    return typeof raw === "string" ? raw : "Pilot report available in route area.";
  });

  const advisoryHighlights = allAdvisories.slice(0, 5).map((record) => {
    const dueTo = typeof record.due_to === "string" && record.due_to.length > 0
      ? ` due to ${record.due_to}`
      : "";
    return `${String(record.product ?? "Advisory")} ${String(record.hazard ?? "")}${dueTo}`.trim();
  });

  return {
    icingRisk: hasIcing ? "moderate" : "none",
    turbulenceRisk: hasTurb ? "moderate" : "none",
    convectiveRisk: hasConvective ? "high" : "none",
    freezingLevelFtMsl:
      freezingLevelRecord && Number.isFinite(Number(freezingLevelRecord.level))
        ? Number(freezingLevelRecord.level) * 100
        : undefined,
    pirepCount: hazards.pireps.length,
    advisoryCount: allAdvisories.length,
    notamCount: 0,
    cloudLayers: [],
    pirepHighlights,
    advisoryHighlights,
  };
}
