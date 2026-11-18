"use client";

import { useEffect, useRef, useState } from "react";
import { Noto_Sans_Bengali } from "next/font/google";
import {
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Newspaper,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

interface TextileBriefItem {
  id: string;
  region: "bangladesh" | "global";
  category: "Bangladesh RMG" | "Innovation & Tech" | "Sustainability" | "Fiber & Market";
  title_bn: string;
  summary_bn: string;
  student_takeaway_bn: string;
  source: string;
  url: string;
  published_at: string;
}

export function TextilePulseClient() {
  const [items, setItems] = useState<TextileBriefItem[]>([]);
  const [briefDate, setBriefDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [regionTab, setRegionTab] = useState<"all" | "bangladesh" | "global">("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateMenuRef = useRef<HTMLDivElement | null>(null);

  const loadBrief = async (refresh = false, dateStr?: string) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const qs = refresh ? "?refresh=true" : dateStr ? `?date=${encodeURIComponent(dateStr)}` : "";
      const res = await fetch(`/api/textile-pulse${qs}`);
      const data = (await res.json()) as {
        success?: boolean;
        briefDate?: string;
        availableDates?: string[];
        items?: TextileBriefItem[];
        error?: string;
      };
      if (!res.ok || !data.success) throw new Error(data.error || "Could not load Textile Pulse.");
      setItems(data.items || []);
      setBriefDate(data.briefDate || "");
      if (data.availableDates) setAvailableDates(data.availableDates);
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

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) {
        setDateMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const bdItems = items.filter((i) => i.region === "bangladesh");
  const globalItems = items.filter((i) => i.region === "global");

  const renderCard = (item: TextileBriefItem) => (
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

        <h3 className="text-base font-bold leading-relaxed text-white">{item.title_bn}</h3>
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
  );

  return (
    <div className={`${notoBengali.className} space-y-5`}>
      <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#091822] via-[#0B1222] to-[#0E1326] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400 px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-950">
              <Newspaper className="h-3.5 w-3.5" />
              Daily AI Textile Pulse
            </span>
            <h1 className="mt-2.5 text-2xl font-bold leading-snug tracking-normal text-white sm:text-3xl">
              {"\u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u0987\u09A8\u09CB\u09AD\u09C7\u09B6\u09A8 \u0993 \u0987\u09A8\u09CD\u09A1\u09BE\u09B8\u09CD\u099F\u09CD\u09B0\u09BF \u09AC\u09CD\u09B0\u09BF\u09AB"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {briefDate ? `Updated for ${briefDate} · ` : ""}
              Bangladesh RMG &amp; Global Textile Tech Updates in Bengali
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableDates.length > 0 && (
              <div ref={dateMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDateMenuOpen((o) => !o)}
                  disabled={loading || refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-[#060A12] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40"
                >
                  <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{availableDates[0] === briefDate ? `Latest (${briefDate})` : briefDate}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition ${dateMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {dateMenuOpen && (
                  <div className="absolute right-0 z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-slate-700/80 bg-[#0B1222] p-1 shadow-2xl">
                    {availableDates.map((d, idx) => {
                      const active = d === briefDate;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDateMenuOpen(false);
                            loadBrief(false, d);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                            active ? "bg-cyan-500/15 font-semibold text-cyan-200" : "text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <span>{idx === 0 ? `Latest (${d})` : d}</span>
                          {active && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

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
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: `All (${items.length})` },
              { id: "bangladesh", label: `\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 (${bdItems.length})` },
              { id: "global", label: `\u0986\u09A8\u09CD\u09A4\u09B0\u09CD\u099C\u09BE\u09A4\u09BF\u0995 (${globalItems.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setRegionTab(t.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                regionTab === t.id
                  ? "border border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                  : "border border-slate-800 bg-[#060A12] text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
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
          <span>Fetching &amp; translating Bangladesh &amp; Global textile news...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {(regionTab === "all" || regionTab === "bangladesh") && bdItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-emerald-300">
                  {"\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u0993 RMG \u0986\u09AA\u09A1\u09C7\u099F"}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{bdItems.map(renderCard)}</div>
            </section>
          )}

          {(regionTab === "all" || regionTab === "global") && globalItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-cyan-300">
                  {"\u09AC\u09BF\u09B6\u09CD\u09AC\u09C7\u09B0 \u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u0987\u09A8\u09CB\u09AD\u09C7\u09B6\u09A8 \u0993 \u09AA\u09CD\u09B0\u09AF\u09C1\u0995\u09CD\u09A4\u09BF"}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">{globalItems.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}