import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function StudentsManagementPage() {
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

  const serviceSupabase = createServiceRoleClient();
  const [totalRes, pendingRes, uploadDisabledRes] = await Promise.all([
    serviceSupabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "student"),
    serviceSupabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "student")
      .eq("is_verified", false),
    serviceSupabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "student")
      .eq("upload_disabled", true),
  ]);

  const totalStudents = totalRes.count ?? 0;
  const pendingVerifications = pendingRes.count ?? 0;
  const uploadRestricted = uploadDisabledRes.count ?? 0;

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
                <GraduationCap className="h-3 w-3" />
                Student Management
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Student Management
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage student accounts, verification, and upload permissions.
            </p>
          </div>

          <Link
            href="/super-admin/users"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Users</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Registered Students
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {totalStudents}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Verifications
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {pendingVerifications}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Upload Restricted
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-rose-300">
              {uploadRestricted}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              Student Administration
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Choose a student-management area.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/super-admin/users/students/accounts"
              className="group flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {totalStudents} Accounts
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Student Accounts
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  View registered student accounts and their current account
                  status.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 transition-transform group-hover:translate-x-1">
                <span>View Student Accounts</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/super-admin/users/students/verification"
              className="group flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    {pendingVerifications} Pending
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Student Verification
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Review and verify student accounts that are waiting for
                  verification.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-amber-300 transition-transform group-hover:translate-x-1">
                <span>Manage Verification</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/super-admin/users/students/upload-permissions"
              className="group flex flex-col justify-between rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                    {uploadRestricted} Restricted
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Upload Permissions
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Manage student material-upload permissions when administrative
                  action is required.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-emerald-300 transition-transform group-hover:translate-x-1">
                <span>Manage Upload Permissions</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Student Administration Access:
            </span>{" "}
            Sensitive account changes are enforced server-side and through
            database Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}