"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  EvaluationResponse,
  EvaluationStatus,
  WeatherReport,
} from "@/lib/types";

type FlightFormState = {
  departure: string;
  arrival: string;
  altitude: string;
};

type AuthState = {
  email: string | null;
  accessToken: string | null;
};

const initialFormState: FlightFormState = {
  departure: "KJFK",
  arrival: "KBOS",
  altitude: "6500",
};

const statusStyles: Record<EvaluationStatus, string> = {
  APPROVED:
    "border-emerald-400/30 bg-emerald-500/12 text-emerald-200 shadow-[0_0_40px_rgba(52,211,153,0.15)]",
  MARGINAL:
    "border-amber-400/30 bg-amber-500/12 text-amber-100 shadow-[0_0_40px_rgba(251,191,36,0.12)]",
  REJECTED:
    "border-rose-400/30 bg-rose-500/12 text-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.12)]",
};

const badgeStyles: Record<EvaluationStatus, string> = {
  APPROVED: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/25",
  MARGINAL: "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/25",
  REJECTED: "bg-rose-400/20 text-rose-100 ring-1 ring-rose-300/25",
};

function WeatherCard({
  title,
  report,
}: {
  title: string;
  report: WeatherReport | null;
}) {
  const metarFlightCategory =
    typeof report?.metarDecoded === "object" &&
    report?.metarDecoded !== null &&
    "fltCat" in report.metarDecoded
      ? String(report.metarDecoded.fltCat ?? "N/A")
      : "N/A";

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            {title}
          </p>
          <h3 className="text-lg font-semibold text-white">
            {report?.icao ?? "Awaiting route"}
          </h3>
        </div>
        <span className="rounded-full bg-sky-400/12 px-3 py-1 text-xs font-medium tracking-[0.2em] text-sky-100 ring-1 ring-sky-300/15">
          {metarFlightCategory}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            METAR
          </p>
          <p className="rounded-2xl bg-slate-950/55 p-3 font-mono text-[12px] leading-6 text-slate-200">
            {report?.metar ?? "No METAR loaded yet."}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-500">
            TAF
          </p>
          <p className="rounded-2xl bg-slate-950/55 p-3 font-mono text-[12px] leading-6 text-slate-200">
            {report?.taf ?? "No TAF loaded yet."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ShadowCfiDashboard() {
  const [form, setForm] = useState<FlightFormState>(initialFormState);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authState, setAuthState] = useState<AuthState>({
    email: null,
    accessToken: null,
  });
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAuthState({
        email: session?.user.email ?? null,
        accessToken: session?.access_token ?? null,
      });
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
      setAuthState({
        email: session?.user.email ?? null,
        accessToken: session?.access_token ?? null,
      });
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: authEmail.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (otpError) {
        throw otpError;
      }

      setAuthMessage("Magic link sent. Open it on this device to enable log saves.");
    } catch (signInError) {
      setAuthMessage(
        signInError instanceof Error
          ? signInError.message
          : "Unable to send sign-in link.",
      );
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setAuthMessage("Signed out. New evaluations will not be saved until you sign in again.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authState.accessToken
            ? { Authorization: `Bearer ${authState.accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          departure: form.departure.toUpperCase(),
          arrival: form.arrival.toUpperCase(),
          altitude: Number(form.altitude),
        }),
      });

      const data = (await response.json()) as EvaluationResponse & {
        error?: string;
        details?: string;
      };

      if (!response.ok) {
        throw new Error(data.details || data.error || "Evaluation failed.");
      }

      setResult(data);
    } catch (submitError) {
      setResult(null);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Shadow CFI could not complete the review.",
      );
    } finally {
      setLoading(false);
    }
  }

  const status = result?.evaluation.status;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,rgba(11,23,40,0.96),rgba(5,12,22,0.98))] p-5 shadow-[0_25px_80px_rgba(2,6,23,0.55)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs uppercase tracking-[0.45em] text-sky-300/85">
                Shadow CFI
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Weather-aware flight review in a glass-cockpit workflow.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Build a route, pull live aviation weather, and get a
                conservative CFI-style briefing before you launch.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.22em] text-slate-300 sm:w-fit">
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-slate-500">Weather Feed</p>
                <p className="mt-2 text-sm font-semibold text-white">NOAA AWC</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="text-slate-500">AI Examiner</p>
                <p className="mt-2 text-sm font-semibold text-white">Groq + Llama 3</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
            <section className="lg:col-span-4 lg:row-span-2 rounded-[1.75rem] border border-white/10 bg-white/7 p-5 backdrop-blur-md">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Flight Input
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Plan Review
                </h2>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                        Flight Log Sync
                      </p>
                      <p className="mt-2 leading-7">
                        {authState.email
                          ? `Signed in as ${authState.email}. Evaluations will be written to your Supabase flight log.`
                          : "Sign in with a magic link if you want each evaluation saved to Supabase automatically."}
                      </p>
                    </div>
                    {authState.email ? (
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/8"
                      >
                        Sign Out
                      </button>
                    ) : null}
                  </div>

                  {!authState.email ? (
                    <form className="mt-4 flex flex-col gap-3" onSubmit={handleMagicLink}>
                      <input
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        type="email"
                        placeholder="pilot@shadowcfi.ai"
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/50"
                      />
                      <button
                        type="submit"
                        disabled={authBusy || authEmail.trim().length === 0}
                        className="rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-sky-100 transition hover:bg-sky-400/18 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {authBusy ? "Sending Link..." : "Email Magic Link"}
                      </button>
                    </form>
                  ) : null}

                  {authMessage ? (
                    <p className="mt-3 text-xs leading-6 text-sky-100">{authMessage}</p>
                  ) : null}
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">
                      Departure ICAO
                    </span>
                    <input
                      value={form.departure}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          departure: event.target.value.toUpperCase(),
                        }))
                      }
                      maxLength={4}
                      placeholder="KJFK"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg tracking-[0.2em] text-white outline-none transition focus:border-sky-300/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">
                      Arrival ICAO
                    </span>
                    <input
                      value={form.arrival}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          arrival: event.target.value.toUpperCase(),
                        }))
                      }
                      maxLength={4}
                      placeholder="KBOS"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg tracking-[0.2em] text-white outline-none transition focus:border-sky-300/50"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">
                      Planned Altitude (FT)
                    </span>
                    <input
                      value={form.altitude}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          altitude: event.target.value,
                        }))
                      }
                      inputMode="numeric"
                      placeholder="6500"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-lg tracking-[0.15em] text-white outline-none transition focus:border-sky-300/50"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading
                      ? "Shadow CFI Is Reviewing..."
                      : "Evaluate Flight Plan"}
                  </button>
                </form>

                <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Review Logic
                  </p>
                  <p className="mt-2 leading-7">
                    The route examiner weighs METARs, TAF trends, and altitude
                    realism before issuing an instructor-style go, caution, or
                    no-go recommendation.
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {result?.saved_to_log
                      ? "Latest review saved to your flight log."
                      : "Unsigned reviews still run normally, but they are not persisted."}
                  </p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-8 rounded-[1.75rem] border border-white/10 bg-white/7 p-5 backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    Live Weather
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    METAR and TAF Snapshot
                  </h2>
                </div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  Route Weather Feed
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <WeatherCard
                  title="Departure"
                  report={result?.weather.departure ?? null}
                />
                <WeatherCard
                  title="Arrival"
                  report={result?.weather.arrival ?? null}
                />
              </div>
            </section>

            <section className="lg:col-span-8 rounded-[1.75rem] border border-white/10 bg-white/7 p-5 backdrop-blur-md">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    The CFI Review
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Instructor Debrief
                  </h2>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] ${
                    status ? badgeStyles[status] : "bg-white/8 text-slate-300"
                  }`}
                >
                  {status ?? "Awaiting Review"}
                </span>
              </div>

              {error ? (
                <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-500/10 p-4 text-sm leading-7 text-rose-100">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-[1.5rem] border border-sky-300/20 bg-sky-400/10 p-6 text-sm leading-7 text-sky-50">
                  Shadow CFI is reviewing your flight plan, cross-checking
                  weather at both ends, and pressure-testing your altitude
                  choice.
                </div>
              ) : null}

              {!loading && !result && !error ? (
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-6 text-sm leading-7 text-slate-300">
                  Submit a route to receive a weather summary and a
                  conversation-style review from the Shadow CFI evaluator.
                </div>
              ) : null}

              {result ? (
                <div
                  className={`space-y-4 rounded-[1.5rem] border p-5 ${
                    statusStyles[result.evaluation.status]
                  }`}
                >
                  <div className="rounded-[1.25rem] bg-slate-950/45 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                      Weather Summary
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-100">
                      {result.evaluation.weather_summary}
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] bg-slate-950/45 p-4">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                      CFI Feedback
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                      {result.evaluation.cfi_feedback}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
