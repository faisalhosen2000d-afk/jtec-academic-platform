import Link from "next/link";
import { ArrowLeft, CalendarRange, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Level = {
  id: string;
  name: string;
  sort_order: number;
};

type Term = {
  id: string;
  level_id: string;
  name: string;
  sort_order: number;
};

export default async function TermsPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060A12] px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            You must be logged in to access this page.
          </p>
          <div className="mt-5">
            <Link
              href="/staff-login"
              className="inline-flex items-center rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-emerald-400"
            >
              Go to Staff Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060A12] px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Only Super Admin can access this page.
          </p>
          <div className="mt-5">
            <Link
              href="/super-admin"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/50"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [
    { data: levels, error: levelsError },
    { data: terms, error: termsError },
  ] = await Promise.all([
    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),

    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const levelRows = (levels ?? []) as Level[];
  const termRows = (terms ?? []) as Term[];

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.28)]">
                <CalendarRange className="h-3 w-3" />
                Terms
              </span>
              <span className="text-xs text-slate-400">Academic Structure</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Terms
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Academic terms are fixed according to the JTEC academic
              structure.
            </p>
          </div>

          <Link
            href="/super-admin/academic-structure"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-emerald-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Academic Structure</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Fixed Structure Banner */}
        <section className="flex flex-col gap-4 rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(16,185,129,0.08)] transition-all duration-300 hover:border-emerald-400/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Fixed Academic Structure
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Each academic level contains exactly two terms. Terms cannot be
              added, edited, or deleted from the Super Admin panel.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-bold text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.22)]">
            4 Levels &times; 2 Terms = 8 Terms
          </div>
        </section>

        {/* Error or Terms by Level */}
        {levelsError || termsError ? (
          <section className="rounded-2xl border border-rose-500/40 bg-[#0A1020] p-6">
            <p className="text-xs font-semibold text-rose-400">
              Failed to load academic terms.
            </p>
            {levelsError && (
              <p className="mt-1.5 text-xs text-slate-400">
                Levels: {levelsError.message}
              </p>
            )}
            {termsError && (
              <p className="mt-1.5 text-xs text-slate-400">
                Terms: {termsError.message}
              </p>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Academic Terms
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {termRows.length} terms configured across {levelRows.length}{" "}
                  levels.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                {termRows.length} Terms Configured
              </span>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {levelRows.map((level) => {
                const levelTerms = termRows
                  .filter((term) => term.level_id === level.id)
                  .sort((a, b) => a.sort_order - b.sort_order);

                return (
                  <div
                    key={level.id}
                    className="rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
                          Level {level.sort_order}
                        </p>
                        <h3 className="mt-0.5 font-serif text-base font-bold text-white">
                          {level.name}
                        </h3>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                        <Lock className="h-3 w-3 text-emerald-400" />
                        Fixed
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {levelTerms.map((term) => (
                        <div
                          key={term.id}
                          className="group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.14)]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[11px] font-medium text-emerald-300/80">
                                Term {term.sort_order}
                              </p>
                              <p className="mt-0.5 text-sm font-bold text-white">
                                {term.name}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              <Lock className="h-2.5 w-2.5" />
                              Fixed
                            </span>
                          </div>
                        </div>
                      ))}

                      {levelTerms.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-700 p-4 sm:col-span-2">
                          <p className="text-xs text-rose-400">
                            No terms configured for this level.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}