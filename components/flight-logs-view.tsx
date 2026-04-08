"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type FlightLog = {
  id: string;
  departure_icao: string;
  arrival_icao: string;
  planned_altitude: number;
  ai_evaluation_report: string;
  created_at: string;
};

export function FlightLogsView() {
  const [email, setEmail] = useState<string | null>(null);
  const [logs, setLogs] = useState<FlightLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const loadLogs = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEmail(session?.user.email ?? null);

      if (!session) {
        setLogs([]);
        setLoading(false);
        return;
      }

      const { data, error: logsError } = await supabase
        .from("flight_logs")
        .select("id, departure_icao, arrival_icao, planned_altitude, ai_evaluation_report, created_at")
        .order("created_at", { ascending: false })
        .limit(12);

      if (logsError) {
        setError(logsError.message);
        setLogs([]);
      } else {
        setLogs((data as FlightLog[]) ?? []);
      }

      setLoading(false);
    };

    void loadLogs();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setEmail(session?.user.email ?? null);
        void loadLogs();
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Flight Logs
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Saved evaluations and briefing history.
        </h2>
      </div>

      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
        {email
          ? `Signed in as ${email}.`
          : "No active session. Sign in from Plan Review or Settings to load your saved logs."}
      </div>

      {loading ? (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Loading saved evaluations...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.6rem] border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-white">
                {log.departure_icao} to {log.arrival_icao}
              </h3>
              <div className="text-right text-sm text-slate-300">
                <p>{log.planned_altitude.toLocaleString()} ft</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-950/60 p-4 font-mono text-xs leading-6 text-slate-200">
              {log.ai_evaluation_report}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
