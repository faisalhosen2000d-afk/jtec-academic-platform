import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { bulkCreateRegistrationCodes } from "./actions";
import BulkRegistrationForm from "./bulk-registration-form";

export const dynamic = "force-dynamic";

type Department = { id: string; name: string; code: string };
type Batch = { id: string; name: string };
type Level = { id: string; name: string };
type Term = { id: string; level_id: string; name: string };

export default async function BulkRegistrationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin") return null;

  const [departmentsResult, batchesResult, levelsResult, termsResult] =
    await Promise.all([
      supabase.from("departments").select("id, name, code").order("name"),
      supabase.from("batches").select("id, name").order("name"),
      supabase.from("levels").select("id, name").order("sort_order"),
      supabase
        .from("terms")
        .select("id, level_id, name")
        .order("level_id")
        .order("sort_order"),
    ]);

  const departments = (departmentsResult.data ?? []) as Department[];
  const batches = (batchesResult.data ?? []) as Batch[];
  const levels = (levelsResult.data ?? []) as Level[];
  const terms = (termsResult.data ?? []) as Term[];

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden print:hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.28)]">
                <FileSpreadsheet className="h-3 w-3" />
                Bulk Registration
              </span>
              <span className="text-xs text-slate-400">Registration Codes</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Bulk Registration
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Upload a student list and assign one academic structure to all
              students.
            </p>
          </div>

          <Link
            href="/super-admin/registration-codes/manage"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:text-emerald-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Registration Codes</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-emerald-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(16,185,129,0.08)] transition-all duration-300 hover:border-emerald-400/55 sm:p-8 print:border-0 print:bg-white print:p-0 print:shadow-none">
          <BulkRegistrationForm
            departments={departments}
            batches={batches}
            levels={levels}
            terms={terms}
            action={bulkCreateRegistrationCodes}
          />
        </section>
      </main>
    </div>
  );
}