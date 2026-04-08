import type {
  AircraftPerformanceProfile,
  FilingRules,
  RouteRiskAssessment,
  RunwayWindComponent,
  WeatherHazardSummary,
} from "@/lib/efb-types";
import { calculateDensityAltitude } from "@/lib/performance";
import type { WeatherReport } from "@/lib/types";

export interface PlanningInputs {
  altitudeFt: number;
  distanceNm: number;
  courseMagnetic: number;
  filingRules: FilingRules;
  departureWeather: WeatherReport;
  arrivalWeather: WeatherReport;
  aircraft: AircraftPerformanceProfile;
  departureRunways: Array<{ runway: string; headingMagnetic: number }>;
  arrivalRunways: Array<{ runway: string; headingMagnetic: number }>;
}

export interface PlanningOutput {
  windsAloft: {
    direction: number;
    speed: number;
    headwindComponent: number;
    crosswindComponent: number;
    groundspeedKts: number;
  };
  runwayAnalysis: {
    departure: RunwayWindComponent[];
    arrival: RunwayWindComponent[];
  };
  altitudeValidation: {
    valid: boolean;
    summary: string;
  };
  fuelPlan: {
    taxiFuelGal: number;
    tripFuelGal: number;
    reserveFuelGal: number;
    contingencyFuelGal: number;
    totalRequiredFuelGal: number;
    enduranceHours: number;
    rangeNm: number;
  };
  performance: {
    departureDensityAltitudeFt: number;
    departurePressureAltitudeFt: number;
    warnings: string[];
  };
  hazards: WeatherHazardSummary & {
    pirepHighlights: string[];
    advisoryHighlights: string[];
  };
  riskAssessment: RouteRiskAssessment;
}

