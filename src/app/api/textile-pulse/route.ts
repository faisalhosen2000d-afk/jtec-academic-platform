import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { callGemini } from "@/lib/gemini";

export const maxDuration = 60;

export interface TextileBriefItem {
  id: string;
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

function parseRssXml(xml: string, fallbackSource: string): RawRssItem[] {
  const items: RawRssItem[] = [];
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  for (const block of itemMatches.slice(0, 12)) {
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
      });
    }
  }
  return items;
}

async function fetchLiveTextileHeadlines(): Promise<RawRssItem[]> {
  const feeds = [
    {
      url: "https://news.google.com/rss/search?q=(textile+OR+RMG+OR+%22garment+industry%22+OR+%22textile+innovation%22+OR+%22apparel+export%22)+when:7d&hl=en-US&gl=US&ceid=US:en",
      source: "Global Textile News",
    },
    {
      url: "https://www.textiletoday.com.bd/feed/",
      source: "Textile Today",
    },
  ];

  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      const res = await fetch(f.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JTECPlatform/1.0)" },
        signal: AbortSignal.timeout(6500),
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssXml(xml, f.source);
    })
  );

  const merged: RawRssItem[] = [];
  const seenUrls = new Set<string>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          merged.push(item);
        }
      }
    }
  }
  return merged.slice(0, 14);
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

    let items: TextileBriefItem[] = [];

    if (!forceRefresh) {
      const { data: existing } = await serviceSupabase
        .from("textile_briefs")
        .select("items")
        .eq("brief_date", todayDhaka)
        .maybeSingle();

      const existingRow = existing as { items?: TextileBriefItem[] } | null;
      if (existingRow?.items && existingRow.items.length > 0) {
        items = existingRow.items;
      }
    }

    if (items.length === 0) {
      const rawHeadlines = await fetchLiveTextileHeadlines();
      if (rawHeadlines.length > 0) {
        const headlineList = rawHeadlines
          .map((h, i) => `[${i}] Title: ${h.title} | Source: ${h.source} | Date: ${h.pubDate}`)
          .join("\n");

        const rawJson = await callGemini(
          [
            {
              text: `You are the Textile Industry Editor for JTEC (Jhenaidah Textile Engineering College).
Below are live RSS headlines. Filter STRICTLY for Textile, Apparel, RMG, Fiber, Spinning, Weaving, Dyeing/Finishing, Sustainability, or Textile Tech innovations (ignore unrelated general/political/sports news).
Select the best 6 stories and translate/summarize them into natural, clean Bengali (বাংলা).

Headlines:
${headlineList}

Return strictly valid JSON object with key "items" (array of 4-6 objects):
- "index": integer matching [i] above
- "category": strictly one of "Bangladesh RMG", "Innovation & Tech", "Sustainability", "Fiber & Market"
- "title_bn": clear Bengali headline (max 95 chars; NEVER mix Bengali & English letters inside one word)
- "summary_bn": concise 2-sentence Bengali summary (max 220 chars)
- "student_takeaway_bn": 1 short sentence in Bengali explaining why this matters for textile engineering students (max 140 chars)`,
            },
          ],
          { jsonMode: true, timeoutMs: 20000 }
        );

        const parsed = JSON.parse(rawJson) as {
          items?: Array<{
            index: number;
            category: TextileBriefItem["category"];
            title_bn: string;
            summary_bn: string;
            student_takeaway_bn: string;
          }>;
        };

        items = (parsed.items || [])
          .filter((p) => rawHeadlines[p.index])
          .slice(0, 7)
          .map((p, idx) => {
            const src = rawHeadlines[p.index]!;
            return {
              id: `${todayDhaka}-${idx}`,
              category: p.category || "Innovation & Tech",
              title_bn: p.title_bn,
              summary_bn: p.summary_bn,
              student_takeaway_bn: p.student_takeaway_bn,
              source: src.source,
              url: src.url,
              published_at: src.pubDate || todayDhaka,
            };
          });

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
            link_url: "/textile-pulse",
            is_read: false,
          } as never);
        } catch {
          // ignore notification error
        }
      }
    }

    return NextResponse.json({ success: true, briefDate: todayDhaka, items });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load Textile Pulse." },
      { status: 500 }
    );
  }
}