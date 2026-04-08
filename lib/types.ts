export type EvaluationStatus = "APPROVED" | "MARGINAL" | "REJECTED";

export interface WeatherReport {
  icao: string;
  metar: string | null;
  taf: string | null;
  metarDecoded: unknown | null;
  tafDecoded: unknown | null;
}

export interface EvaluationResult {
  status: EvaluationStatus;
  weather_summary: string;
  cfi_feedback: string;
}

export interface EvaluationResponse {
  departure: string;
  arrival: string;
  altitude: number;
  weather: {
    departure: WeatherReport;
    arrival: WeatherReport;
  };
  evaluation: EvaluationResult;
  saved_to_log: boolean;
}
