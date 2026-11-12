import Link from "next/link";
import { ArrowLeft, KeyRound, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RegistrationCodeForm } from "./registration-code-form";
import {
  deleteRegistrationCode,
  toggleRegistrationCode,
} from "./actions";

export const dynamic = "force-dynamic";

type Department = { id: string; name: string; code: string };
type Batch = { id: string; name: string };
type Level = { id: string; name: string; sort_order: number };
type Term = { id: string; level_id: string; name: string; sort_order: number };
type RegistrationCode = {
  id: string;
  code: string;
  role_scope: string;
  department_id: string | null;
  batch_id: string | null;
  level_id: string | null;
  term_id: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  student_id: string;
};

export default async function RegistrationCodesPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060A12] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-white">
            Registration Codes
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            You must be logged in to access this page.
          </p>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060A12] p-6 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-white">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Only Super Admin can manage registration codes.
          </p>
        </div>
      </main>
    );
  }

  const [
    departmentsResult,
    batchesResult,
    levelsResult,
    termsResult,
    registrationCodesResult,
    verifiedProfilesResult,
  ] = await Promise.all([
    supabase.from("departments").select("id, name, code").order("name"),
    supabase.from("batches").select("id, name").order("name"),
    supabase.from("levels").select("id, name, sort_order").order("sort_order"),
    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order"),
    supabase
      .from("registration_codes")
      .select(
        "id, code, role_scope, department_id, batch_id, level_id, term_id, max_uses, used_count, expires_at, is_active, created_at, student_id",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("student_id")
      .eq("is_verified", true)
      .not("student_id", "is", null),
  ]);

  if (departmentsResult.error) throw new Error(departmentsResult.error.message);
  if (batchesResult.error) throw new Error(batchesResult.error.message);
  if (levelsResult.error) throw new Error(levelsResult.error.message);
  if (termsResult.error) throw new Error(termsResult.error.message);
  if (registrationCodesResult.error)
    throw new Error(registrationCodesResult.error.message);

  const departments = (departmentsResult.data ?? []) as Department[];
  const batches = (batchesResult.data ?? []) as Batch[];
  const levels = (levelsResult.data ?? []) as Level[];
  const terms = (termsResult.data ?? []) as Term[];
  const verifiedStudentRolls = new Set(
    ((verifiedProfilesResult.data ?? []) as Array<{ student_id: string | null }>)
      .map((p) => p.student_id?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  const registrationCodes =
    (registrationCodesResult.data ?? []) as RegistrationCode[];

  const departmentMap = new Map(departments.map((d) => [d.id, d]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));
  const levelMap = new Map(levels.map((l) => [l.id, l]));
  const termMap = new Map(terms.map((t) => [t.id, t]));

  const now = Date.now();
  const activeCount = registrationCodes.filter(
    (c) => {
      const matchedVerified = Boolean(c.student_id && verifiedStudentRolls.has(c.student_id.trim()));
      const effectiveUsed = matchedVerified ? Math.max(c.used_count, c.max_uses) : c.used_count;
      return (
        c.is_active &&
        effectiveUsed < c.max_uses &&
        (c.expires_at === null || new Date(c.expires_at).getTime() > now)
      );
    },
  ).length;
  const usedOrExpiredCount = registrationCodes.length - activeCount;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
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
                Single Registration
              </span>
              <span className="text-xs text-slate-400">Registration Codes</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Registration Codes
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Create and manage student registration codes with their academic
              assignments.
            </p>
          </div>

          <Link
            href="/super-admin/registration-codes/manage"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Registration Codes</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* 3 Live KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Codes
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-white">
              {registrationCodes.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active &amp; Available
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {activeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Used / Inactive / Expired
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {usedOrExpiredCount}
            </p>
          </div>
        </section>

        {/* Create Form */}
        <RegistrationCodeForm
          departments={departments}
          batches={batches}
          levels={levels}
          terms={terms}
        />

        {/* Existing Codes */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-6 py-5">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Existing Registration Codes
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {registrationCodes.length} registration code
                {registrationCodes.length === 1 ? "" : "s"} found.
              </p>
            </div>
          </div>

          {registrationCodes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-white">
                No registration codes yet.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Create your first registration code using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-5">
              {registrationCodes.map((registrationCode) => {
                const department = registrationCode.department_id
                  ? departmentMap.get(registrationCode.department_id)
                  : null;
                const batch = registrationCode.batch_id
                  ? batchMap.get(registrationCode.batch_id)
                  : null;
                const level = registrationCode.level_id
                  ? levelMap.get(registrationCode.level_id)
                  : null;
                const term = registrationCode.term_id
                  ? termMap.get(registrationCode.term_id)
                  : null;

                const isExpired =
                  registrationCode.expires_at !== null &&
                  new Date(registrationCode.expires_at).getTime() <= now;
                const isMatchedVerifiedStudent = Boolean(
                  registrationCode.student_id &&
                    verifiedStudentRolls.has(registrationCode.student_id.trim()),
                );
                const effectiveUsedCount = isMatchedVerifiedStudent
                  ? Math.max(registrationCode.used_count, registrationCode.max_uses)
                  : registrationCode.used_count;
                const isUsedUp =
                  effectiveUsedCount >= registrationCode.max_uses;
                const effectiveActive =
                  registrationCode.is_active && !isExpired && !isUsedUp;

                const statusLabel = isExpired
                  ? "Expired"
                  : isUsedUp
                    ? "Used Up"
                    : registrationCode.is_active
                      ? "Active"
                      : "Inactive";

                const statusCls = effectiveActive
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : isExpired
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                    : isUsedUp
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-slate-700 bg-slate-800 text-slate-300";

                const toggleLabel =
                  isExpired || isUsedUp
                    ? "Unavailable"
                    : registrationCode.is_active
                      ? "Deactivate"
                      : "Activate";

                return (
                  <article
                    key={registrationCode.id}
                    className="rounded-xl border border-slate-800/90 bg-[#060A12]/80 p-5 transition-colors hover:border-cyan-500/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 font-mono text-sm font-bold text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.18)]">
                            {registrationCode.code}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusCls}`}
                          >
                            {statusLabel}
                          </span>
                          <span className="rounded-md border border-slate-700/80 bg-slate-900 px-2.5 py-0.5 font-mono text-xs text-slate-200">
                            Roll: {registrationCode.student_id}
                          </span>
                        </div>

                        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-6">
                          <div>
                            <p className="text-slate-400">Department</p>
                            <p className="mt-0.5 font-medium text-white">
                              {department?.name ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Batch</p>
                            <p className="mt-0.5 font-medium text-white">
                              {batch?.name ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Level</p>
                            <p className="mt-0.5 font-medium text-white">
                              {level?.name ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Term</p>
                            <p className="mt-0.5 font-medium text-white">
                              {term?.name ?? "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Usage</p>
                            <p className="mt-0.5 font-medium text-white">
                              {effectiveUsedCount} /{" "}
                              {registrationCode.max_uses}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Expires</p>
                            <p className="mt-0.5 font-medium text-slate-200">
                              {registrationCode.expires_at
                                ? new Date(
                                    registrationCode.expires_at,
                                  ).toLocaleDateString()
                                : "Never"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:shrink-0">
                        <form action={toggleRegistrationCode}>
                          <input
                            type="hidden"
                            name="id"
                            value={registrationCode.id}
                          />
                          <button
                            type="submit"
                            disabled={isExpired || isUsedUp}
                            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-400/60 hover:text-cyan-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {toggleLabel}
                          </button>
                        </form>

                        <form action={deleteRegistrationCode}>
                          <input
                            type="hidden"
                            name="id"
                            value={registrationCode.id}
                          />
                          <button
                            type="submit"
                            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-semibold text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/25 active:scale-95"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}