import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  Info,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RegistrationCodesManagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/staff-login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") redirect("/");

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.25)]">
                <KeyRound className="h-3 w-3" />
                Registration Codes
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Registration Codes
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Select how you want to create and assign student registration
              codes.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-base font-semibold text-white">
            Choose Registration Method
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Generate codes individually or upload a spreadsheet for an entire
            batch.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Single Registration Card */}
          <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(6,182,212,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_0_45px_rgba(6,182,212,0.16)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Single Registration
                </h3>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Create a registration code for one student at a time by
                providing the student&apos;s academic information and viewing
                existing codes.
              </p>

              <div className="mt-5 rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                  Use this for
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  One student registration &amp; individual code management.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/super-admin/registration-codes"
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(6,182,212,0.3)] transition-all duration-150 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.5)] active:scale-[0.98]"
              >
                <span>Open Single Registration</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>

          {/* Bulk Registration Card */}
          <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(16,185,129,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_0_45px_rgba(16,185,129,0.16)]">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Bulk Registration
                </h3>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Upload an Excel file containing multiple students and generate
                registration codes for all of them at once.
              </p>

              <div className="mt-5 rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                  Use this for
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Batch-wide student registrations using Excel sheets.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/super-admin/registration-codes/bulk"
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(16,185,129,0.3)] transition-all duration-150 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.5)] active:scale-[0.98]"
              >
                <span>Open Bulk Registration</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>
        </div>

        {/* Slim Workflow Note */}
        <div className="flex items-start gap-3 rounded-xl border border-cyan-500/25 bg-[#0A1020]/80 px-4 py-3 text-xs text-slate-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-cyan-300">
              Registration Code Workflow:
            </span>{" "}
            Use Single Registration for one student and Bulk Registration for
            multiple students. Registration codes are generated automatically
            during the process.
          </p>
        </div>
      </main>
    </div>
  );
}