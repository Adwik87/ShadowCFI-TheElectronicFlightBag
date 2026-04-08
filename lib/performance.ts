import type { AircraftPerformanceProfile } from "@/lib/efb-types";
import type { WeatherReport } from "@/lib/types";

export interface DensityAltitudeResult {
  pressureAltitudeFt: number;
  densityAltitudeFt: number;
  performanceWarnings: string[];
}

function readElevation(report: WeatherReport) {
  const decoded = report.metarDecoded as Record<string, unknown> | null;
  return typeof decoded?.elev === "number" ? decoded.elev : 0;
}

function readTemperatureC(report: WeatherReport) {
  const decoded = report.metarDecoded as Record<string, unknown> | null;
  return typeof decoded?.temp === "number" ? decoded.temp : 15;
}

function readAltimeterInHg(report: WeatherReport) {
  const decoded = report.metarDecoded as Record<string, unknown> | null;
  const rawAltim = decoded?.altim;
  if (typeof rawAltim !== "number") {
    return 29.92;
  }

  return rawAltim > 100 ? Number((rawAltim / 33.8639).toFixed(2)) : rawAltim;
}

export function calculateDensityAltitude(
  report: WeatherReport,
  aircraft: AircraftPerformanceProfile,
): DensityAltitudeResult {
  const fieldElevationFt = readElevation(report);
  const temperatureC = readTemperatureC(report);
  const altimeterInHg = readAltimeterInHg(report);

  const pressureAltitudeFt = Math.round(
    fieldElevationFt + (29.92 - altimeterInHg) * 1000,
  );
  const isaTempC = 15 - 2 * (pressureAltitudeFt / 1000);
  const densityAltitudeFt = Math.round(
    pressureAltitudeFt + 120 * (temperatureC - isaTempC),
  );

  const warnings: string[] = [];

  if (densityAltitudeFt >= 3000) {
    warnings.push(
      `Density altitude is elevated at approximately ${densityAltitudeFt.toLocaleString()} ft.`,
    );
  }

  if (
    typeof aircraft.performanceData.serviceCeilingFt === "number" &&
    densityAltitudeFt >= aircraft.performanceData.serviceCeilingFt * 0.75
  ) {
    warnings.push("Density altitude is consuming a meaningful part of the aircraft service ceiling.");
  }

  if (
    typeof aircraft.performanceData.takeoffDistanceFt === "number" &&
    densityAltitudeFt >= 4000
  ) {
    warnings.push("Expect degraded takeoff performance and review runway margin carefully.");
  }

  return {
    pressureAltitudeFt,
    densityAltitudeFt,
    performanceWarnings: warnings,
  };
}
