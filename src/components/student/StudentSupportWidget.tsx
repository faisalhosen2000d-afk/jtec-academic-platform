"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, LifeBuoy, Loader2, Send, Sparkles, X } from "lucide-react";

interface StudentTicket {
  id: string;
  category: string;
  severity: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
}

export function StudentSupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"report" | "history">("report");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<StudentTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/support/report");
      const data = (await res.json()) as { success?: boolean; tickets?: StudentTicket[] };
      if (res.ok && data.success && data.tickets) {
        setTickets(data.tickets);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open && tab === "history") {
      loadHistory();
    }
  }, [open, tab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setReply(null);
    try {
      const res = await fetch("/api/support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), pagePath: pathname }),
      });
      const data = (await res.json()) as { success?: boolean; reply?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Could not send report.");
      setReply(data.reply || "Report sent to Super Admin.");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-[#0B1222]/95 px-3.5 py-2.5 text-xs font-semibold text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.25)] backdrop-blur-md transition hover:border-cyan-400 hover:bg-[#101A30] active:scale-95"
        aria-label="Help & Report Issue"
      >
        <LifeBuoy className="h-4 w-4 text-cyan-400" />
        <span className="hidden sm:inline">Help & Report</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 p-3 backdrop-blur-sm sm:p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0A1020] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-100">AI Help & Issue Report</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-800/80 px-4 pt-2 gap-2">
              <button
                type="button"
                onClick={() => setTab("report")}
                className={`border-b-2 pb-2 text-xs font-semibold transition ${
                  tab === "report" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Report Problem
              </button>
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`border-b-2 pb-2 text-xs font-semibold transition ${
                  tab === "history" ? "border-cyan-400 text-cyan-300" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                My Reports
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tab === "report" ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <p className="text-xs leading-relaxed text-slate-400">
                    Facing a bug, missing result, or broken PDF? Tell us below—Super Admin will review it directly.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {["My result is missing", "PDF file is not opening", "Page showing an error"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMessage(preset)}
                        className="rounded-lg border border-slate-700/80 bg-[#060A12] px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your problem in Bangla or English..."
                    className="w-full resize-none rounded-xl border border-slate-700/80 bg-[#060A12] p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
                  />
                  {error && (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      {error}
                    </p>
                  )}
                  {reply && (
                    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{reply}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || message.trim().length < 4}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send to Super Admin
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5">
                  {loadingHistory ? (
                    <div className="flex justify-center py-6 text-xs text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : tickets.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No reports submitted yet.</p>
                  ) : (
                    tickets.map((t) => (
                      <div key={t.id} className="rounded-xl border border-slate-800 bg-[#060A12] p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-cyan-300">{t.category}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              t.status === "resolved"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : t.status === "in_progress"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200">{t.message}</p>
                        {t.admin_reply && (
                          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-2 text-[11px] text-emerald-200">
                            <strong>Admin Reply:</strong> {t.admin_reply}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}