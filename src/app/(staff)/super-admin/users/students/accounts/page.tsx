import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StudentAccountsTable from "./StudentAccountsTable";

type StudentProfile = {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department_id: string | null;
  batch_id: string | null;
  current_level_id: string | null;
  current_term_id: string | null;
  is_verified: boolean;
  upload_disabled: boolean;
  created_at: string;
};

export default async function StudentAccountsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || currentProfile.role !== "super_admin") {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, student_id, email, department_id, batch_id, current_level_id, current_term_id, is_verified, upload_disabled, created_at",
    )
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const students = (data ?? []) as StudentProfile[];
  const verifiedCount = students.filter((s) => s.is_verified).length;
  const uploadDisabledCount = students.filter((s) => s.upload_disabled).length;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.22)]">
                <Users className="h-3 w-3" />
                Student Accounts
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Student Accounts
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              View registered student accounts, verification status, and
              upload controls.
            </p>
          </div>

          <Link
            href="/super-admin/users/students"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Students</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Students
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {students.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Verified
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {verifiedCount}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upload Disabled
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-rose-300">
              {uploadDisabledCount}
            </p>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-6">
            <p className="text-sm font-semibold text-rose-300">
              Unable to load student accounts.
            </p>
            <p className="mt-1 text-xs text-slate-400">{error.message}</p>
          </div>
        ) : (
          <StudentAccountsTable students={students} />
        )}

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Account Governance:
            </span>{" "}
            Student account deletions and bulk actions are enforced server-side
            with Super Admin verification.
          </p>
        </section>
      </main>
    </div>
  );
}