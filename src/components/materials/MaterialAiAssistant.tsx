"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, BookOpen, Languages, HelpCircle, Send, ChevronDown, Trash2, MessageSquare, X } from "lucide-react";

type PracticeQuestion = {
  q: string;
  hint: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type MaterialAiAssistantProps = {
  materialId: string;
  initialSummaryEn: string | null;
  initialSummaryBn: string | null;
  initialQuestions: PracticeQuestion[] | null;
};

const QUICK_PROMPTS = [
  "Explain simply",
  "Important formulas?",
  "Key exam tips?",
];

const MAX_SAVED_MESSAGES = 30;

function cleanMathAndLatex(text: string): string {
  let out = text
    .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\%/g, "%")
    .replace(/\\text\{--\}/g, "\u2013")
    .replace(/\\text/g, "")
    .replace(/\{--\}/g, "\u2013")
    .replace(/(\d)\s*--\s*(\d)/g, "$1\u2013$2")
    .replace(/\\approx/g, "\u2248")
    .replace(/\\times/g, "\u00D7")
    .replace(/\\cdot/g, "\u00B7")
    .replace(/\\mu/g, "\u03BC")
    .replace(/\\pm/g, "\u00B1")
    .replace(/\\leq/g, "\u2264")
    .replace(/\\geq/g, "\u2265")
    .replace(/\\div/g, "\u00F7")
    .replace(/\\ /g, " ")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}");

  out = out
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)")
    .replace(/(?:^|[^a-zA-Z])frac\{([^}]+)\}\{([^}]+)\}/g, " ($1) / ($2)")
    .replace(/\{([^{}]+)\}/g, "$1")
    .replace(/\\([a-zA-Z]+)/g, "$1");

  return out;
}

function renderTextWithSubSup(segment: string, keyPrefix: string) {
  const tokens = segment.split(/(_\{[^}]+\}|_[A-Za-z0-9]+|\^\{[^}]+\}|\^[A-Za-z0-9+-]+)/g);
  return tokens.map((tok, idx) => {
    if (tok.startsWith("_{") && tok.endsWith("}")) {
      return (
        <sub key={`${keyPrefix}-${idx}`} className="text-[0.72em] text-cyan-200/90">
          {tok.slice(2, -1)}
        </sub>
      );
    }
    if (tok.startsWith("_") && tok.length > 1) {
      return (
        <sub key={`${keyPrefix}-${idx}`} className="text-[0.72em] text-cyan-200/90">
          {tok.slice(1)}
        </sub>
      );
    }
    if (tok.startsWith("^{") && tok.endsWith("}")) {
      return (
        <sup key={`${keyPrefix}-${idx}`} className="text-[0.72em] text-cyan-200/90">
          {tok.slice(2, -1)}
        </sup>
      );
    }
    if (tok.startsWith("^") && tok.length > 1) {
      return (
        <sup key={`${keyPrefix}-${idx}`} className="text-[0.72em] text-cyan-200/90">
          {tok.slice(1)}
        </sup>
      );
    }
    return <span key={`${keyPrefix}-${idx}`}>{tok}</span>;
  });
}

function renderInlineFormatting(line: string) {
  const cleaned = cleanMathAndLatex(line);
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {renderTextWithSubSup(part.slice(2, -2), `b-${i}`)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-cyan-200/90">
          {renderTextWithSubSup(part.slice(1, -1), `i-${i}`)}
        </em>
      );
    }
    return <span key={i}>{renderTextWithSubSup(part, `t-${i}`)}</span>;
  });
}

