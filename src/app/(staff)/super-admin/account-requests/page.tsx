import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  approveAdministrationAccountRequest,
  rejectAdministrationAccountRequest,
} from "../users/actions";

type AccountRequest = {
  id: string;
  full_name: string;
  email: string;
  requested_role: "admin" | "moderator";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

async function handleApproveRequest(requestId: string) {
  "use server";

  await approveAdministrationAccountRequest(requestId);
}

async function handleRejectRequest(requestId: string) {
  "use server";

  await rejectAdministrationAccountRequest(requestId);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? "";
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function ApproveButton({ requestId }: { requestId: string }) {
  return (
    <form action={handleApproveRequest.bind(null, requestId)}>
      <button
        type="submit"
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-500 px-3.5 text-xs font-bold text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.28)] transition-all duration-150 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-[0_0_22px_rgba(16,185,129,0.45)] active:scale-95"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Approve</span>
      </button>
    </form>
  );
}

function RejectButton({ requestId }: { requestId: string }) {
  return (
    <form action={handleRejectRequest.bind(null, requestId)}>
      <button
        type="submit"
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 text-xs font-semibold text-rose-300 transition-all duration-150 hover:border-rose-400 hover:bg-rose-500/25 active:scale-95"
      >
        <XCircle className="h-3.5 w-3.5" />
        <span>Reject</span>
      </button>
    </form>
  );
}

export default async function AdministrationAccountRequestsPage() {
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

  const { data, error } = await serviceSupabase
    .from("administration_account_requests")
    .select("id, full_name, email, requested_role, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const requests = (data ?? []) as AccountRequest[];
  const adminCount = requests.filter((r) => r.requested_role === "admin").length;
  const moderatorCount = requests.filter(
    (r) => r.requested_role === "moderator",
  ).length;

  return (
    <div className="min-h-screen bg-[#060A12] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060A12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.22)]">
                <UserPlus className="h-3 w-3" />
                Account Requests
              </span>
              <span className="text-xs text-slate-400">Super Admin</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Administration Account Requests
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Review and approve or reject Administrator and Moderator account
              requests.
            </p>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-gradient-to-b from-slate-800/90 to-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-amber-300 active:translate-y-0 active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Super Admin</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* 3 Live KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Requests
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-300">
              {requests.length}
            </p>
          </div>
          <div className="rounded-2xl border border-violet-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Admin Role
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-violet-300">
              {adminCount}
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Moderator Role
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {moderatorCount}
            </p>
          </div>
        </section>

        {/* Pending Requests List */}
        <section className="rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-6 py-5">
            <div>
              <h2 className="font-serif text-lg font-bold text-white">
                Pending Administration Accounts
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                These Administrator and Moderator accounts are waiting for Super
                Admin approval.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              {requests.length} Pending
            </span>
          </div>

          {error ? (
            <div className="p-6">
              <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4">
                <p className="text-sm font-semibold text-rose-300">
                  Unable to load account requests.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Please try again after checking the database connection and
                  permissions.
                </p>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-white">
                No pending account requests
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                There are currently no Administrator or Moderator accounts
                waiting for approval.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {requests.map((request) => {
                const isAdminRole = request.requested_role === "admin";
                return (
                  <div
                    key={request.id}
                    className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-slate-900/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                          isAdminRole
                            ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                            : "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                        }`}
                      >
                        {getInitials(request.full_name)}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-white">
                            {request.full_name}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                              isAdminRole
                                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                                : "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"
                            }`}
                          >
                            {request.requested_role}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-500" />
                            {request.email}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                            Requested{" "}
                            {new Date(request.created_at).toLocaleDateString(
                              "en-GB",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <ApproveButton requestId={request.id} />
                      <RejectButton requestId={request.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Slim RLS Footer */}
        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Approval Control:
            </span>{" "}
            Account approval and rejection are handled by server-side Super
            Admin functions without bypassing database Row Level Security (RLS).
          </p>
        </section>
      </main>
    </div>
  );
}