import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createBatch,
  deleteBatch,
  updateBatch,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function BatchesPage() {
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
              className="inline-flex items-center rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-cyan-400"
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
            Only Super Admin can manage batches.
          </p>
          <div className="mt-5">
            <Link
              href="/super-admin"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-cyan-500/50"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("id, name, created_at")
    .order("name", { ascending: true });

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
                <Users className="h-3 w-3" />
                Batches
              </span>
              <span className="text-xs text-slate-400">Academic Structure</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Batches
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Create and manage student batches of JTEC.
            </p>
          </div>

          <Link
            href="/super-admin/academic-structure"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Academic Structure</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Add Batch Card */}
        <section className="rounded-2xl border border-cyan-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(6,182,212,0.08)] transition-all duration-300 hover:border-cyan-400/60 hover:shadow-[0_0_45px_rgba(6,182,212,0.16)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">Add Batch</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Add a new student batch with a unique name.
            </p>
          </div>

          <form
            action={createBatch}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="w-full sm:max-w-md">
              <label
                htmlFor="name"
                className="mb-1.5 block text-xs font-semibold text-slate-300"
              >
                Batch Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g. 9th Batch"
                required
                className="h-11 w-full rounded-xl border border-slate-700/80 bg-[#060A12] px-3.5 text-sm text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 px-6 text-xs font-bold text-slate-950 shadow-[0_0_22px_rgba(6,182,212,0.35)] transition-all duration-150 hover:from-cyan-300 hover:to-cyan-400 hover:shadow-[0_0_28px_rgba(6,182,212,0.55)] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Batch</span>
            </button>
          </form>
        </section>

        {/* Existing Batches Card */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
          <div className="border-b border-slate-800/80 px-6 py-5">
            <h2 className="text-base font-semibold text-white">
              Existing Batches
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {batches?.length ?? 0} batch
              {(batches?.length ?? 0) === 1 ? "" : "es"} found.
            </p>
          </div>

          {batchesError ? (
            <div className="p-6">
              <p className="text-xs font-medium text-rose-400">
                Failed to load batches: {batchesError.message}
              </p>
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-xs text-slate-400">No batches found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {batches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.18)]">
                      {batch.name}
                    </span>
                  </div>

                  <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
                    <form
                      action={updateBatch}
                      className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={batch.id}
                      />

                      <input
                        name="name"
                        type="text"
                        defaultValue={batch.name}
                        required
                        aria-label={`Batch name for ${batch.name}`}
                        className="h-9 w-full rounded-lg border border-slate-700/80 bg-[#060A12] px-3 text-xs text-white transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:w-64"
                      />

                      <button
                        type="submit"
                        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 text-xs font-semibold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-500/25 active:scale-95"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                    </form>

                    <form action={deleteBatch}>
                      <input
                        type="hidden"
                        name="id"
                        value={batch.id}
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