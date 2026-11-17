"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronUp, Loader2, MessageSquare, Send, Sparkles, Target, Trash2, TrendingUp, X } from "lucide-react";

export interface AdvisorTerm {
  termKey: string;
  gpa: number;
  cgpa: number | null;
}

interface AcademicAiAdvisorProps {
  studentName: string;
  department?: string;
  storageKey: string;
  terms: AdvisorTerm[];
  retakes?: string[];
}

interface ChatItem {
  role: "user" | "assistant";
  text: string;
}

function renderFormattedLines(text: string) {
  const lines = text.split("\n").map((l) => l.trimEnd());
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={i} className="h-1.5" />;
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const clean = trimmed.replace(/^[-*•]\s+/, "");
    const parts = clean.split(/(\*\*[^*]+\*\*)/g);

    const rendered = parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-2 pl-0.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
          <p className="flex-1 text-xs leading-relaxed text-slate-300">{rendered}</p>
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

export function AcademicAiAdvisor({
  studentName,
  department,
  storageKey,
  terms,
  retakes = [],
}: AcademicAiAdvisorProps) {
  const [targetCgpa, setTargetCgpa] = useState("3.50");
  const [loadingMode, setLoadingMode] = useState<"analyze" | "target_plan" | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(`jtec_advisor_${storageKey}`);
      if (saved) setMessages(JSON.parse(saved) as ChatItem[]);
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`jtec_advisor_${storageKey}`, JSON.stringify(messages.slice(-24)));
    } catch {
      // ignore storage errors
    }
  }, [messages, mounted, storageKey]);

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, chatOpen, chatLoading]);

  const runMode = async (mode: "analyze" | "target_plan") => {
    setLoadingMode(mode);
    setError(null);
    setCollapsed(false);
    setActiveTitle(mode === "analyze" ? "Academic Progress Analysis" : `Target ${targetCgpa} CGPA Plan`);
    try {
      const res = await fetch("/api/academic/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          targetCgpa: parseFloat(targetCgpa) || 3.5,
          terms,
          retakes,
          studentName,
          department,
        }),
      });
      const data = (await res.json()) as { success?: boolean; reply?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to generate advice.");
      setOutput(data.reply || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate advice.");
    } finally {
      setLoadingMode(null);
    }
  };

  const streamAssistantReply = (fullText: string, baseMsgs: ChatItem[]) => {
    const words = fullText.split(/(\s+)/);
    let idx = 0;
    setStreamingText("");
    const timer = window.setInterval(() => {
      idx += 3;
      if (idx >= words.length) {
        window.clearInterval(timer);
        setStreamingText(null);
        setMessages([...baseMsgs, { role: "assistant", text: fullText }]);
      } else {
        setStreamingText(words.slice(0, idx).join(""));
      }
    }, 22);
  };

  const sendChat = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || chatLoading || streamingText !== null) return;
    setInput("");
    const nextMsgs: ChatItem[] = [...messages, { role: "user", text: q }];
    setMessages(nextMsgs);
    setChatLoading(true);
    try {
      const res = await fetch("/api/academic/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          targetCgpa: parseFloat(targetCgpa) || 3.5,
          question: q,
          history: messages,
          terms,
          retakes,
          studentName,
          department,
        }),
      });
      const data = (await res.json()) as { success?: boolean; reply?: string; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reply.");
      setChatLoading(false);
      streamAssistantReply(data.reply || "", nextMsgs);
    } catch (err) {
      setChatLoading(false);
      setMessages([
        ...nextMsgs,
        { role: "assistant", text: err instanceof Error ? err.message : "Could not get a response." },
      ]);
    }
  };

  const isBusy = loadingMode !== null;

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${
        isBusy
          ? "border-violet-400/60 bg-gradient-to-r from-[#0E162B] via-[#171235] to-[#0E1E32] shadow-[0_0_28px_rgba(139,92,246,0.22)]"
          : "border-violet-500/25 bg-gradient-to-r from-[#0B1120] via-[#0F172A] to-[#11152B]"
      }`}
    >
      {isBusy && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/10 to-transparent animate-pulse" />
      )}

      <div className="relative flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 ${
              isBusy
                ? "border-violet-400/60 bg-violet-500/25 text-violet-200 scale-105"
                : "border-violet-500/35 bg-violet-500/15 text-violet-300"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${isBusy ? "animate-spin" : ""}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-100">AI Academic & CGPA Advisor</h2>
            <p className="text-xs text-slate-400">
              {isBusy
                ? "Analyzing your credit-weighted GPA & academic standing..."
                : terms.length > 0
                  ? `Personalized insights from ${terms.length} published term${terms.length > 1 ? "s" : ""}`
                  : "Get personalized CGPA planning & retake advice"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="flex items-center justify-between gap-1.5 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-1.5">
            <span className="text-[11px] font-medium text-slate-400">Target</span>
            <input
              type="number"
              step="0.05"
              min="2.00"
              max="4.00"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
              className="w-12 bg-transparent text-right text-xs font-bold text-cyan-300 outline-none"
              aria-label="Target CGPA"
            />
          </div>

          <button
            type="button"
            onClick={() => runMode("analyze")}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 active:scale-[0.98] disabled:opacity-50"
          >
            {loadingMode === "analyze" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            <span>Analyze</span>
          </button>

          <button
            type="button"
            onClick={() => runMode("target_plan")}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/30 active:scale-[0.98] disabled:opacity-50"
          >
            {loadingMode === "target_plan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
            <span>Target Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E172A] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-violet-500/40 hover:text-violet-200 active:scale-[0.98]"
          >
            <MessageSquare className="h-3.5 w-3.5 text-violet-300" />
            <span>Ask Advisor</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="relative mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {output && !collapsed && (
        <div className="relative mt-3.5 rounded-xl border border-slate-800/90 bg-[#060A12]/90 p-3.5 sm:p-4 transition-all">
          <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              {activeTitle}
            </span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-400 transition hover:text-slate-200"
            >
              Minimize <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {renderFormattedLines(output)}
          </div>
        </div>
      )}

      {output && collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="relative mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:text-violet-200"
        >
          <Sparkles className="h-3 w-3" /> Show {activeTitle}
        </button>
      )}

      {mounted &&
        chatOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="flex h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-800 bg-[#0B1120] shadow-2xl sm:h-[min(580px,88dvh)] sm:max-w-lg sm:rounded-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-bold text-slate-100">AI Academic Advisor</span>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMessages([])}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                      aria-label="Clear chat"
                      title="Clear chat"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && streamingText === null && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-400">
                      Ask about your CGPA targeting mechanism, credit impact, or retake strategy:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "How does CGPA targeting & Quality Points work?",
                        "How can I reach 3.50 CGPA?",
                        "Should I clear retakes first?",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => sendChat(chip)}
                          className="rounded-lg border border-slate-700/80 bg-[#0E172A] px-2.5 py-1.5 text-left text-[11px] text-slate-300 transition hover:border-violet-500/40 hover:text-violet-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "border border-violet-500/40 bg-violet-600/30 text-slate-100"
                          : "border border-slate-800 bg-[#0E172A] text-slate-200 space-y-1"
                      }`}
                    >
                      {m.role === "assistant" ? renderFormattedLines(m.text) : m.text}
                    </div>
                  </div>
                ))}

                {streamingText !== null && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] space-y-1 rounded-2xl border border-slate-800 bg-[#0E172A] px-3.5 py-2.5 text-xs leading-relaxed text-slate-200">
                      {renderFormattedLines(streamingText)}
                    </div>
                  </div>
                )}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-[#0E172A] px-3.5 py-2.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.2s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.1s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChat();
                }}
                className="flex items-center gap-2 border-t border-slate-800 p-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask in English or Bangla..."
                  className="flex-1 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-2 text-base sm:text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || streamingText !== null || !input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-50"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}