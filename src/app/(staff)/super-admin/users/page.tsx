import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function UsersManagementPage() {
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

  const [studentsRes, pendingVerifRes, staffRes, staffReqRes] =
    await Promise.all([
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
        .in("role", ["admin", "moderator"]),
      serviceSupabase
        .from("administration_account_requests")
        .select("id", { count: "exact" })
        .eq("status", "pending"),
    ]);

  const totalStudents = studentsRes.count ?? 0;
  const pendingVerifications = pendingVerifRes.count ?? 0;
  const totalStaff = staffRes.count ?? 0;
  const pendingStaffRequests = staffReqRes.count ?? 0;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.22)]">
                <Users className="h-3 w-3" />
                Users &amp; Permissions
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Users Management
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage student and staff accounts across the JTEC Academic
              Platform.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:text-cyan-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* 4 Live KPI Cards */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Students
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {totalStudents}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending ID Checks
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {pendingVerifications}
            </p>
          </div>
          <div className="rounded-2xl border border-violet-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Staff
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-violet-300">
              {totalStaff}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Staff Requests
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-300">
              {pendingStaffRequests}
            </p>
          </div>
        </section>

        {/* Category Cards */}
        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              User Administration
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Choose a user category to manage.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/super-admin/users/students"
              className="group flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_12px_36px_rgba(6,182,212,0.12)]"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/15 text-cyan-300">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {totalStudents} Students
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Students
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  View and manage student accounts, verification status, and
                  student-related account controls.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-cyan-300 transition-transform group-hover:translate-x-1">
                <span>Manage Students</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/super-admin/users/staff"
              className="group flex flex-col justify-between rounded-2xl border border-violet-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/60 hover:shadow-[0_12px_36px_rgba(139,92,246,0.12)]"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/15 text-violet-300">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    {totalStaff} Staff
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Staff
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Manage Admin and Moderator staff accounts, departmental scope,
                  and platform permissions.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-violet-300 transition-transform group-hover:translate-x-1">
                <span>Manage Staff</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* Slim RLS Footer */}
        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              User Administration Access:
            </span>{" "}
            User administration controls are enforced server-side and through
            database Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}