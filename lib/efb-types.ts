export type FlightMode = "training" | "dispatch";
export type FilingRules = "VFR" | "IFR";
export type ApprovalStatus = "APPROVED" | "MARGINAL" | "REJECTED";

export interface AirportRef {
  icao: string;
  name?: string;
  lat?: number;
  lon?: number;
}

export interface RunwayWindComponent {
  runway: string;
  headingMagnetic: number;
  windDirection: number;
  windSpeed: number;
  headwind: number;
  crosswind: number;
  tailwind: number;
}

export interface WeatherHazardSummary {
  icingRisk: "none" | "low" | "moderate" | "high";
  turbulenceRisk: "none" | "low" | "moderate" | "high";
  convectiveRisk: "none" | "low" | "moderate" | "high";
  freezingLevelFtMsl?: number;
  pirepCount?: number;
  advisoryCount?: number;
  notamCount?: number;
  cloudLayers: Array<{
    coverage: string;
    baseFtMsl?: number;
    topFtMsl?: number;
  }>;
}

export interface RouteLegPlan {
  legIndex: number;
  from: AirportRef;
  to: AirportRef;
  routeText?: string;
  distanceNm?: number;
  plannedAltitudeFt?: number;
  magneticCourse?: number;
  trueCourse?: number;
  estimatedTimeMinutes?: number;
  groundspeedKts?: number;
  windsAloft?: {
    direction: number;
    speed: number;
    temperatureC?: number;
  };
}

export interface RouteRiskAssessment {
  score: number;
  status: ApprovalStatus;
  categories: Array<{
    name: string;
    score: number;
    severity: "info" | "caution" | "warning";
    summary: string;
  }>;
}

export interface AircraftPerformanceProfile {
  id: string;
  displayName: string;
  aircraftType: string;
  cruiseSpeedKts?: number;
  fuelBurnGph?: number;
  enduranceHours?: number;
  reserveMinutes?: number;
  emptyWeightLb?: number;
  maxGrossWeightLb?: number;
  stationData: Array<{
    name: string;
    armInches: number;
    maxWeightLb?: number;
  }>;
  performanceData: {
    climbRateFpm?: number;
    takeoffDistanceFt?: number;
    landingDistanceFt?: number;
    serviceCeilingFt?: number;
    [key: string]: unknown;
  };
}

export interface WeightAndBalanceSnapshot {
  emptyWeightLb?: number;
  occupantsLb: number;
  baggageLb: number;
  fuelGal: number;
  rampWeightLb?: number;
  takeoffWeightLb?: number;
  withinLimits: boolean;
}

export interface FuelPlan {
  taxiFuelGal?: number;
  tripFuelGal?: number;
  reserveFuelGal?: number;
  contingencyFuelGal?: number;
  totalRequiredFuelGal?: number;
  enduranceHours?: number;
  rangeNm?: number;
}

export interface NavLogCheckpoint {
  identifier: string;
  distanceFromPreviousNm: number;
  estimatedTimeMinutes: number;
  magneticCourse: number;
  groundspeedKts: number;
  notes?: string;
}

export interface BriefingPacket {
  mode: FlightMode;
  status: ApprovalStatus;
  executiveSummary: string;
  weatherSummary: string;
  routeSummary: string;
  aiInstructorNotes?: string;
  goNoGoChecklist: string[];
  notamHighlights: string[];
  pirepHighlights: string[];
  alternateHighlights?: string[];
  riskAssessment: RouteRiskAssessment;
}

export interface FlightPlanRecord {
  id: string;
  name: string;
  departure: AirportRef;
  arrival: AirportRef;
  filingRules: FilingRules;
  mode: FlightMode;
  aircraftProfileId?: string;
  departureTime?: string;
  legs: RouteLegPlan[];
  fuelPlan?: FuelPlan;
  weightAndBalance?: WeightAndBalanceSnapshot;
  riskAssessment?: RouteRiskAssessment;
  briefing?: BriefingPacket;
}
