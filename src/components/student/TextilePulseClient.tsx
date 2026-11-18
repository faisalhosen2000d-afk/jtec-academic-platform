"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Globe, Loader2, Newspaper, RefreshCw, Sparkles } from "lucide-react";

interface TextileBriefItem {
  id: string;
  category: "Bangladesh RMG" | "Innovation & Tech" | "Sustainability" | "Fiber & Market";
  title_bn: string;
  summary_bn: string;
  student_takeaway_bn: string;
  source: string;
  url: string;
  published_at: string;
}

const CATEGORIES = [
  "All",
  "Bangladesh RMG",
  "Innovation & Tech",
  "Sustainability",
  "Fiber & Market",
] as const;

export function TextilePulseClient() {
  const [items, setItems] = useState<TextileBriefItem[]>([]);
  const [briefDate, setBriefDate] = useState<string>("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrief = async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/textile-pulse${refresh ? "?refresh=true" : ""}`);
      const data = (await res.json()) as {
        success?: boolean;
        briefDate?: string;
        items?: TextileBriefItem[];
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load Textile Pulse.");
      setItems(data.items || []);
      setBriefDate(data.briefDate || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Textile Pulse.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBrief(false);
  }, []);

  const filtered = category === "All" ? items : items.filter((i) => i.category === category);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#091822] via-[#0B1222] to-[#0E1326] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
              <Newspaper className="h-3.5 w-3.5" />
              Daily AI Textile Pulse
            </span>
            <h1 className="mt-2.5 font-serif text-2xl font-bold text-white sm:text-3xl">
              {"\u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u0987\u09A8\u09CB\u09AD\u09C7\u09B6\u09A8 \u0993 \u0987\u09A8\u09CD\u09A1\u09BE\u09B8\u09CD\u099F\u09CD\u09B0\u09BF \u09AC\u09CD\u09B0\u09BF\u09AB"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {briefDate ? `Updated for ${briefDate} · ` : ""}
              Bangladesh RMG & Global Textile Tech Updates in Bengali
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadBrief(true)}
            disabled={loading || refreshing}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Today
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                category === c
                  ? "border border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                  : "border border-slate-800 bg-[#060A12] text-slate-400 hover:text-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-[#0A1020] py-14 text-xs text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span>Fetching & translating today&apos;s textile news into Bengali...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0A1020] py-12 text-center text-xs text-slate-400">
          No textile stories found in this category today.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0A1020] p-5 transition hover:border-cyan-500/40"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-violet-500/35 bg-violet-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-violet-200">
                    {item.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Globe className="h-3 w-3" /> {item.source}
                  </span>
                </div>

                <h2 className="text-base font-bold leading-snug text-white">{item.title_bn}</h2>
                <p className="text-xs leading-relaxed text-slate-300">{item.summary_bn}</p>

                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-cyan-200">
                  <span className="inline-flex items-center gap-1 font-semibold text-cyan-300">
                    <Sparkles className="h-3 w-3" /> {"\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09A6\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF:"}
                  </span>{" "}
                  {item.student_takeaway_bn}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3">
                <span className="text-[11px] text-slate-500">{item.published_at.slice(0, 16)}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Read Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}