import Link from "next/link";
import { ArrowLeft, Layers, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LevelsPage() {
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
              className="inline-flex items-center rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-violet-400"
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
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-violet-500/50"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: levels, error: levelsError } = await supabase
    .from("levels")
    .select("id, name, sort_order")
    .order("sort_order", { ascending: true });

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-300 shadow-[0_0_18px_rgba(139,92,246,0.28)]">
                <Layers className="h-3 w-3" />
                Levels
              </span>
              <span className="text-xs text-slate-400">Academic Structure</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Levels
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Academic levels are fixed according to the JTEC academic
              structure.
            </p>
          </div>

          <Link
            href="/super-admin/academic-structure"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:text-violet-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Academic Structure</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Fixed Structure Banner */}
        <section className="flex flex-col gap-4 rounded-2xl border border-violet-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(139,92,246,0.08)] transition-all duration-300 hover:border-violet-400/60 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Fixed Academic Structure
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              JTEC has 4 academic levels. These levels cannot be added, edited,
              or deleted from the Super Admin panel.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-violet-500/40 bg-violet-500/15 px-4 py-2.5 text-xs font-bold text-violet-200 shadow-[0_0_18px_rgba(139,92,246,0.2)]">
            4 Levels &times; 2 Terms = 8 Terms
          </div>
        </section>

        {/* Academic Levels 2x2 Grid */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
          <div className="border-b border-slate-800/80 px-6 py-5">
            <h2 className="text-base font-semibold text-white">
              Academic Levels
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {levels?.length ?? 0} levels configured.
            </p>
          </div>

          {levelsError ? (
            <div className="p-6">
              <p className="text-xs font-medium text-rose-400">
                Failed to load levels: {levelsError.message}
              </p>
            </div>
          ) : !levels || levels.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400">No levels found.</p>
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className="group relative overflow-hidden rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-500/50 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/80">
                        Level {level.sort_order}
                      </p>
                      <h3 className="mt-1 font-serif text-lg font-bold text-white">
                        {level.name}
                      </h3>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[11px] font-semibold text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
                      <Lock className="h-3 w-3" />
                      Fixed
                    </span>
                  </div>

                  <p className="mt-4 text-xs text-slate-400">
                    This academic level is part of the fixed JTEC academic
                    structure.
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}