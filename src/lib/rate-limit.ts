import { NextResponse } from "next/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";

export interface RateLimitOptions {
  /** Unique bucket key, e.g. "ai-assistant:<userId>" */
  key: string;
  /** Maximum requests allowed within the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  retryAfterSeconds: number;
}

/**
 * Distributed shared-counter rate limiter backed by Supabase Postgres.
 * Safe across multiple Vercel serverless instances.
 * Fails open if the database RPC is unavailable so legitimate traffic is never broken.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
  }

  try {
    const sb = createRawSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb.rpc("consume_rate_limit", {
      p_key: options.key,
      p_limit: options.limit,
      p_window_seconds: options.windowSeconds,
    });

    if (error || !data) {
      return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
    }

    const row = Array.isArray(data)
      ? (data[0] as {
          allowed?: boolean;
          current_count?: number;
          retry_after_seconds?: number;
        } | undefined)
      : (data as {
          allowed?: boolean;
          current_count?: number;
          retry_after_seconds?: number;
        });

    if (!row || typeof row.allowed !== "boolean") {
      return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
    }

    return {
      allowed: row.allowed,
      currentCount: Number(row.current_count ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? options.windowSeconds),
    };
  } catch {
    return { allowed: true, currentCount: 0, retryAfterSeconds: 0 };
  }
}

export function rateLimitExceededResponse(
  retryAfterSeconds: number,
  message?: string,
): NextResponse {
  const secs = Math.max(1, Math.round(retryAfterSeconds));
  return NextResponse.json(
    {
      error:
        message ||
        `Too many requests. Please wait ${secs} seconds and try again.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(secs),
      },
    },
  );
}
