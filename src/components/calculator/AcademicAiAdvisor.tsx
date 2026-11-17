"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronUp,
  Copy,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Pencil,
  Send,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

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

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
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

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const [voiceLang, setVoiceLang] = useState<"bn-BD" | "en-US">("bn-BD");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const w = window as unknown as WindowWithSpeech;
    if (w.SpeechRecognition || w.webkitSpeechRecognition) {
      setSpeechSupported(true);
    }
    try {
      const saved = localStorage.getItem(`jtec_advisor_${storageKey}`);
      if (saved) setMessages(JSON.parse(saved) as ChatItem[]);
    } catch {
      // ignore storage errors
    }
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
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

  const sendChatWithHistory = async (q: string, historyBefore: ChatItem[]) => {
    const nextMsgs: ChatItem[] = [...historyBefore, { role: "user", text: q }];
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
          history: historyBefore,
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

  const sendChat = async (questionText?: string) => {
    const q = (questionText ?? input).trim();
    if (!q || chatLoading || streamingText !== null) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }
    setInput("");
    setEditingIdx(null);
    await sendChatWithHistory(q, messages);
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((prev) => (prev === idx ? null : prev)), 1500);
    } catch {
      // ignore clipboard error
    }
  };

  const handleSaveEdit = async (idx: number) => {
    const updated = editDraft.trim();
    if (!updated || chatLoading || streamingText !== null) return;
    setEditingIdx(null);
    setEditDraft("");
    const historyBefore = messages.slice(0, idx);
    await sendChatWithHistory(updated, historyBefore);
  };

  const toggleVoiceInput = () => {
    const w = window as unknown as WindowWithSpeech;
    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = voiceLang;
    rec.interimResults = true;
    rec.continuous = false;
    const baseInput = input.trim();

    rec.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }
      setInput(baseInput ? `${baseInput} ${transcript.trim()}` : transcript.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const toggleSpeak = (text: string, idx: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ""));
    utter.lang = /[\u0980-\u09FF]/.test(text) ? "bn-BD" : "en-US";
    utter.rate = 1.02;
    utter.onend = () => setSpeakingIdx(null);
    utter.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utter);
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4">
            <div className="relative flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-violet-500/30 bg-[#080E1C]/95 shadow-[0_0_50px_rgba(139,92,246,0.22)] sm:h-[min(620px,88dvh)] sm:max-w-xl sm:rounded-3xl">
              <div className="pointer-events-none h-0.5 w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500" />

              <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0B1222]/90 px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-violet-500/40 bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-violet-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">AI Academic Advisor</h3>
                    <p className="text-[11px] text-slate-400">Credit-weighted CGPA & Retake Guide</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setEditingIdx(null);
                      }}
                      className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-rose-300"
                      aria-label="Clear chat"
                      title="Clear chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatOpen(false)}
                    className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                {messages.length === 0 && streamingText === null && (
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0D1528]/80 p-4 space-y-3">
                    <p className="text-xs leading-relaxed text-slate-300">
                      Ask about your CGPA targeting mechanism, credit impact, or 3.00-capped retake strategy in Bangla or English:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "How does CGPA targeting & Quality Points work?",
                        "Retake clear korle amar CGPA kemon hobe?",
                        "How can I reach 3.50 CGPA?",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => sendChat(chip)}
                          className="rounded-xl border border-slate-700/80 bg-[#080E1C] px-3 py-1.5 text-left text-[11px] font-medium text-slate-300 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-200"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, idx) => (
                  <div key={idx} className={`group flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    {m.role === "user" && editingIdx === idx ? (
                      <div className="w-full max-w-[90%] rounded-2xl border border-violet-500/50 bg-[#121A33] p-2.5 space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={2}
                          className="w-full resize-none rounded-xl border border-slate-700/80 bg-[#080E1C] p-2 text-xs text-slate-100 outline-none focus:border-violet-400"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingIdx(null)}
                            className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(idx)}
                            className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-500"
                          >
                            Save & Resend
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                          m.role === "user"
                            ? "border border-violet-500/40 bg-gradient-to-br from-violet-600/35 to-indigo-600/25 text-slate-100"
                            : "border border-slate-800/90 bg-[#0E172A]/95 text-slate-200 space-y-1"
                        }`}
                      >
                        {m.role === "assistant" ? renderFormattedLines(m.text) : m.text}
                      </div>
                    )}

                    {editingIdx !== idx && (
                      <div className="flex items-center gap-1 px-1 opacity-80 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleCopy(m.text, idx)}
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                        >
                          {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedIdx === idx ? "Copied" : "Copy"}
                        </button>
                        {m.role === "user" && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditDraft(m.text);
                            }}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-violet-300"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                        )}
                        {m.role === "assistant" && (
                          <button
                            type="button"
                            onClick={() => toggleSpeak(m.text, idx)}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-slate-400 transition hover:bg-slate-800 hover:text-cyan-300"
                          >
                            {speakingIdx === idx ? <VolumeX className="h-3 w-3 text-cyan-400" /> : <Volume2 className="h-3 w-3" />}
                            {speakingIdx === idx ? "Stop" : "Listen"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {streamingText !== null && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] space-y-1 rounded-2xl border border-slate-800/90 bg-[#0E172A]/95 px-3.5 py-2.5 text-xs leading-relaxed text-slate-200">
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
                className="flex items-center gap-2 border-t border-slate-800/80 bg-[#0B1222]/90 p-3"
              >
                {speechSupported && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoiceLang((l) => (l === "bn-BD" ? "en-US" : "bn-BD"))}
                      className="rounded-lg border border-slate-700/80 bg-[#060A12] px-1.5 py-1.5 text-[10px] font-bold text-cyan-300 hover:border-cyan-500/40"
                      title="Switch Voice Language"
                    >
                      {voiceLang === "bn-BD" ? "BN" : "EN"}
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoiceInput}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                        listening
                          ? "animate-pulse border-rose-500/60 bg-rose-500/20 text-rose-300"
                          : "border-slate-700/80 bg-[#060A12] text-slate-300 hover:border-violet-500/40 hover:text-violet-300"
                      }`}
                      aria-label={listening ? "Stop voice input" : "Start voice input"}
                      title={listening ? "Listening..." : "Voice input"}
                    >
                      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={listening ? "Listening... speak now" : "Ask in English or Bangla..."}
                  className="flex-1 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-2 text-base sm:text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-500/50"
                />
                <button
                  type="submit"
                  disabled={chatLoading || streamingText !== null || !input.trim()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md transition hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
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