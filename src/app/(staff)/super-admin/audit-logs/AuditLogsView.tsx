"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Filter,
  Search,
  ShieldAlert,
  UserCheck,
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

type DropdownOption = {
  value: string;
  label: string;
};

function ModernDropdown({
  value,
  onChange,
  options,
  icon,
}: {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 min-w-[180px] cursor-pointer items-center justify-between gap-2.5 rounded-xl border bg-[#060A12] px-3.5 text-xs font-semibold text-white transition-all ${
          open
            ? "border-cyan-400/80 ring-2 ring-cyan-500/20"
            : "border-slate-700/80 hover:border-slate-600"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selected?.label ?? "Select"}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? "rotate-180 text-cyan-300" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-72 w-full min-w-[230px] overflow-y-auto rounded-xl border border-cyan-500/35 bg-[#0A1020] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isSelected
                    ? "bg-cyan-500/20 font-semibold text-cyan-300"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function getActionBadgeCls(action: string): string {
  const a = action.toLowerCase();
  if (
    a.includes("delete") ||
    a.includes("reject") ||
    a.includes("remove") ||
    a.includes("disable")
  ) {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (
    a.includes("approve") ||
    a.includes("verify") ||
    a.includes("create") ||
    a.includes("insert") ||
    a.includes("enable")
  ) {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  }
  if (a.includes("promote") || a.includes("update") || a.includes("edit")) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
}

function getRoleBadgeCls(role: string): string {
  const r = role.toLowerCase();
  if (r === "super_admin") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  if (r === "admin") {
    return "border-violet-500/40 bg-violet-500/15 text-violet-300";
  }
  if (r === "moderator") {
    return "border-cyan-500/40 bg-cyan-500/15 text-cyan-300";
  }
  return "border-slate-700 bg-slate-800 text-slate-300";
}

function formatRoleLabel(role: string): string {
  const r = role.toLowerCase();
  if (r === "super_admin") return "Super Admin";
  if (r === "admin") return "Admin";
  if (r === "moderator") return "Moderator";
  return role || "Staff";
}

function formatActionLabel(action: string): string {
  const map: Record<string, string> = {
    enable_student_upload_permission: "Enabled Student Upload",
    disable_student_upload_permission: "Disabled Student Upload",
    "material.approved": "Approved Material",
    "material.rejected": "Rejected Material",
    "material.deleted": "Deleted Material",
    verify_student: "Verified Student",
    verify_student_approved: "Approved Student ID",
    verify_student_rejected: "Rejected Student ID",
  };
  if (map[action]) return map[action];
  return action
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatFieldKey(key: string): string {
  const map: Record<string, string> = {
    upload_disabled: "Upload Disabled",
    is_verified: "Verified",
    verification_status: "Verification",
    status: "Status",
    role: "Role",
    reviewed_at: "Reviewed At",
    reviewed_by: "Reviewed By",
    rejection_reason: "Reason",
    title: "Title",
    full_name: "Name",
    student_id: "Student ID",
  };
  if (map[key]) return map[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatFieldValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "None";
  if (typeof val === "boolean") {
    if (key === "upload_disabled") return val ? "Restricted" : "Allowed";
    return val ? "Yes" : "No";
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Dhaka",
          dateStyle: "medium",
          timeStyle: "short",
        }).format(d);
      }
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val)) {
      return `#${val.slice(0, 8)}`;
    }
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return String(val);
}

function getHumanSummary(log: AuditLogRow): {
  headline: string;
  changes: Array<{ label: string; before?: string; after?: string }>;
} {
  const prev = log.previous_state ?? {};
  const next = log.new_state ?? {};

  const titleCandidate =
    (typeof prev.title === "string" && prev.title) ||
    (typeof next.title === "string" && next.title) ||
    (typeof prev.full_name === "string" && prev.full_name) ||
    (typeof next.full_name === "string" && next.full_name) ||
    (typeof prev.student_id === "string" && `Roll: ${prev.student_id}`) ||
    (typeof next.student_id === "string" && `Roll: ${next.student_id}`) ||
    (log.target_id ? `Record #${log.target_id.slice(0, 8)}` : "System Record");

  const allKeys = Array.from(
    new Set([...Object.keys(prev), ...Object.keys(next)]),
  ).filter((k) => k !== "updated_at" && k !== "reviewed_by");

  const changes: Array<{ label: string; before?: string; after?: string }> = [];

  for (const key of allKeys) {
    const hasPrev = key in prev;
    const hasNext = key in next;
    const prevStr = hasPrev ? formatFieldValue(key, prev[key]) : undefined;
    const nextStr = hasNext ? formatFieldValue(key, next[key]) : undefined;

    if (hasPrev && hasNext && prevStr === nextStr) continue;
    if (key === "title" && prevStr === titleCandidate) continue;

    changes.push({
      label: formatFieldKey(key),
      before: prevStr,
      after: nextStr,
    });
  }

  return {
    headline: titleCandidate,
    changes: changes.slice(0, 4),
  };
}

export default function AuditLogsView({
  initialLogs,
  actors,
}: AuditLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rawOpenIds, setRawOpenIds] = useState<Record<string, boolean>>({});

  const roleScopedLogs = useMemo(() => {
    if (roleFilter === "all") return initialLogs;
    return initialLogs.filter((log) => {
      const actorRole = (actors[log.actor_id]?.role ?? "super_admin").toLowerCase();
      return actorRole === roleFilter;
    });
  }, [initialLogs, actors, roleFilter]);

  const roleOptions: DropdownOption[] = useMemo(() => {
    const countFor = (r: string) =>
      initialLogs.filter(
        (l) => (actors[l.actor_id]?.role ?? "super_admin").toLowerCase() === r,
      ).length;

    return [
      { value: "all", label: `All Roles (${initialLogs.length})` },
      { value: "super_admin", label: `Super Admin (${countFor("super_admin")})` },
      { value: "admin", label: `Admin (${countFor("admin")})` },
      { value: "moderator", label: `Moderator (${countFor("moderator")})` },
    ];
  }, [initialLogs, actors]);

  const actionOptions: DropdownOption[] = useMemo(() => {
    const actions = Array.from(new Set(roleScopedLogs.map((l) => l.action)));
    return [
      { value: "all", label: `All Actions (${roleScopedLogs.length})` },
      ...actions.map((act) => ({
        value: act,
        label: `${formatActionLabel(act)} (${roleScopedLogs.filter((l) => l.action === act).length})`,
      })),
    ];
  }, [roleScopedLogs]);

  const filteredLogs = useMemo(() => {
    return roleScopedLogs.filter((log) => {
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
      const actorRole = actor?.role?.toLowerCase() || "";
      const action = log.action.toLowerCase();
      const humanAction = formatActionLabel(log.action).toLowerCase();
      const target = log.target_table.toLowerCase();
      const payload = JSON.stringify(log.previous_state || {}).toLowerCase();
      const newPayload = JSON.stringify(log.new_state || {}).toLowerCase();

      return (
        actorName.includes(q) ||
        actorEmail.includes(q) ||
        actorRole.includes(q) ||
        action.includes(q) ||
        humanAction.includes(q) ||
        target.includes(q) ||
        payload.includes(q) ||
        newPayload.includes(q)
      );
    });
  }, [roleScopedLogs, actors, actionFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredLogs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <section className="overflow-visible rounded-2xl border border-slate-800/90 bg-[#0A1020] shadow-xl transition-all duration-200 hover:border-cyan-500/40 hover:shadow-[0_14px_40px_rgba(6,182,212,0.10)]">
      {/* Search & Custom Dropdown Filters */}
      <div className="flex flex-col gap-3 border-b border-slate-800/80 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search by staff name, role, action, or details..."
            className="h-10 w-full rounded-xl border border-slate-700/80 bg-[#060A12] pl-10 pr-4 text-xs text-white placeholder:text-slate-500 transition-all focus:border-cyan-400/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ModernDropdown
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setActionFilter("all");
              setPage(1);
            }}
            options={roleOptions}
            icon={<UserCheck className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
          />

          <ModernDropdown
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setPage(1);
            }}
            options={actionOptions}
            icon={<Filter className="h-3.5 w-3.5 shrink-0 text-cyan-400" />}
          />
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
            Try adjusting your search query, role filter, or action category.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead className="border-b border-slate-800/80 bg-[#060A12] text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Date &amp; Time</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Activity Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {paginated.map((log) => {
                const actor = actors[log.actor_id];
                const actorRole = actor?.role ?? "super_admin";
                const summary = getHumanSummary(log);
                const showRaw = Boolean(rawOpenIds[log.id]);

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
                        {formatActionLabel(log.action)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-white">
                          {actor?.full_name || "Super Admin"}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeCls(actorRole)}`}
                        >
                          {formatRoleLabel(actorRole)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        {actor?.email || log.actor_id}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="rounded-md border border-slate-700/80 bg-slate-900 px-2 py-0.5 font-mono text-[11px] uppercase text-slate-300">
                        {log.target_table}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="max-w-md space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-white">
                            {summary.headline}
                          </p>
                          {log.previous_state || log.new_state ? (
                            <button
                              type="button"
                              onClick={() =>
                                setRawOpenIds((prev) => ({
                                  ...prev,
                                  [log.id]: !prev[log.id],
                                }))
                              }
                              className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border border-slate-700/80 bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                            >
                              <Code2 className="h-3 w-3" />
                              <span>{showRaw ? "Hide" : "Raw"}</span>
                            </button>
                          ) : null}
                        </div>

                        {summary.changes.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {summary.changes.map((chg) => (
                              <span
                                key={chg.label}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-[#060A12] px-2 py-0.5 text-[11px]"
                              >
                                <span className="font-medium text-slate-400">
                                  {chg.label}:
                                </span>
                                {chg.before !== undefined ? (
                                  <span className="text-rose-300">
                                    {chg.before}
                                  </span>
                                ) : null}
                                {chg.before !== undefined &&
                                chg.after !== undefined ? (
                                  <span className="text-slate-500">→</span>
                                ) : null}
                                {chg.after !== undefined ? (
                                  <span className="font-semibold text-emerald-300">
                                    {chg.after}
                                  </span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {showRaw ? (
                          <div className="mt-1 space-y-0.5 rounded-lg border border-slate-800 bg-[#060A12] p-2 font-mono text-[10px]">
                            {log.previous_state ? (
                              <p className="break-all text-rose-300/80">
                                Prev: {JSON.stringify(log.previous_state)}
                              </p>
                            ) : null}
                            {log.new_state ? (
                              <p className="break-all text-emerald-300/90">
                                New: {JSON.stringify(log.new_state)}
                              </p>
                            ) : null}
                          </div>
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