import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Layers, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AcademicProgressionPanel from "./AcademicProgressionPanel";

export const dynamic = "force-dynamic";

export default async function AcademicProgressionPage() {
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

  const [batchesResult, levelsResult, termsResult, studentsResult] =
    await Promise.all([
      supabase.from("batches").select("id,name").order("name"),
      supabase.from("levels").select("id,name,sort_order").order("sort_order"),
      supabase
        .from("terms")
        .select("id,level_id,name,sort_order")
        .order("sort_order"),
      supabase
        .from("profiles")
        .select(
          "id,full_name,student_id,email,avatar_url,batch_id,current_level_id,current_term_id",
        )
        .eq("role", "student")
        .order("full_name"),
    ]);

  const errors = [
    batchesResult.error,
    levelsResult.error,
    termsResult.error,
    studentsResult.error,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-300 shadow-[0_0_18px_rgba(139,92,246,0.28)]">
                <TrendingUp className="h-3 w-3" />
                Academic Progression
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Academic Progression
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Review student academic assignments before moving a batch forward.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/super-admin/academic-structure"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-violet-500/50 hover:text-violet-300 active:scale-95"
            >
              <Layers className="h-3.5 w-3.5 text-violet-400" />
              <span>Academic Structure</span>
            </Link>
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:text-violet-300 active:translate-y-0 active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Super Admin</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {errors.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-4 text-xs font-medium text-rose-300"
          >
            Some academic data could not be loaded. Check the database schema
            and permissions before using the preview.
          </div>
        )}

        <AcademicProgressionPanel
          batches={batchesResult.data ?? []}
          levels={levelsResult.data ?? []}
          terms={termsResult.data ?? []}
          students={studentsResult.data ?? []}
        />
      </main>
    </div>
  );
}