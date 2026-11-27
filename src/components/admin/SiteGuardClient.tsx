"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface SupportTicketRow {
  id: string;
  ticket_type: string;
  student_name: string | null;
  student_roll: string | null;
  department_code: string | null;
  page_path: string | null;
  category: string;
  severity: string;
  message: string;
  ai_summary: string | null;
  status: "open" | "in_progress" | "resolved";
  admin_reply: string | null;
  created_at: string;
}

interface HealthMetrics {
  openTickets: number;
  highSeverityOpen: number;
  pendingVerifications: number;
  pendingMaterials: number;
  unlinkedResults: number;
  missingHashMaterials: number;
  geminiKeysCount: number;
}

function renderFormattedLines(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1.5" />;

    const isBullet = /^[-*\u2022]\s+/.test(trimmed);
    const numberedMatch = trimmed.match(/^([0-9\u09E6-\u09EF]+[.)])\s+(.*)$/);
    const clean = isBullet
      ? trimmed.replace(/^[-*\u2022]\s+/, "")
      : numberedMatch
        ? (numberedMatch[2] ?? "")
        : trimmed;

    const parts = clean.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, idx) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={idx} className="font-semibold text-white">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={idx}>{p}</span>
      )
    );

    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2.5 pl-0.5">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
          <p className="flex-1 text-[13.5px] leading-7 text-slate-200 sm:text-sm">
            {rendered}
          </p>
        </div>
      );
    }

    if (numberedMatch) {
      return (
        <div key={i} className="flex items-start gap-2.5 pl-1">
          <span className="mt-0.5 shrink-0 font-semibold text-violet-300 text-[13.5px] leading-7 sm:text-sm">
            {numberedMatch[1]}
          </span>
          <p className="flex-1 text-[13.5px] leading-7 text-slate-200 sm:text-sm">
            {rendered}
          </p>
        </div>
      );
    }

    return (
      <p key={i} className="text-[13.5px] leading-7 text-slate-200 sm:text-sm">
        {rendered}
      </p>
    );
  });
}

