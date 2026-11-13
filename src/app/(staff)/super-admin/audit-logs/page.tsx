import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScrollText, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AuditLogsView from "./AuditLogsView";

type AuditLogRow = {
  id: string;
  actor_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  created_at: string;
};

type ActorProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type AuditLogRpcRow = {
  id: string;
  actor_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  created_at: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
};

export default async function AuditLogsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/staff-login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    redirect("/");
  }

  // Fetch audit logs safely via SECURITY DEFINER RPC bypassing all RLS policies
  const { data: rawLogs, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args?: Record<string, unknown>,
    ) => Promise<{ data: AuditLogRpcRow[] | null; error: unknown }>
  )("get_system_audit_logs", { p_limit: 100 });

  if (error) {
    console.error("Audit logs query error:", error);
  }

  const logRows = rawLogs ?? [];
  const auditLogs: AuditLogRow[] = logRows.map((r) => ({
    id: r.id,
    actor_id: r.actor_id,
    action: r.action,
    target_table: r.target_table,
    target_id: r.target_id,
    previous_state: r.previous_state,
    new_state: r.new_state,
    created_at: r.created_at,
  }));

  const actorMap: Record<string, ActorProfile> = {};
  logRows.forEach((r) => {
    if (r.actor_id && !actorMap[r.actor_id]) {
      actorMap[r.actor_id] = {
        id: r.actor_id,
        full_name: r.actor_name,
        email: r.actor_email,
        role: r.actor_role,
      };
    }
  });

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
                <ScrollText className="h-3 w-3" />
                Audit Logs
              </span>
              <span className="text-xs text-slate-400">
                Super Admin Security
              </span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
              System Audit Logs
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Chronological log of administrative actions, material deletions,
              and critical changes.
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
        {/* 3 Live KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-cyan-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(6,182,212,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Recorded Logs
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-cyan-300">
              {auditLogs.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Recent activity records (up to 100)
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(245,158,11,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Primary Monitored Actions
            </p>
            <p className="mt-2 font-serif text-lg font-bold text-amber-300">
              Deletions, Permissions &amp; Promotions
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Recorded securely via system RPC
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1020] p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-[#0D162B] hover:shadow-[0_10px_30px_rgba(16,185,129,0.14)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Log Retention Policy
            </p>
            <p className="mt-2 font-serif text-lg font-bold text-emerald-300">
              Immutable History
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Permanent traceability &amp; audit trail
            </p>
          </div>
        </section>

        <AuditLogsView initialLogs={auditLogs} actors={actorMap} />

        <section className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-[#0A1020]/70 px-5 py-4 text-xs text-slate-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <p className="leading-relaxed">
            <span className="font-semibold text-slate-200">
              Immutable Audit Trail:
            </span>{" "}
            Audit logs are retrieved through a{" "}
            <code className="text-cyan-300">SECURITY DEFINER</code> RPC and
            cannot be altered from the UI.
          </p>
        </section>
      </main>
    </div>
  );
}