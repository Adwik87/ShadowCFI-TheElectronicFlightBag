import type { WeatherReport } from "@/lib/types";

const ALTERNATE_CANDIDATES: Record<string, string[]> = {
  KBOS: ["KPVD", "KBDL", "KMHT", "KPWM"],
  KJFK: ["KHPN", "KISP", "KSWF", "KPHL"],
  KLAX: ["KSNA", "KBUR", "KONT", "KPSP"],
  KSFO: ["KOAK", "KSJC", "KMRY", "KSMF"],
  KATL: ["KBHM", "KCHA", "KGSP", "KHSV"],
  KORD: ["KMKE", "KMDW", "KMCI", "KIND"],
};

export interface AlternateScore {
  icao: string;
  score: number;
  summary: string;
  weather: WeatherReport;
}

export function getAlternateCandidates(arrivalIcao: string) {
  return ALTERNATE_CANDIDATES[arrivalIcao] ?? [];
}

export function scoreAlternate(weather: WeatherReport): AlternateScore {
  const decoded = weather.metarDecoded as Record<string, unknown> | null;
  const category = typeof decoded?.fltCat === "string" ? decoded.fltCat : "UNKNOWN";
  const wind = typeof decoded?.wspd === "number" ? decoded.wspd : 0;

  const score =
    category === "VFR"
      ? Math.max(78, 100 - wind)
      : category === "MVFR"
        ? Math.max(55, 76 - wind)
        : Math.max(20, 45 - wind);

  const summary =
    category === "VFR"
      ? "Good alternate candidate with broadly favorable weather."
      : category === "MVFR"
        ? "Usable alternate, but weather margins are reduced."
        : "Weak alternate candidate due to instrument conditions.";

  return {
    icao: weather.icao,
    score,
    summary,
    weather,
  };
}
