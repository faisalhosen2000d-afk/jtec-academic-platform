"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react";

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

const PAGE_SIZE = 15;

function getActionBadgeCls(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("delete") || a.includes("reject") || a.includes("remove")) {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (
    a.includes("approve") ||
    a.includes("verify") ||
    a.includes("create") ||
    a.includes("insert")
  ) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (a.includes("promote") || a.includes("update") || a.includes("edit")) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
}

export default function AuditLogsView({
  initialLogs,
  actors,
}: AuditLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);

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
      const newPayload = JSON.stringify(log.new_state || {}).toLowerCase();

      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        action.includes(q) ||
        target.includes(q) ||
        payload.includes(q) ||
        newPayload.includes(q)
      );
    });
  }, [initialLogs, actors, actionFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl">
      {/* Search & Filter Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by staff name, action, or payload..."
            className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-4 text-xs text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-cyan-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 text-xs font-medium text-white [color-scheme:dark] transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
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

      {paginated.length === 0 ? (
        <div className="space-y-2 p-12 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 text-slate-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="font-serif text-base font-bold text-white">
            No matching logs found
          </p>
          <p className="text-xs text-slate-400">
            Try adjusting your search query or filter category.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-[#060A12] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Date &amp; Time</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paginated.map((log) => {
                const actor = actors[log.actor_id];
                const titleDetail =
                  typeof log.previous_state?.title === "string"
                    ? log.previous_state.title
                    : log.target_id || "N/A";

                return (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-slate-900/45"
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-400">
                      {new Intl.DateTimeFormat("en-US", {
                        timeZone: "Asia/Dhaka",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(log.created_at))}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-semibold ${getActionBadgeCls(log.action)}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-xs font-semibold text-white">
                        {actor?.full_name || "Super Admin"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {actor?.email || log.actor_id}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md border border-slate-700/80 bg-slate-900 px-2 py-0.5 font-mono text-[11px] uppercase text-slate-300">
                        {log.target_table}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-md text-xs">
                        <p className="truncate font-semibold text-white">
                          {titleDetail}
                        </p>
                        {log.previous_state ? (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-rose-300/80">
                            Prev: {JSON.stringify(log.previous_state)}
                          </p>
                        ) : null}
                        {log.new_state ? (
                          <p className="mt-0.5 truncate font-mono text-[11px] text-emerald-300/90">
                            New: {JSON.stringify(log.new_state)}
                          </p>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 px-6 py-4 text-xs text-slate-400">
          <span>
            Showing {(safePage - 1) * PAGE_SIZE + 1} –{" "}
            {Math.min(safePage * PAGE_SIZE, filteredLogs.length)} of{" "}
            {filteredLogs.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-semibold text-slate-200">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-slate-700 bg-[#060A12] px-3 font-semibold text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}