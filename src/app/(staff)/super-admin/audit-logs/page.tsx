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

  
  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, previous_state, new_state, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Audit logs query error:", error);
  }

  const auditLogs = (logs ?? []) as AuditLogRow[];
  const actorIds = Array.from(new Set(auditLogs.map((log) => log.actor_id).filter(Boolean)));

  const actorMap: Record<string, ActorProfile> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", actorIds);

    if (actors) {
      actors.forEach((actor) => {
        actorMap[actor.id] = actor as ActorProfile;
      });
    }
  }

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
              Deletions, Permissions &amp; Promotions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Recorded securely via service-role</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Log Retention Policy
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Immutable History
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Permanent traceability &amp; audit trail</p>
          </div>
        </section>

        <AuditLogsView initialLogs={auditLogs} actors={actorMap} />
      </div>
    </main>
  );
}