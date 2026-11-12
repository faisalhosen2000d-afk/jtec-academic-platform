import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export default async function StaffManagementPage() {
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
  const [adminRes, modRes, pendingReqRes] = await Promise.all([
    serviceSupabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "admin"),
    serviceSupabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("role", "moderator"),
    serviceSupabase
      .from("administration_account_requests")
      .select("id", { count: "exact" })
      .eq("status", "pending"),
  ]);

  const adminCount = adminRes.count ?? 0;
  const modCount = modRes.count ?? 0;
  const pendingReqCount = pendingReqRes.count ?? 0;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-violet-300 shadow-[0_0_18px_rgba(139,92,246,0.22)]">
                <Shield className="h-3 w-3" />
                Staff Management
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Staff Management
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Manage Admin and Moderator staff accounts and their platform
              permissions.
            </p>
          </div>

          <Link
            href="/super-admin/users"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-500/50 hover:text-violet-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Users</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-violet-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Admins
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-violet-300">
              {adminCount}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Moderators
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {modCount}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Requests
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {pendingReqCount}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-white">
              Staff Administration
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Choose a staff-management area.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Link
              href="/super-admin/account-requests"
              className="group flex flex-col justify-between rounded-2xl border border-amber-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                    {pendingReqCount} Pending
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Staff Account Verification
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Review, verify, approve, or reject Admin and Moderator account
                  requests.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-amber-300 transition-transform group-hover:translate-x-1">
                <span>Review Staff Requests</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              href="/super-admin/users/staff/permissions"
              className="group flex flex-col justify-between rounded-2xl border border-violet-500/30 bg-[#0A1020] p-6 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/60"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/15 text-violet-300">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    {adminCount + modCount} Staff
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-white">
                  Staff Permissions
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Manage department scope and capability permissions for Admin
                  staff.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-violet-300 transition-transform group-hover:translate-x-1">
                <span>Manage Permissions</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </section>

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Staff Administration Access:
            </span>{" "}
            Account and permission changes are enforced server-side and through
            database Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}