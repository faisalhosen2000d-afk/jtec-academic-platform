import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { callGemini } from "@/lib/gemini";

export const maxDuration = 60;

export interface TextileBriefItem {
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

interface RawRssItem {
  title: string;
  url: string;
  source: string;
  pubDate: string;
  hintRegion: "bangladesh" | "global";
}

function decodeXml(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssXml(xml: string, fallbackSource: string, hintRegion: "bangladesh" | "global"): RawRssItem[] {
  const items: RawRssItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of itemMatches.slice(0, 10)) {
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
    const linkRaw = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "";
    const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || fallbackSource;
    const pubRaw = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "";
    const title = decodeXml(titleRaw);
    const url = decodeXml(linkRaw);
    if (title && url.startsWith("http")) {
      items.push({
        title,
        url,
        source: decodeXml(sourceRaw) || fallbackSource,
        pubDate: decodeXml(pubRaw),
        hintRegion,
      });
    }
  }
  return items;
}

async function fetchLiveTextileHeadlines(): Promise<RawRssItem[]> {
  const feeds: Array<{ url: string; source: string; hintRegion: "bangladesh" | "global" }> = [
    {
      url: "https://news.google.com/rss/search?q=(Bangladesh+RMG+OR+Bangladesh+textile+OR+%22garment+factory%22+Bangladesh+OR+BGMEA+OR+BKMEA+OR+BTMA)+when:7d&hl=en-US&gl=BD&ceid=BD:en",
      source: "Bangladesh RMG News",
      hintRegion: "bangladesh",
    },
    {
      url: "https://www.textiletoday.com.bd/feed/",
      source: "Textile Today",
      hintRegion: "bangladesh",
    },
    {
      url: "https://news.google.com/rss/search?q=(%22textile+innovation%22+OR+%22smart+textile%22+OR+%22sustainable+textile%22+OR+%22textile+technology%22+OR+%22apparel+industry%22)+when:7d&hl=en-US&gl=US&ceid=US:en",
      source: "Global Textile Tech",
      hintRegion: "global",
    },
  ];

  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      const res = await fetch(f.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JTECPlatform/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssXml(xml, f.source, f.hintRegion);
    })
  );

  const bdItems: RawRssItem[] = [];
  const globalItems: RawRssItem[] = [];
  const seenUrls = new Set<string>();

  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          if (item.hintRegion === "bangladesh") bdItems.push(item);
          else globalItems.push(item);
        }
      }
    }
  }
  const sortNewest = (arr: RawRssItem[]) =>
    arr.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
  return [...sortNewest(bdItems).slice(0, 9), ...sortNewest(globalItems).slice(0, 9)];
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const serviceSupabase = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const todayDhaka = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const loadMore = searchParams.get("more") === "1";
    const requestedDate = searchParams.get("date");
    const targetDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayDhaka;

    let items: TextileBriefItem[] = [];

    if (!forceRefresh) {
      const { data: existing } = await serviceSupabase
        .from("textile_briefs")
        .select("items")
        .eq("brief_date", targetDate)
        .maybeSingle();

      const existingRow = existing as { items?: TextileBriefItem[] } | null;
      if (existingRow?.items && existingRow.items.length > 0 && existingRow.items[0]?.region) {
        items = existingRow.items;
      }
    }

    if ((items.length === 0 || loadMore) && targetDate === todayDhaka) {
      const existingUrls = new Set(items.map((it) => it.url));
      const allNew = (await fetchLiveTextileHeadlines()).filter((h) => !existingUrls.has(h.url));
      const rawHeadlines = [
        ...allNew.filter((h) => h.hintRegion === "bangladesh").slice(0, 10),
        ...allNew.filter((h) => h.hintRegion === "global").slice(0, 10),
      ];
      if (rawHeadlines.length > 0) {
        const headlineList = rawHeadlines
          .map((h, i) => `[${i}] (${h.hintRegion}) Title: ${h.title} | Source: ${h.source} | Date: ${h.pubDate}`)
          .join("\n");

        const rawJson = await callGemini(
          [
            {
              text: `You are the Textile Industry Editor for JTEC (Jhenaidah Textile Engineering College).
Below are live RSS headlines from Bangladesh and Global sources. Filter STRICTLY for Textile, Apparel, RMG, BGMEA/BKMEA, Fiber, Spinning, Weaving, Dyeing/Finishing, Sustainability, or Textile Tech news (ignore unrelated general/political/sports news).
Select up to 4 top stories for "bangladesh" and up to 4 top stories for "global", and translate/summarize them into natural, clean Bengali (বাংলা).

Headlines:
${headlineList}

Return strictly valid JSON object with key "items" (array of 4-8 objects):
- "index": integer matching [i] above
- "region": strictly "bangladesh" or "global"
- "category": strictly one of "Bangladesh RMG", "Innovation & Tech", "Sustainability", "Fiber & Market"
- "title_bn": clear Bengali headline (max 95 chars; STRICTLY NEVER fuse Bengali and English letters inside the same word; always keep Bengali and English words separated by a space)
- "summary_bn": concise 2-sentence Bengali summary (max 220 chars)
- "student_takeaway_bn": 1 short sentence in Bengali explaining why this matters for textile engineering students (max 140 chars)`,
            },
          ],
          { jsonMode: true, timeoutMs: 30000 }
        );

        const parsed = JSON.parse(rawJson) as {
          items?: Array<{
            index: number;
            region: "bangladesh" | "global";
            category: TextileBriefItem["category"];
            title_bn: string;
            summary_bn: string;
            student_takeaway_bn: string;
          }>;
        };

        const baseIdx = items.length;
        const newItems = (parsed.items || [])
          .filter((p) => rawHeadlines[p.index])
          .slice(0, 8)
          .map((p, idx) => {
            const src = rawHeadlines[p.index]!;
            return {
              id: `${todayDhaka}-${baseIdx + idx}`,
              region: p.region === "bangladesh" || p.region === "global" ? p.region : src.hintRegion,
              category: p.category || "Innovation & Tech",
              title_bn: p.title_bn,
              summary_bn: p.summary_bn,
              student_takeaway_bn: p.student_takeaway_bn,
              source: src.source,
              url: src.url,
              published_at: src.pubDate || todayDhaka,
            };
          });

        if (newItems.length > 0) {
          items = loadMore ? [...items, ...newItems] : newItems;
        }

        if (items.length > 0) {
          await serviceSupabase
            .from("textile_briefs")
            .upsert({ brief_date: todayDhaka, items } as never, { onConflict: "brief_date" });

          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
          await serviceSupabase.from("textile_briefs").delete().lt("brief_date", cutoff);
        }
      }
    }

    if (items.length > 0) {
      const todayUtcStart = `${todayDhaka}T00:00:00+06:00`;
      const { count: alreadyNotified } = await serviceSupabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("type", "textile_pulse")
        .gte("created_at", todayUtcStart);

      if ((alreadyNotified ?? 0) === 0) {
        try {
          await serviceSupabase.from("notifications").insert({
            recipient_id: user.id,
            type: "textile_pulse",
            title: "\u0986\u099C\u0995\u09C7\u09B0 \u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u09A8\u09BF\u0989\u099C \u0993 \u0987\u09A8\u09CB\u09AD\u09C7\u09B6\u09A8 \u09AC\u09CD\u09B0\u09BF\u09AB",
            body: items[0]?.title_bn || "\u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u0993 \u09AC\u09BF\u09B6\u09CD\u09AC\u09C7\u09B0 \u09A8\u09A4\u09C1\u09A8 \u099F\u09C7\u0995\u09CD\u09B8\u099F\u09BE\u0987\u09B2 \u0986\u09AA\u09A1\u09C7\u099F \u09A6\u09C7\u0996\u09C1\u09A8\u0964",
            link_url: items[0]?.id ? `/textile-pulse?highlight=${encodeURIComponent(items[0].id)}&date=${encodeURIComponent(todayDhaka)}` : "/textile-pulse?highlight=latest",
            is_read: false,
          } as never);
        } catch {
          // ignore notification error
        }
      }
    }

    items.sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0));

    const { data: dateRows } = await serviceSupabase
      .from("textile_briefs")
      .select("brief_date")
      .order("brief_date", { ascending: false })
      .limit(15);

    const availableDates = ((dateRows || []) as Array<{ brief_date: string }>).map((d) => d.brief_date);

    return NextResponse.json({ success: true, briefDate: targetDate, todayDate: todayDhaka, availableDates, items });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load Textile Pulse." },
      { status: 500 }
    );
  }
}