function FormattedAiContent({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-200">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (/^---+$/.test(line)) {
          return <hr key={idx} className="my-2 border-slate-800/90" />;
        }

        if (line.startsWith("#### ")) {
          return (
            <h5 key={idx} className="pt-2 text-xs sm:text-sm font-bold text-cyan-300">
              {renderInlineFormatting(line.slice(5))}
            </h5>
          );
        }

        if (line.startsWith("### ") || line.startsWith("## ")) {
          const text = line.replace(/^#{2,3}\s+/, "");
          return (
            <h4 key={idx} className="pt-2 text-sm sm:text-base font-bold text-emerald-300">
              {renderInlineFormatting(text)}
            </h4>
          );
        }

        const bulletMatch = rawLine.match(/^(\s*)(\*|-|\d+\.)\s+(.*)$/);
        if (bulletMatch) {
          const indent = (bulletMatch[1] ?? "").length >= 2;
          const marker = bulletMatch[2] === "*" || bulletMatch[2] === "-" ? "\u2022" : bulletMatch[2];
          return (
            <div key={idx} className={`flex items-start gap-2 ${indent ? "pl-4" : ""}`}>
              <span className="mt-0.5 shrink-0 font-bold text-cyan-400">{marker}</span>
              <span className="flex-1">{renderInlineFormatting(bulletMatch[3] ?? "")}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

export default function MaterialAiAssistant({
  materialId,
  initialSummaryEn,
  initialSummaryBn,
  initialQuestions,
}: MaterialAiAssistantProps) {
  const [activeTab, setActiveTab] = useState<"summary_en" | "summary_bn" | "questions" | null>(null);
  const [summaryEn, setSummaryEn] = useState<string | null>(initialSummaryEn);
  const [summaryBn, setSummaryBn] = useState<string | null>(initialSummaryBn);
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(initialQuestions);
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});
  const [loadingTab, setLoadingTab] = useState<"summary_en" | "summary_bn" | "questions" | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `jtec_ai_chat_${materialId}`;

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(
            parsed
              .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
              .slice(-MAX_SAVED_MESSAGES)
              .map((m) => ({ ...m, isStreaming: false }))
          );
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return () => {
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const toSave = messages
        .filter((m) => m.content.trim().length > 0 && !m.isStreaming)
        .slice(-MAX_SAVED_MESSAGES)
        .map(({ id, role, content }) => ({ id, role, content }));
      if (toSave.length > 0) {
        window.localStorage.setItem(storageKey, JSON.stringify(toSave));
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [messages, mounted, storageKey]);

  useEffect(() => {
    if (!chatOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChatOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  function streamAssistantReply(msgId: string, fullText: string) {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);
    const words = fullText.split(/(\s+)/);
    let cursor = 0;
    const step = words.length > 120 ? 5 : 3;

    streamTimerRef.current = setInterval(() => {
      cursor = Math.min(words.length, cursor + step);
      const partial = words.slice(0, cursor).join("");
      const done = cursor >= words.length;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId ? { ...m, content: partial, isStreaming: !done } : m
        )
      );

      if (done && streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }, 22);
  }

  async function handleSelectTab(mode: "summary_en" | "summary_bn" | "questions") {
    if (activeTab === mode) {
      setActiveTab(null);
      return;
    }
    setError(null);
    setActiveTab(mode);

    if (mode === "summary_en" && summaryEn) return;
    if (mode === "summary_bn" && summaryBn) return;
    if (mode === "questions" && questions && questions.length > 0) return;

    setLoadingTab(mode);
    try {
      const res = await fetch("/api/materials/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, mode }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Could not generate AI study notes.");
      }
      if (mode === "summary_en") setSummaryEn(data.content);
      if (mode === "summary_bn") setSummaryBn(data.content);
      if (mode === "questions") setQuestions(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setLoadingTab(null);
    }
  }

  async function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || asking) return;

    setError(null);
    setAsking(true);
    setQuestionInput("");

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmed },
      { id: aiMsgId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const res = await fetch("/api/materials/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, mode: "ask", question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Could not get an answer.");
      }
      streamAssistantReply(aiMsgId, String(data.answer || ""));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
      setError(err instanceof Error ? err.message : "AI request failed.");
    } finally {
      setAsking(false);
    }
  }

  function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    void submitQuestion(questionInput);
  }

  function handleClearChat() {
    setMessages([]);
    setError(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage errors
    }
  }

  const chatModal =
    mounted && chatOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-sm animate-[dashFadeUp_0.2s_ease-out]"
            onClick={() => setChatOpen(false)}
          >
            <div
              className="flex h-[86dvh] max-h-[680px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-violet-500/35 bg-[#0A1020] shadow-[0_24px_70px_rgba(0,0,0,0.85)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800/90 bg-[#060A12] px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-violet-200">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Study Chat</h3>
                    <p className="text-[11px] text-slate-400">
                      Ask questions in Bangla or English &middot; Saved locally
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0E172A] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-rose-500/35 hover:text-rose-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-[#0E172A] text-slate-400 transition hover:border-slate-700 hover:text-white"
                    aria-label="Close AI chat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center px-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/35 bg-violet-500/15 text-violet-300">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-100">
                      Ask anything about this material
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-slate-400">
                      Your conversation is saved automatically in your browser so you can review it anytime without slowing down the page.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) =>
                    msg.role === "user" ? (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-violet-500/30 bg-violet-500/15 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div key={msg.id} className="flex items-start gap-2.5">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-violet-300 ${
                            msg.isStreaming && !msg.content ? "animate-pulse" : ""
                          }`}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-slate-800/90 bg-[#0E172A] p-3.5">
                          {!msg.content ? (
                            <div className="flex items-center gap-1.5 py-1">
                              <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
                              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
                            </div>
                          ) : (
                            <>
                              <FormattedAiContent content={msg.content} />
                              {msg.isStreaming && (
                                <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-violet-400 align-middle" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  )
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Modal Footer: Quick Chips + Input */}
              <div className="border-t border-slate-800/90 bg-[#060A12] p-3.5 sm:p-4">
                {error && (
                  <p className="mb-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300" role="alert">
                    {error}
                  </p>
                )}

                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={asking}
                      onClick={() => void submitQuestion(prompt)}
                      className="rounded-full border border-slate-800 bg-[#0A1020] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-violet-500/40 hover:text-violet-200 disabled:opacity-50"
                    >
                      + {prompt}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleAsk} className="flex gap-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Ask AI anything (Bangla or English)..."
                    maxLength={600}
                    className="flex-1 rounded-xl border border-slate-800 bg-[#0A1020] px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-violet-400/60"
                  />
                  <button
                    type="submit"
                    disabled={asking || !questionInput.trim()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_16px_rgba(139,92,246,0.3)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{asking ? "Sending..." : "Send"}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-[#0E172A]/85 p-4 sm:p-5 transition-all duration-200 hover:border-violet-400/40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-400/35 bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-violet-200 shadow-[0_0_16px_rgba(139,92,246,0.25)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">AI Study Assistant</p>
            <p className="text-[11px] text-slate-400">Main topics, short definitions &amp; exam prep</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chat with AI</span>
          {messages.length > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleSelectTab("summary_en")}
          disabled={loadingTab !== null}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
            activeTab === "summary_en"
              ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.15)]"
              : "border-slate-700/80 bg-[#0A1020] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Key Summary (EN)
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab("summary_bn")}
          disabled={loadingTab !== null}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
            activeTab === "summary_bn"
              ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.15)]"
              : "border-slate-700/80 bg-[#0A1020] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200"
          }`}
        >
          <Languages className="h-3.5 w-3.5" />
          {"\u09B8\u09B9\u099C \u09AC\u09BE\u0982\u09B2\u09BE\u09DF"}
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab("questions")}
          disabled={loadingTab !== null}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
            activeTab === "questions"
              ? "border-violet-400/60 bg-violet-500/15 text-violet-200 shadow-[0_0_14px_rgba(139,92,246,0.15)]"
              : "border-slate-700/80 bg-[#0A1020] text-slate-300 hover:border-violet-500/40 hover:text-violet-200"
          }`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          5 Exam Questions
        </button>
      </div>

      {loadingTab && (
        <div className="mt-4 space-y-2.5 rounded-xl border border-violet-500/20 bg-[#0A1020] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 animate-spin text-violet-300" />
            <p className="text-xs font-medium text-violet-300">Analyzing material...</p>
          </div>
          <div className="h-2.5 w-3/4 rounded-full bg-slate-800/90 animate-pulse" />
          <div className="h-2.5 w-5/6 rounded-full bg-slate-800/80 animate-pulse" />
          <div className="h-2.5 w-2/3 rounded-full bg-slate-800/70 animate-pulse" />
        </div>
      )}

      {!loadingTab && activeTab === "summary_en" && summaryEn && (
        <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#0A1020] p-3.5 sm:p-4"><div className="mb-2 flex items-center justify-between border-b border-slate-800/80 pb-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">Key Summary (EN)</span><button type="button" onClick={() => setActiveTab(null)} className="text-[11px] font-medium text-slate-400 hover:text-white">Minimize ▲</button></div><div className="max-h-72 overflow-y-auto pr-1"><FormattedAiContent content={summaryEn} /></div></div>
      )}

      {!loadingTab && activeTab === "summary_bn" && summaryBn && (
        <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#0A1020] p-3.5 sm:p-4"><div className="mb-2 flex items-center justify-between border-b border-slate-800/80 pb-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Bangla Summary</span><button type="button" onClick={() => setActiveTab(null)} className="text-[11px] font-medium text-slate-400 hover:text-white">Minimize ▲</button></div><div className="max-h-72 overflow-y-auto pr-1"><FormattedAiContent content={summaryBn} /></div></div>
      )}

      {!loadingTab && activeTab === "questions" && questions && questions.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800/90 bg-[#0A1020] p-3.5"><div className="mb-2.5 flex items-center justify-between border-b border-slate-800/80 pb-2"><span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">5 Exam Questions</span><button type="button" onClick={() => setActiveTab(null)} className="text-[11px] font-medium text-slate-400 hover:text-white">Minimize ▲</button></div><div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {questions.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800/90 bg-[#0A1020] p-3.5">
              <p className="text-xs sm:text-sm font-medium text-slate-100">
                <span className="mr-1.5 font-bold text-violet-300">Q{idx + 1}.</span>
                {renderInlineFormatting(item.q)}
              </p>
              <button
                type="button"
                onClick={() => setOpenHints((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${openHints[idx] ? "rotate-180" : ""}`} />
                {openHints[idx] ? "Hide Answer Hint" : "Show Answer Hint"}
              </button>
              {openHints[idx] && (
                <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-slate-300">
                  <FormattedAiContent content={item.hint} />
                </div>
              )}
            </div>
          )) }
        </div>
      </div>
      )}

      {!chatOpen && error && (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300" role="alert">
          {error}
        </p>
      )}

      {chatModal}
    </div>
  );
}