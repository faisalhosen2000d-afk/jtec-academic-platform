"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageSquare, Send, Sparkles, Target, TrendingUp, X, ChevronUp } from "lucide-react";

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
  }, [messages, chatOpen, chatLoading]);

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

  const sendChat = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || chatLoading) return;
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
      setMessages([...nextMsgs, { role: "assistant", text: data.reply || "" }]);
    } catch (err) {
      setMessages([
        ...nextMsgs,
        { role: "assistant", text: err instanceof Error ? err.message : "Could not get a response." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-[#0B1120] via-[#0F172A] to-[#11152B] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/35 bg-violet-500/15 text-violet-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">AI Academic & CGPA Advisor</h2>
            <p className="text-xs text-slate-400">
              {terms.length > 0
                ? `Personalized insights from ${terms.length} published term${terms.length > 1 ? "s" : ""}`
                : "Get personalized CGPA planning & retake advice"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#060A12] px-2.5 py-1.5">
            <span className="text-[11px] font-medium text-slate-400">Target</span>
            <input
              type="number"
              step="0.05"
              min="2.00"
              max="4.00"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(e.target.value)}
              className="w-14 bg-transparent text-xs font-bold text-cyan-300 outline-none"
              aria-label="Target CGPA"
            />
          </div>

          <button
            type="button"
            onClick={() => runMode("analyze")}
            disabled={loadingMode !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
          >
            {loadingMode === "analyze" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
            Analyze Progress
          </button>

          <button
            type="button"
            onClick={() => runMode("target_plan")}
            disabled={loadingMode !== null}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/30 disabled:opacity-50"
          >
            {loadingMode === "target_plan" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
            Target Plan
          </button>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#0E172A] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-violet-500/40 hover:text-violet-200"
          >
            <MessageSquare className="h-3.5 w-3.5 text-violet-300" />
            Ask Advisor
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {output && !collapsed && (
        <div className="mt-3 rounded-xl border border-slate-800/90 bg-[#060A12]/90 p-3.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-violet-300">{activeTitle}</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
            >
              Minimize <ChevronUp className="h-3 w-3" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
            {output}
          </div>
        </div>
      )}

      {output && collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mt-2.5 text-xs font-semibold text-violet-300 hover:text-violet-200"
        >
          Show {activeTitle}
        </button>
      )}

      {mounted &&
        chatOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex h-[min(560px,88dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-bold text-slate-100">AI Academic Advisor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Ask anything about your GPA trend, target CGPA, or retakes:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "How can I reach 3.50 CGPA?",
                        "Should I clear retakes first?",
                        "Summarize my GPA trend simply",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => sendChat(chip)}
                          className="rounded-lg border border-slate-700/80 bg-[#0E172A] px-2.5 py-1 text-[11px] text-slate-300 hover:border-violet-500/40 hover:text-violet-200"
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
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-violet-600/30 text-slate-100 border border-violet-500/40"
                          : "bg-[#0E172A] text-slate-200 border border-slate-800"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-[#0E172A] px-3.5 py-2.5 text-xs text-violet-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
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
                  placeholder="Ask about your CGPA or retakes..."
                  className="flex-1 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !input.trim()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-50"
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