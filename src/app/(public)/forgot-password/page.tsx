"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Lock,
  Mail,
} from "lucide-react";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import { type AuthActionResult } from "@/server/actions/auth";

const initialState: AuthActionResult = {
  success: false,
  error: "",
};

export default function ForgotPasswordPage() {
  const [state, setState] = useState<AuthActionResult>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [dodgeSide, setDodgeSide] = useState<1 | -1>(1);

  const emailReady = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailReady) {
      setDodgeSide((s) => (s === 1 ? -1 : 1));
      return;
    }

    setIsPending(true);

    const supabase = createRecoveryClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/recovery?next=/reset-password`,
    });

    if (error) {
      setState({
        success: false,
        error: error.message,
      });
    } else {
      setState({
        success: true,
      });
    }

    setIsPending(false);
  };

  const fieldError = state.success ? undefined : state.fieldErrors?.email?.[0];

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#060A12] px-4 py-12 text-slate-100">
      <style>{`
        @keyframes fpFadeUp {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .fp-stagger {
          animation: fpFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>

      {/* Ambient Background Glows */}
      <div
        className="pointer-events-none absolute -top-36 left-1/3 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-36 right-1/3 h-80 w-80 rounded-full bg-red-600/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Top Institutional Branding */}
        <div
          className="fp-stagger text-center"
          style={{ animationDelay: "60ms" }}
        >
          <div className="mb-3 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-serif text-sm font-black uppercase tracking-widest text-white">
              JTEC <span className="text-amber-400">Academic</span>
            </span>
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Account Recovery
          </h1>
          <p className="mt-1.5 text-xs text-slate-400">
            Enter your registered email and we&apos;ll send a secure reset link.
          </p>
        </div>

        {/* Glowing Card */}
        <div
          className="fp-stagger group/auth relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0A1020] p-6 shadow-[0_0_45px_rgba(245,158,11,0.12)] transition-shadow duration-500 hover:shadow-[0_0_65px_rgba(245,158,11,0.22)] sm:p-8"
          style={{ animationDelay: "180ms" }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl p-[1.5px]"
            style={{
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          >
            <div
              className="absolute inset-[-150%] animate-[spin_7s_linear_infinite] opacity-75 transition-opacity duration-500 group-hover/auth:opacity-100"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(245,158,11,0.9) 60deg, rgba(239,68,68,0.75) 120deg, transparent 190deg, rgba(56,189,248,0.5) 260deg, transparent 340deg)",
              }}
            />
          </div>

          <div className="relative z-10">
            {state.success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/35 p-4 text-xs leading-relaxed text-emerald-200">
                  If an account exists with{" "}
                  <span className="font-semibold text-white">{email}</span>, a
                  password reset link has been sent. Please check your inbox and
                  spam folder.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    autoComplete="email"
                    required
                    className={`peer h-[52px] w-full rounded-xl border bg-[#060A12] pl-10 pr-4 pt-3 text-sm text-white outline-none transition-all ${
                      fieldError
                        ? "border-rose-500/70 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-700/80 focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/20"
                    }`}
                  />
                  <label
                    htmlFor="email"
                    className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 transition-all duration-200 peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-amber-400"
                  >
                    Registered Email Address
                  </label>
                </div>

                {fieldError && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-rose-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fieldError}</span>
                  </p>
                )}

                {state.error && !fieldError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/35 p-3 text-xs font-medium text-rose-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Dodge-to-Unlock Submit Dock */}
                <div
                  className={`relative flex h-12 w-full items-center justify-center rounded-xl transition-all duration-300 ${
                    emailReady
                      ? "border-transparent bg-transparent"
                      : "overflow-hidden border border-slate-800 bg-[#060A12] px-1.5"
                  }`}
                >
                  {!emailReady && (
                    <span className="pointer-events-none select-none text-[11px] font-medium text-slate-500">
                      Enter valid email to unlock
                    </span>
                  )}

                  <button
                    type="submit"
                    disabled={isPending}
                    onClick={(e) => {
                      if (!emailReady) {
                        e.preventDefault();
                        setDodgeSide((s) => (s === 1 ? -1 : 1));
                      }
                    }}
                    onMouseEnter={() => {
                      if (!emailReady) {
                        setDodgeSide((s) => (s === 1 ? -1 : 1));
                      }
                    }}
                    className={
                      emailReady
                        ? "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 via-red-600 to-amber-600 text-xs font-bold text-white shadow-[0_0_24px_rgba(220,38,38,0.35)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_28px_rgba(245,158,11,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                        : `absolute flex h-9 w-36 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 shadow-lg transition-transform duration-300 ease-out ${
                            dodgeSide === 1
                              ? "translate-x-[68px]"
                              : "-translate-x-[68px]"
                          }`
                    }
                  >
                    {isPending ? (
                      <span>Sending Reset Link...</span>
                    ) : emailReady ? (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Send Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 border-t border-slate-800/80 pt-5 text-center">
              <Link
                href="/login"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/35 bg-gradient-to-b from-slate-800/90 to-slate-900 px-5 py-2.5 text-xs font-semibold text-amber-300 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-400/75 hover:text-amber-200 hover:shadow-[0_0_22px_rgba(245,158,11,0.28)] active:translate-y-0 active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}