import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      args?: Record<string, unknown>
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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">
              Super Admin Security
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              System Audit Logs
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Chronological log of administrative actions, material deletions, and critical changes.
            </p>
          </div>

          <Link href="/super-admin">
            <Button variant="outline">Back to Super Admin</Button>
          </Link>
        </div>

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Recorded Logs
            </p>
            <p className="mt-2 text-3xl font-bold">{auditLogs.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Recent activity records (up to 100)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary Monitored Actions
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Deletions, Permissions & Promotions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded securely via system RPC</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Log Retention Policy
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Immutable History
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Permanent traceability & audit trail</p>
          </div>
        </section>

        <AuditLogsView initialLogs={auditLogs} actors={actorMap} />
      </div>
    </main>
  );
}