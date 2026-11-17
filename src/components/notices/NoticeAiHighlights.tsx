"use client";

import { useState } from "react";
import { ChevronUp, Languages, Loader2, MessageSquare, Send, Sparkles } from "lucide-react";

interface NoticeAiHighlightsProps {
  noticeId: string;
  hasAttachments: boolean;
}

function renderFormattedLines(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1" />;
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const clean = trimmed.replace(/^[-*•]\s+/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((p, idx) =>
      p.startsWith("**") && p.endsWith("**") ? (
        <strong key={idx} className="font-semibold text-slate-100">
          {p.slice(2, -2)}
        </strong>
      ) : (
        <span key={idx}>{p}</span>
      )
    );

    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2 pl-0.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
          <p className="flex-1 text-xs leading-relaxed text-slate-200">{rendered}</p>
        </div>
      );
    }
    return (
      <p key={i} className="text-xs leading-relaxed text-slate-200">
        {rendered}
      </p>
    );
  });
}

export function NoticeAiHighlights({ noticeId, hasAttachments }: NoticeAiHighlightsProps) {
  const [loadingMode, setLoadingMode] = useState<"en" | "bn" | "ask" | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const runAction = async (mode: "en" | "bn" | "ask", qText?: string) => {
    if (mode === "ask" && !(qText ?? question).trim()) return;
    setLoadingMode(mode);
    setError(null);
    setCollapsed(false);
    const nextTitle =
      mode === "bn"
        ? "\u09B8\u09B9\u099C \u09AC\u09BE\u0982\u09B2\u09BE\u09DF \u09AE\u09C2\u09B2 \u09AA\u09DF\u09C7\u09A8\u09CD\u099F"
        : mode === "ask"
          ? "Notice AI Answer"
          : "Key Highlights (EN)";
    try {
      const res = await fetch("/api/notices/ai-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noticeId,
          mode,
          question: mode === "ask" ? (qText ?? question).trim() : undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; reply?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Could not summarize notice.");
      setActiveTitle(nextTitle);
      setOutput(data.reply || "");
      if (mode === "ask") setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize notice.");
    } finally {
      setLoadingMode(null);
    }
  };

  const isBusy = loadingMode !== null;

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 transition-all duration-300 ${
        isBusy
          ? "border-amber-400/60 bg-gradient-to-r from-[#131129] via-[#191533] to-[#11192D] shadow-[0_0_24px_rgba(245,158,11,0.16)]"
          : "border-amber-500/25 bg-gradient-to-r from-[#0C1222] via-[#10162B] to-[#0E1526]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/15 text-amber-300">
            <Sparkles className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300">AI Notice Summary</h2>
            <p className="text-[11px] text-slate-400">
              {hasAttachments ? "Reads notice text & attached PDF/images" : "Instant key dates & action points"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runAction("en")}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25 disabled:opacity-50"
          >
            {loadingMode === "en" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Key Highlights
          </button>

          <button
            type="button"
            onClick={() => runAction("bn")}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {loadingMode === "bn" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
            {"\u09B8\u09B9\u099C \u09AC\u09BE\u0982\u09B2\u09BE\u09DF"}
          </button>

          <button
            type="button"
            onClick={() => setAskOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#080E1C] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-violet-400/45 hover:text-violet-200"
          >
            <MessageSquare className="h-3.5 w-3.5 text-violet-300" />
            Ask AI
          </button>
        </div>
      </div>

      {askOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runAction("ask");
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this notice (e.g. deadline, fee, batch)..."
            className="flex-1 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/50"
          />
          <button
            type="submit"
            disabled={isBusy || !question.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            aria-label="Ask"
          >
            {loadingMode === "ask" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {output && !collapsed && (
        <div className="mt-3 rounded-xl border border-slate-800/90 bg-[#060A12]/90 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
            <span className="text-xs font-semibold text-amber-300">{activeTitle}</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
            >
              Minimize <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">{renderFormattedLines(output)}</div>
        </div>
      )}

      {output && collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-2.5 text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          Show {activeTitle}
        </button>
      )}
    </div>
  );
}