function normalizeWindDirection(direction: number) {
  const normalized = direction % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function angleDelta(a: number, b: number) {
  const diff = Math.abs(normalizeWindDirection(a) - normalizeWindDirection(b));
  return diff > 180 ? 360 - diff : diff;
}

export function calculateRunwayWindComponent(
  runway: string,
  headingMagnetic: number,
  windDirection: number,
  windSpeed: number,
): RunwayWindComponent {
  const deltaRadians = (angleDelta(headingMagnetic, windDirection) * Math.PI) / 180;
  const headwind = Math.round(Math.cos(deltaRadians) * windSpeed);
  const crosswind = Math.round(Math.sin(deltaRadians) * windSpeed);

  return {
    runway,
    headingMagnetic,
    windDirection,
    windSpeed,
    headwind: Math.max(headwind, 0),
    tailwind: Math.max(headwind * -1, 0),
    crosswind: Math.abs(crosswind),
  };
}

function deriveSurfaceWind(report: WeatherReport) {
  const decoded = report.metarDecoded as Record<string, unknown> | null;

  return {
    direction: typeof decoded?.wdir === "number" ? decoded.wdir : 0,
    speed: typeof decoded?.wspd === "number" ? decoded.wspd : 0,
  };
}

function estimateWindsAloft(courseMagnetic: number, altitudeFt: number) {
  const direction = normalizeWindDirection(courseMagnetic + 35);
  const speed = Math.max(8, Math.round(altitudeFt / 2000) + 6);
  return { direction, speed };
}

function computeGroundspeed(
  courseMagnetic: number,
  trueAirspeedKts: number,
  windDirection: number,
  windSpeed: number,
) {
  const deltaRadians = (angleDelta(courseMagnetic, windDirection) * Math.PI) / 180;
  const headwindComponent = Math.round(Math.cos(deltaRadians) * windSpeed);
  const crosswindComponent = Math.round(Math.sin(deltaRadians) * windSpeed);

  return {
    headwindComponent,
    crosswindComponent: Math.abs(crosswindComponent),
    groundspeedKts: Math.max(55, trueAirspeedKts - headwindComponent),
  };
}

function validateCruisingAltitude(
  altitudeFt: number,
  courseMagnetic: number,
  filingRules: FilingRules,
) {
  if (filingRules === "IFR") {
    return {
      valid: altitudeFt >= 1000,
      summary:
        altitudeFt >= 1000
          ? "IFR altitude is structurally acceptable for this early-pass check."
          : "IFR planning requires an altitude above 1,000 ft MSL.",
    };
  }

  const eastbound = courseMagnetic < 180;
  const valid = altitudeFt % 2000 === (eastbound ? 500 : 1500);

  return {
    valid,
    summary: valid
      ? "VFR cruising altitude follows the hemispherical rule."
      : `For ${eastbound ? "eastbound" : "westbound"} VFR flight, use a ${
          eastbound ? "odd + 500" : "even + 500"
        } altitude.`,
  };
}

function calculateFuelPlan(
  distanceNm: number,
  groundspeedKts: number,
  aircraft: AircraftPerformanceProfile,
) {
  const fuelBurnGph = aircraft.fuelBurnGph ?? 9;
  const taxiFuelGal = 1;
  const tripFuelGal = Number(((distanceNm / groundspeedKts) * fuelBurnGph).toFixed(2));
  const reserveFuelGal = Number(
    (((aircraft.reserveMinutes ?? 45) / 60) * fuelBurnGph).toFixed(2),
  );
  const contingencyFuelGal = Number((tripFuelGal * 0.1).toFixed(2));
  const totalRequiredFuelGal = Number(
    (taxiFuelGal + tripFuelGal + reserveFuelGal + contingencyFuelGal).toFixed(2),
  );
  const enduranceHours =
    aircraft.enduranceHours ?? Number(((totalRequiredFuelGal + 5) / fuelBurnGph).toFixed(2));
  const rangeNm = Number((enduranceHours * groundspeedKts).toFixed(0));

  return {
    taxiFuelGal,
    tripFuelGal,
    reserveFuelGal,
    contingencyFuelGal,
    totalRequiredFuelGal,
    enduranceHours,
    rangeNm,
  };
}

function buildRiskAssessment(args: {
  arrivalWeather: WeatherReport;
  altitudeValidation: { valid: boolean; summary: string };
  departureRunwayAnalysis: RunwayWindComponent[];
  arrivalRunwayAnalysis: RunwayWindComponent[];
  fuelPlan: { enduranceHours: number };
  hazards: WeatherHazardSummary;
  performanceWarnings: string[];
}) {
  const categories: RouteRiskAssessment["categories"] = [];

  const arrivalDecoded = args.arrivalWeather.metarDecoded as Record<string, unknown> | null;
  const flightCategory = typeof arrivalDecoded?.fltCat === "string" ? arrivalDecoded.fltCat : "UNKNOWN";

  categories.push(
    flightCategory === "IFR" || flightCategory === "LIFR"
      ? {
          name: "Arrival Weather",
          score: 40,
          severity: "warning",
          summary: "Arrival airport is reporting instrument conditions.",
        }
      : flightCategory === "MVFR"
        ? {
            name: "Arrival Weather",
            score: 22,
            severity: "caution",
            summary: "Arrival airport is below straightforward VFR margins.",
          }
        : {
            name: "Arrival Weather",
            score: 8,
            severity: "info",
            summary: "Arrival weather is broadly supportive.",
          },
  );

  if (!args.altitudeValidation.valid) {
    categories.push({
      name: "Cruising Altitude",
      score: 28,
      severity: "warning",
      summary: args.altitudeValidation.summary,
    });
  }

  const worstCrosswind = Math.max(
    ...args.departureRunwayAnalysis.map((item) => item.crosswind),
    ...args.arrivalRunwayAnalysis.map((item) => item.crosswind),
    0,
  );

  categories.push({
    name: "Runway Wind",
    score: worstCrosswind >= 18 ? 24 : worstCrosswind >= 12 ? 14 : 5,
    severity: worstCrosswind >= 18 ? "warning" : worstCrosswind >= 12 ? "caution" : "info",
    summary:
      worstCrosswind >= 18
        ? "Crosswind exposure is elevated on at least one runway set."
        : worstCrosswind >= 12
          ? "Crosswind component deserves review before departure."
          : "Runway wind components are manageable in this early-pass estimate.",
  });

  categories.push({
    name: "Fuel Margin",
    score: args.fuelPlan.enduranceHours < 3 ? 18 : 8,
    severity: args.fuelPlan.enduranceHours < 3 ? "caution" : "info",
    summary:
      args.fuelPlan.enduranceHours < 3
        ? "Endurance margin is modest and should be checked closely."
        : "Fuel endurance appears reasonable for the route length.",
  });

  if (args.hazards.convectiveRisk === "high") {
    categories.push({
      name: "Convective Hazard",
      score: 35,
      severity: "warning",
      summary: "Active convective advisories intersect the route corridor.",
    });
  }

  if (args.hazards.icingRisk === "moderate" || args.hazards.turbulenceRisk === "moderate") {
    categories.push({
      name: "Advisories",
      score: 18,
      severity: "caution",
      summary: "Icing, turbulence, or low-level wind shear advisories affect the route area.",
    });
  }

  if (args.performanceWarnings.length > 0) {
    categories.push({
      name: "Performance",
      score: 16,
      severity: "caution",
      summary: args.performanceWarnings[0],
    });
  }

  const totalScore = categories.reduce((sum, item) => sum + item.score, 0);

  return {
    score: totalScore,
    status: totalScore >= 80 ? "REJECTED" : totalScore >= 45 ? "MARGINAL" : "APPROVED",
    categories,
  } satisfies RouteRiskAssessment;
}

export function buildPlanningOutput(
  inputs: PlanningInputs,
  hazards: WeatherHazardSummary & {
    pirepHighlights: string[];
    advisoryHighlights: string[];
  },
): PlanningOutput {
  const estimatedWinds = estimateWindsAloft(inputs.courseMagnetic, inputs.altitudeFt);
  const windSolution = computeGroundspeed(
    inputs.courseMagnetic,
    inputs.aircraft.cruiseSpeedKts ?? 110,
    estimatedWinds.direction,
    estimatedWinds.speed,
  );

  const departureWind = deriveSurfaceWind(inputs.departureWeather);
  const arrivalWind = deriveSurfaceWind(inputs.arrivalWeather);

  const departureRunwayAnalysis = inputs.departureRunways.map((runway) =>
    calculateRunwayWindComponent(
      runway.runway,
      runway.headingMagnetic,
      departureWind.direction,
      departureWind.speed,
    ),
  );
  const arrivalRunwayAnalysis = inputs.arrivalRunways.map((runway) =>
    calculateRunwayWindComponent(
      runway.runway,
      runway.headingMagnetic,
      arrivalWind.direction,
      arrivalWind.speed,
    ),
  );

  const altitudeValidation = validateCruisingAltitude(
    inputs.altitudeFt,
    inputs.courseMagnetic,
    inputs.filingRules,
  );
  const fuelPlan = calculateFuelPlan(
    inputs.distanceNm,
    windSolution.groundspeedKts,
    inputs.aircraft,
  );
  const densityAltitude = calculateDensityAltitude(
    inputs.departureWeather,
    inputs.aircraft,
  );
  const riskAssessment = buildRiskAssessment({
    arrivalWeather: inputs.arrivalWeather,
    altitudeValidation,
    departureRunwayAnalysis,
    arrivalRunwayAnalysis,
    fuelPlan,
    hazards,
    performanceWarnings: densityAltitude.performanceWarnings,
  });

  return {
    windsAloft: {
      direction: estimatedWinds.direction,
      speed: estimatedWinds.speed,
      headwindComponent: windSolution.headwindComponent,
      crosswindComponent: windSolution.crosswindComponent,
      groundspeedKts: windSolution.groundspeedKts,
    },
    runwayAnalysis: {
      departure: departureRunwayAnalysis,
      arrival: arrivalRunwayAnalysis,
    },
    altitudeValidation,
    fuelPlan,
    performance: {
      departureDensityAltitudeFt: densityAltitude.densityAltitudeFt,
      departurePressureAltitudeFt: densityAltitude.pressureAltitudeFt,
      warnings: densityAltitude.performanceWarnings,
    },
    hazards,
    riskAssessment,
  };
}
