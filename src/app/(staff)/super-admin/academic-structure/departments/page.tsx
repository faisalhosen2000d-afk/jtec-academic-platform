import Link from "next/link";
import { ArrowLeft, Building2, Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const supabase = await createClient();

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060A12] px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0A1020] p-6 shadow-2xl">
          <h1 className="font-serif text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            You must be logged in to access this page.
          </p>
          <div className="mt-5">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400"
            >
              Go to Login
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
          <h1 className="font-serif text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-sm text-slate-400">
            Only Super Admin can manage departments.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-amber-500/50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: departments, error: departmentsError } = await supabase
    .from("departments")
    .select("id, name, code, created_at")
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      {/* Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.22)]">
                <Building2 className="h-3 w-3" />
                Departments
              </span>
              <span className="text-xs text-slate-400">Academic Structure</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Departments
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Create and manage the academic departments of JTEC.
            </p>
          </div>

          <Link
            href="/super-admin/academic-structure"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Academic Structure</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Add Department Card */}
        <section className="rounded-2xl border border-amber-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(245,158,11,0.08)] transition-all duration-300 hover:border-amber-400/60 hover:shadow-[0_0_45px_rgba(245,158,11,0.16)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">Add Department</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Add a new department with a unique name and code.
            </p>
          </div>

          <form
            action={createDepartment}
            className="grid gap-4 md:grid-cols-[1fr_220px_auto]"
          >
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Department Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. Apparel Engineering"
                required
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Department Code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                placeholder="e.g. AE"
                required
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm uppercase text-white placeholder:normal-case placeholder:text-slate-500 transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(245,158,11,0.3)] transition-all duration-150 hover:from-amber-400 hover:to-amber-500 hover:shadow-[0_0_28px_rgba(245,158,11,0.48)] active:scale-[0.98] md:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Department</span>
              </button>
            </div>
          </form>
        </section>

        {/* Existing Departments Card */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
          <div className="border-b border-slate-800/80 px-6 py-5">
            <h2 className="text-base font-semibold text-white">
              Existing Departments
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {departments?.length ?? 0} department
              {(departments?.length ?? 0) === 1 ? "" : "s"} found.
            </p>
          </div>

          {departmentsError ? (
            <div className="p-6">
              <p className="text-xs font-medium text-rose-400">
                Failed to load departments: {departmentsError.message}
              </p>
            </div>
          ) : !departments || departments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400">No departments found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {departments.map((department) => (
                <div
                  key={department.id}
                  className="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="inline-flex min-w-[46px] items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.18)]">
                      {department.code}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {department.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto">
                    <form
                      action={updateDepartment}
                      className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={department.id}
                      />

                      <input
                        name="name"
                        type="text"
                        defaultValue={department.name}
                        required
                        aria-label={`Department name for ${department.name}`}
                        className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#060A12] px-3 text-xs text-white transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:w-64"
                      />

                      <input
                        name="code"
                        type="text"
                        defaultValue={department.code}
                        required
                        aria-label={`Department code for ${department.name}`}
                        className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#060A12] px-3 text-xs uppercase text-white transition-all focus:border-amber-400/80 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:w-24"
                      />

                      <button
                        type="submit"
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/25 active:scale-95"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                    </form>

                    <form action={deleteDepartment}>
                      <input
                        type="hidden"
                        name="id"
                        value={department.id}
                      />

                      <button
                        type="submit"
                        className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-semibold text-rose-300 transition-all hover:border-rose-400 hover:bg-rose-500/25 active:scale-95 sm:w-auto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}