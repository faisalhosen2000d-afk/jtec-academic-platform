import { createClient as createRawSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { isB2Path } from "@/lib/material-storage";

export const B2_DAILY_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB daily free tier

export interface B2BandwidthStatus {
  dayUtc: string;
  bytesUsed: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  requestsCount: number;
  status: "ok" | "warning" | "exceeded";
}

export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordB2BandwidthUsage(
  serviceSupabase: SupabaseClient,
  filePath: string,
  fileSizeBytes: number,
): Promise<void> {
  if (!isB2Path(filePath)) return;
  const safeBytes =
    Number.isFinite(fileSizeBytes) && fileSizeBytes > 0
      ? Math.round(fileSizeBytes)
      : 0;
  if (safeBytes <= 0) return;

  const dayUtc = getTodayUtcDateString();

  try {
    const { error: rpcError } = await serviceSupabase.rpc(
      "increment_b2_daily_bandwidth",
      {
        p_day_utc: dayUtc,
        p_bytes: safeBytes,
      },
    );

    if (!rpcError) return;

    console.warn("[b2-bandwidth][rpc-fallback]", rpcError.message);

    const { data: existing } = await serviceSupabase
      .from("b2_daily_bandwidth")
      .select("bytes_used, requests_count")
      .eq("day_utc", dayUtc)
      .maybeSingle();

    const nextBytes = Number(existing?.bytes_used ?? 0) + safeBytes;
    const nextHits = Number(existing?.requests_count ?? 0) + 1;

    const { error: upsertError } = await serviceSupabase
      .from("b2_daily_bandwidth")
      .upsert(
        {
          day_utc: dayUtc,
          bytes_used: nextBytes,
          requests_count: nextHits,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "day_utc" },
      );

    if (upsertError) {
      console.error("[b2-bandwidth][upsert-error]", upsertError.message);
    }
  } catch (err) {
    console.error("[b2-bandwidth][record]", err);
  }
}

export async function getTodayB2BandwidthStatus(): Promise<B2BandwidthStatus> {
  const dayUtc = getTodayUtcDateString();
  const empty: B2BandwidthStatus = {
    dayUtc,
    bytesUsed: 0,
    limitBytes: B2_DAILY_LIMIT_BYTES,
    remainingBytes: B2_DAILY_LIMIT_BYTES,
    percentUsed: 0,
    requestsCount: 0,
    status: "ok",
  };

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceKey) return empty;

    const rawClient = createRawSupabaseClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });

    const { data, error } = await rawClient
      .from("b2_daily_bandwidth")
      .select("bytes_used, requests_count")
      .eq("day_utc", dayUtc)
      .maybeSingle();

    if (error || !data) return empty;

    const bytesUsed = Math.max(0, Number(data.bytes_used ?? 0));
    const requestsCount = Math.max(0, Number(data.requests_count ?? 0));
    const remainingBytes = Math.max(0, B2_DAILY_LIMIT_BYTES - bytesUsed);
    const percentUsed = Math.min(
      100,
      Math.round((bytesUsed / B2_DAILY_LIMIT_BYTES) * 100),
    );
    const status: B2BandwidthStatus["status"] =
      percentUsed >= 100 ? "exceeded" : percentUsed >= 80 ? "warning" : "ok";

    return {
      dayUtc,
      bytesUsed,
      limitBytes: B2_DAILY_LIMIT_BYTES,
      remainingBytes,
      percentUsed,
      requestsCount,
      status,
    };
  } catch {
    return empty;
  }
}