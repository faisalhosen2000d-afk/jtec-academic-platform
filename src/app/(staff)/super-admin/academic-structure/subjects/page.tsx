import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSubject, deleteSubject, updateSubject } from "./actions";
import { SubjectForm } from "./subject-form";
import { SubjectsBrowser } from "./SubjectsBrowser";

export const dynamic = "force-dynamic";

type Department = { id: string; name: string; code: string };
type Level = { id: string; name: string; sort_order: number };
type Term = { id: string; level_id: string; name: string; sort_order: number };
type Subject = {
  id: string;
  department_id: string;
  level_id: string;
  term_id: string;
  subject_code: string;
  subject_name: string;
};

export default async function SubjectsPage() {
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
              className="inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 transition-all hover:bg-sky-400"
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
            Only Super Admin can manage subjects.
          </p>
          <div className="mt-5">
            <Link
              href="/super-admin"
              className="inline-flex items-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-sky-500/50"
            >
              Back to Super Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const [
    { data: departments, error: departmentsError },
    { data: levels, error: levelsError },
    { data: terms, error: termsError },
    { data: subjects, error: subjectsError },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true }),
    supabase
      .from("levels")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("terms")
      .select("id, level_id, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase
      .from("subjects")
      .select(
        "id, department_id, level_id, term_id, subject_code, subject_name",
      )
      .order("subject_code", { ascending: true }),
  ]);

  const departmentRows = (departments ?? []) as Department[];
  const levelRows = (levels ?? []) as Level[];
  const termRows = (terms ?? []) as Term[];
  const subjectRows = (subjects ?? []) as Subject[];

  const loadError =
    departmentsError || levelsError || termsError || subjectsError;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.28)]">
                <BookOpen className="h-3 w-3" />
                Subjects
              </span>
              <span className="text-xs text-slate-400">Academic Structure</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Subjects
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage subjects and assign them to departments, levels, and terms.
            </p>
          </div>

          <Link
            href="/super-admin/academic-structure"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-sky-500/50 hover:text-sky-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Academic Structure</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Add Subject Card */}
        <section className="rounded-2xl border border-sky-500/35 bg-[#0A1020] p-6 shadow-[0_0_35px_rgba(56,189,248,0.08)] transition-all duration-300 hover:border-sky-400/60 hover:shadow-[0_0_45px_rgba(56,189,248,0.16)]">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">Add Subject</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Add a subject to a specific department, level, and term.
            </p>
          </div>

          <SubjectForm
            departments={departmentRows}
            levels={levelRows}
            terms={termRows}
            action={createSubject}
          />
        </section>

        {/* Subjects Browser */}
        {loadError ? (
          <section className="rounded-2xl border border-rose-500/40 bg-[#0A1020] p-6">
            <p className="text-xs font-semibold text-rose-400">
              Failed to load academic structure: {loadError.message}
            </p>
          </section>
        ) : (
          <SubjectsBrowser
            departments={departmentRows}
            levels={levelRows}
            terms={termRows}
            subjects={subjectRows}
            updateAction={updateSubject}
            deleteAction={deleteSubject}
          />
        )}
      </main>
    </div>
  );
}