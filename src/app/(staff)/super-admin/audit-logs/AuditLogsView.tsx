"use client";

import { useMemo, useState } from "react";
import { Search, Filter, ShieldAlert } from "lucide-react";

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

type AuditLogsViewProps = {
  initialLogs: AuditLogRow[];
  actors: Record<string, ActorProfile>;
};

export default function AuditLogsView({ initialLogs, actors }: AuditLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const availableActions = useMemo(() => {
    return Array.from(new Set(initialLogs.map((l) => l.action)));
  }, [initialLogs]);

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      if (!searchTerm.trim()) {
        return true;
      }

      const q = searchTerm.toLowerCase();
      const actor = actors[log.actor_id];
      const actorName = actor?.full_name?.toLowerCase() || "";
      const actorEmail = actor?.email?.toLowerCase() || "";
      const action = log.action.toLowerCase();
      const target = log.target_table.toLowerCase();
      const payload = JSON.stringify(log.previous_state || {}).toLowerCase();

      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        action.includes(q) ||
        target.includes(q) ||
        payload.includes(q)
      );
    });
  }, [initialLogs, actors, actionFilter, searchTerm]);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Search & Filter Header */}
      <div className="border-b border-border p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by staff name, action, or payload..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">All Actions ({initialLogs.length})</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>
                {act} ({initialLogs.filter((l) => l.action === act).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground opacity-60" />
          <p className="font-semibold text-foreground text-sm">No matching logs found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search query or filter category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-5 py-3 font-semibold text-xs">Date &amp; Time</th>
                <th className="px-5 py-3 font-semibold text-xs">Action</th>
                <th className="px-5 py-3 font-semibold text-xs">Staff Member</th>
                <th className="px-5 py-3 font-semibold text-xs">Target Entity</th>
                <th className="px-5 py-3 font-semibold text-xs">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => {
                const actor = actors[log.actor_id];
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
                      <div className="font-medium text-foreground text-xs">
                        {actor?.full_name || "Super Admin"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{actor?.email || log.actor_id}</div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs uppercase text-muted-foreground">
                        {log.target_table}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-md text-xs">
                        <p className="font-medium text-foreground truncate">{titleDetail}</p>
                        {log.previous_state && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground font-mono truncate">
                            Prev: {JSON.stringify(log.previous_state)}
                          </p>
                        )}
                        {log.new_state && (
                          <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                            New: {JSON.stringify(log.new_state)}
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
  );
}