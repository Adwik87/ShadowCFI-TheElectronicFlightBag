import { WeatherReport } from "@/lib/types";

const AVIATION_WEATHER_BASE_URL = "https://aviationweather.gov/api/data";

type AviationWeatherJsonRecord = Record<string, unknown>;

function getRawReport(record: AviationWeatherJsonRecord | undefined): string | null {
  if (!record) {
    return null;
  }

  const raw =
    record.rawOb ??
    record.rawTAF ??
    record.raw_text ??
    record.rawText ??
    record.taf ??
    record.metar;

  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

async function fetchAviationWeatherProduct(
  product: "metar" | "taf",
  icao: string,
): Promise<AviationWeatherJsonRecord | null> {
  const url = `${AVIATION_WEATHER_BASE_URL}/${product}?ids=${icao}&format=json`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "shadow-cfi/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch ${product.toUpperCase()} for ${icao}: ${response.status} ${body}`,
    );
  }

  const data = (await response.json()) as unknown;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const [first] = data;
  return typeof first === "object" && first !== null
    ? (first as AviationWeatherJsonRecord)
    : null;
}

export async function fetchAirportWeather(icaoInput: string): Promise<WeatherReport> {
  const icao = icaoInput.trim().toUpperCase();

  const [metarDecoded, tafDecoded] = await Promise.all([
    fetchAviationWeatherProduct("metar", icao),
    fetchAviationWeatherProduct("taf", icao),
  ]);

  return {
    icao,
    metar: getRawReport(metarDecoded ?? undefined),
    taf: getRawReport(tafDecoded ?? undefined),
    metarDecoded,
    tafDecoded,
  };
}
