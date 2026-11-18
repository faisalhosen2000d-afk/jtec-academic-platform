"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckCircle2,
  Globe,
  LifeBuoy,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

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

  const [voiceLang, setVoiceLang] = useState<"auto" | "bn" | "en">("auto");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    try {
      if (!sessionStorage.getItem("jtec_pulse_ping")) {
        sessionStorage.setItem("jtec_pulse_ping", "1");
        fetch("/api/textile-pulse").catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open && tab === "history") {
      loadHistory();
    }
  }, [open, tab]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioRef.current?.pause();
    };
  }, []);

  const stopRecordingAndTranscribe = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const toggleVoiceRecording = async () => {
    setError(null);
    if (recording) {
      stopRecordingAndTranscribe();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Microphone recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeCandidate = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mimeCandidate ? new MediaRecorder(stream, { mimeType: mimeCandidate }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 400) return;

        setTranscribing(true);
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const s = String(reader.result || "");
              resolve(s.includes(",") ? s.split(",")[1] || "" : s);
            };
            reader.onerror = () => reject(new Error("Failed to read audio."));
            reader.readAsDataURL(blob);
          });

          const res = await fetch("/api/academic/ai-advisor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "transcribe",
              audioBase64: base64,
              mimeType: blob.type || "audio/webm",
              voiceLang,
            }),
          });
          const data = (await res.json()) as { success?: boolean; text?: string; error?: string };
          if (!res.ok || !data.success) throw new Error(data.error || "Voice transcription failed.");
          if (data.text) {
            setMessage((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text || ""));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice transcription failed.");
        } finally {
          setTranscribing(false);
        }
      };

      setRecordSeconds(0);
      setRecording(true);
      recorder.start();
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => {
          if (s >= 29) {
            stopRecordingAndTranscribe();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone permission denied. Please allow mic access.");
    }
  };

  const toggleListenReply = async () => {
    if (!reply) return;
    setError(null);
    if (speaking) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeaking(false);
      return;
    }
    setTtsLoading(true);
    try {
      const res = await fetch("/api/academic/ai-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tts", text: reply }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      };
      if (!res.ok || !data.success || !data.audioBase64) throw new Error(data.error || "Voice playback failed.");
      const audio = new Audio(`data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeaking(false);
        audioRef.current = null;
      };
      setSpeaking(true);
      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice playback failed.");
    } finally {
      setTtsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || submitting || transcribing) return;
    setSubmitting(true);
    setError(null);
    setReply(null);
    audioRef.current?.pause();
    setSpeaking(false);
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
            className="flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0A1020] shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-bold text-slate-100">AI Help & Issue Report</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center rounded-lg border border-slate-700/80 bg-[#060A12] p-0.5">
                  <Globe className="ml-1 mr-0.5 h-3 w-3 text-slate-400" />
                  {(
                    [
                      { id: "auto", label: "Auto" },
                      { id: "bn", label: "\u09AC\u09BE\u0982\u09B2\u09BE" },
                      { id: "en", label: "EN" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVoiceLang(opt.id)}
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition ${
                        voiceLang === opt.id
                          ? "bg-gradient-to-r from-cyan-600 to-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
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
            </div>

            <div className="flex border-b border-slate-800/80 px-4 pt-2 gap-3">
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
                    Type or use the mic to describe your issue—AI Guard checks your data first and forwards it to Super Admin.
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
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        recording
                          ? "Recording... tap stop when done"
                          : transcribing
                            ? "Transcribing voice..."
                            : "Describe your problem in Bangla or English..."
                      }
                      className="w-full resize-none rounded-xl border border-slate-700/80 bg-[#060A12] p-3 pr-12 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500/50"
                    />
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      disabled={transcribing || submitting}
                      className={`absolute bottom-2.5 right-2.5 inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 transition ${
                        recording
                          ? "animate-pulse border-rose-500/70 bg-rose-500/20 text-rose-200"
                          : transcribing
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                            : "border-slate-700/80 bg-[#0A1020] text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300"
                      }`}
                      aria-label={recording ? "Stop recording" : "Voice input"}
                      title={recording ? "Tap to stop" : "Speak in Bangla or English"}
                    >
                      {transcribing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : recording ? (
                        <>
                          <Square className="h-3 w-3 fill-current" />
                          <span className="font-mono text-[10px] font-bold">{recordSeconds}s</span>
                        </>
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                      {error}
                    </p>
                  )}
                  {reply && (
                    <div className="space-y-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{reply}</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleListenReply}
                        disabled={ttsLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10.5px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                      >
                        {ttsLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : speaking ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        {speaking ? "Stop" : "Listen"}
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || transcribing || message.trim().length < 4}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {submitting ? "AI Guard Checking..." : "Check & Send to Super Admin"}
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