export function SiteGuardClient() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedNoticeId, setSavedNoticeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/site-guard");
      const data = (await res.json()) as {
        success?: boolean;
        tickets?: SupportTicketRow[];
        health?: HealthMetrics;
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load.");
      setTickets(data.tickets || []);
      setHealth(data.health || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const runAiAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      const res = await fetch("/api/super-admin/site-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_audit" }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        report?: string;
        health?: HealthMetrics;
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error || "Audit failed.");
      setAuditReport(data.report || "");
      if (data.health) setHealth(data.health);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setAuditing(false);
    }
  };

  const updateTicket = async (
    ticketId: string,
    status: "open" | "in_progress" | "resolved",
    existingReply?: string | null
  ) => {
    setSavingId(ticketId);
    try {
      const draft = (replyDrafts[ticketId] ?? "").trim();
      const finalReply = draft || existingReply || "";
      const res = await fetch("/api/super-admin/site-guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_ticket",
          ticketId,
          status,
          adminReply: finalReply || undefined,
        }),
      });
      if (res.ok) {
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        setSavedNoticeId(ticketId);
        window.setTimeout(
          () => setSavedNoticeId((prev) => (prev === ticketId ? null : prev)),
          3000
        );
        await loadData();
      }
    } finally {
      setSavingId(null);
    }
  };

  const visibleTickets = tickets.filter((t) => {
    if (filter === "open") return t.status !== "resolved";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  return (
    <div className="site-guard-bn space-y-5">
      <style>{`@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"); .site-guard-bn { font-family: "Noto Sans Bengali", ui-sans-serif, system-ui, sans-serif; }`}</style>
      <div className="flex flex-col gap-3 rounded-2xl border border-violet-500/30 bg-[#0A1020] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/40 bg-violet-500/15 text-violet-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Site Guard &amp; Support Center</h1>
            <p className="text-xs text-slate-400">
              Live platform health monitor &amp; student complaint queue
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-700 bg-[#060A12] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void runAiAudit()}
            disabled={auditing}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:from-violet-500 hover:to-cyan-500 disabled:opacity-50"
          >
            {auditing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Run AI Site Guard Audit
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {health && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Open Tickets", val: health.openTickets, warn: health.openTickets > 0 },
            { label: "High Priority", val: health.highSeverityOpen, warn: health.highSeverityOpen > 0 },
            { label: "Pending IDs", val: health.pendingVerifications, warn: health.pendingVerifications > 5 },
            { label: "Pending Notes", val: health.pendingMaterials, warn: health.pendingMaterials > 5 },
            { label: "Unlinked Results", val: health.unlinkedResults, warn: health.unlinkedResults > 0 },
            { label: "Gemini Keys", val: health.geminiKeysCount, warn: health.geminiKeysCount < 1 },
          ].map((k) => (
            <div
              key={k.label}
              className={`rounded-xl border p-3.5 ${
                k.warn ? "border-amber-500/40 bg-amber-500/10" : "border-slate-800 bg-[#0A1020]"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {k.label}
              </p>
              <p className={`mt-1 text-xl font-extrabold ${k.warn ? "text-amber-300" : "text-emerald-300"}`}>
                {k.val}
              </p>
            </div>
          ))}
        </div>
      )}

      {auditReport && (
        <div className="space-y-3 rounded-2xl border border-violet-500/35 bg-gradient-to-br from-[#0E1529] via-[#0B1222] to-[#08101E] p-5 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5 text-sm font-bold text-violet-300">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            AI Maintenance &amp; Fault Report
          </div>
          <div className="space-y-2">{renderFormattedLines(auditReport)}</div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-[#0A1020] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">
            Student Complaints &amp; Alerts ({visibleTickets.length})
          </h2>
          <div className="flex gap-1.5">
            {(["all", "open", "resolved"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                  filter === f
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visibleTickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-xs text-slate-400">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <span>No tickets in this view. Everything looks healthy!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleTickets.map((t) => (
              <div
                key={t.id}
                className="space-y-3 rounded-xl border border-slate-800 bg-[#060A12] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-white">{t.student_name || "System"}</span>
                    {t.student_roll && (
                      <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-cyan-300">
                        {t.student_roll}
                      </span>
                    )}
                    {t.department_code && (
                      <span className="text-slate-400">({t.department_code})</span>
                    )}
                    <span className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-violet-200">
                      {t.category}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10.5px] text-slate-300">
                      {t.page_path || "/"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase ${
                        t.status === "resolved"
                          ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : t.status === "in_progress"
                            ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                            : "border border-rose-500/40 bg-rose-500/15 text-rose-300"
                      }`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                    {t.severity === "high" || t.severity === "critical" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-bold uppercase text-rose-300">
                        <AlertTriangle className="h-3 w-3" /> {t.severity}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-slate-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {t.ai_summary && (
                  <p className="text-xs font-medium leading-relaxed text-cyan-200">
                    AI Summary: {t.ai_summary}
                  </p>
                )}

                <p className="rounded-lg border border-slate-800/80 bg-[#0A1020]/70 px-3.5 py-2.5 text-[13.5px] leading-7 text-slate-200 whitespace-pre-wrap">
                  {t.message}
                </p>

                {t.admin_reply && (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] leading-relaxed text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <div>
                      <span className="font-semibold">Sent to Student:</span> {t.admin_reply}
                    </div>
                  </div>
                )}

                {savedNoticeId === t.id && (
                  <p className="text-[11px] font-semibold text-emerald-400">
                    Reply sent &amp; status updated!
                  </p>
                )}

                <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={replyDrafts[t.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))
                    }
                    placeholder={
                      t.admin_reply
                        ? "Write a new reply to update student..."
                        : "Write reply for student..."
                    }
                    className="flex-1 rounded-lg border border-slate-700/80 bg-[#0A1020] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={savingId === t.id}
                      onClick={() => void updateTicket(t.id, "in_progress", t.admin_reply)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" /> Send &amp; Working
                    </button>
                    <button
                      type="button"
                      disabled={savingId === t.id}
                      onClick={() => void updateTicket(t.id, "resolved", t.admin_reply)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" />{" "}
                      {savingId === t.id ? "Sending..." : "Send & Resolve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}