import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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

  const serviceSupabase = createServiceRoleClient();

  const { data: logs, error } = await serviceSupabase
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, previous_state, new_state, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Audit logs query error:", error);
  }

  const auditLogs = (logs ?? []) as AuditLogRow[];

  const actorIds = Array.from(new Set(auditLogs.map((log) => log.actor_id).filter(Boolean)));

  let actorMap = new Map<string, ActorProfile>();
  if (actorIds.length > 0) {
    const { data: actors } = await serviceSupabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", actorIds);

    if (actors) {
      actorMap = new Map(actors.map((actor) => [actor.id, actor as ActorProfile]));
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

        {/* Log Table */}
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-semibold">Activity Stream</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All logged administrative events in descending chronological order.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-foreground">No audit logs recorded yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Administrative actions (e.g. deleting approved materials) will automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date &amp; Time</th>
                    <th className="px-5 py-3 font-semibold">Action Performed</th>
                    <th className="px-5 py-3 font-semibold">Actor (Staff)</th>
                    <th className="px-5 py-3 font-semibold">Target Entity</th>
                    <th className="px-5 py-3 font-semibold">Details / Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => {
                    const actor = actorMap.get(log.actor_id);
                    const titleDetail =
                      typeof log.previous_state?.title === "string"
                        ? log.previous_state.title
                        : log.target_id || "N/A";

                    return (
                      <tr key={log.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                          {new Intl.DateTimeFormat("en-US", {
                            timeZone: "Asia/Dhaka",
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(log.created_at))}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {log.action}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">
                            {actor?.full_name || "Super Admin"}
                          </div>
                          <div className="text-xs text-muted-foreground">{actor?.email || log.actor_id}</div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="font-mono text-xs uppercase text-muted-foreground">
                            {log.target_table}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-md text-xs">
                            <p className="font-medium text-foreground truncate">
                              {titleDetail}
                            </p>
                            {log.previous_state && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                Prev: {JSON.stringify(log.previous_state)}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}