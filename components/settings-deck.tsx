"use client";

import { FormEvent, useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SettingsDeck() {
  const [emailInput, setEmailInput] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setEmail(session?.user.email ?? null);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setEmail(session?.user.email ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        throw error;
      }

      setMessage("Magic link sent. Open it in this browser to activate log syncing.");
    } catch (signInError) {
      setMessage(
        signInError instanceof Error
          ? signInError.message
          : "Unable to send magic link.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMessage("Signed out.");
  }

  return (
    <div className="space-y-8 p-5 sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.45em] text-sky-300/80">
          Settings
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight text-white">
          Session, install, and connected service status.
        </h2>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
            Supabase Session
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {email
              ? `Signed in as ${email}.`
              : "No active session. Sign in here to unlock log persistence across the EFB."}
          </p>

          {!email ? (
            <form className="mt-5 space-y-3" onSubmit={handleMagicLink}>
              <input
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                placeholder="pilot@shadowcfi.ai"
                type="email"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/50"
              />
              <button
                type="submit"
                disabled={busy || emailInput.trim().length === 0}
                className="rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="mt-5 rounded-2xl border border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-200"
            >
              Sign Out
            </button>
          )}

          {message ? (
            <p className="mt-4 text-sm leading-7 text-sky-100">{message}</p>
          ) : null}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
            App Status
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["PWA", "Manifest and install icons are configured."],
              ["Weather", "NOAA Aviation Weather feed is live."],
              ["AI", "Groq-backed evaluator is online."],
              ["Logs", "Supabase persistence is available for signed-in users."],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
