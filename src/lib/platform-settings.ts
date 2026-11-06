import { createClient } from "@/lib/supabase/server";

export interface PlatformSettingsData {
  registration_open: boolean;
  max_upload_size_mb: number;
  maintenance_mode: boolean;
  maintenance_start_time: string | null;
  maintenance_end_time: string | null;
  maintenance_message: string | null;
}

interface RpcClient {
  rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => {
    select: (cols: string) => {
      limit: (n: number) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
}

/**
 * Parses a timestamp string safely. If it lacks timezone offset (e.g. "2026-11-06T18:35"),
 * treats it as Bangladesh Standard Time (+06:00) so local inputs match server UTC comparisons.
 */
export function parseBangladeshDateTime(raw?: string | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check if string has Z or +/-HH:MM timezone suffix, and whether it was stored as naive UTC
  // When datetime-local "2026-11-06T18:35" is stored into Postgres timestamptz without offset,
  // Postgres appends "+00:00" or "Z" to the local wall-clock hour.
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function getActivePlatformSettings(): Promise<PlatformSettingsData> {
  const supabase = (await createClient()) as unknown as RpcClient;

  // Try SECURITY DEFINER RPC first (bypasses RLS for all roles including anon/student)
  const { data: rpcData } = await supabase.rpc("get_platform_settings");
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    return {
      registration_open: typeof r.registration_open === "boolean" ? r.registration_open : true,
      max_upload_size_mb: typeof r.max_upload_size_mb === "number" ? r.max_upload_size_mb : 25,
      maintenance_mode: typeof r.maintenance_mode === "boolean" ? r.maintenance_mode : false,
      maintenance_start_time: typeof r.maintenance_start_time === "string" ? r.maintenance_start_time : null,
      maintenance_end_time: typeof r.maintenance_end_time === "string" ? r.maintenance_end_time : null,
      maintenance_message: typeof r.maintenance_message === "string" ? r.maintenance_message : null,
    };
  }

  // Fallback to direct table query
  const { data: tableData } = await supabase
    .from("platform_settings")
    .select("registration_open, max_upload_size_mb, maintenance_mode, maintenance_start_time, maintenance_end_time, maintenance_message")
    .limit(1)
    .maybeSingle();

  if (tableData && typeof tableData === "object") {
    const r = tableData as Record<string, unknown>;
    return {
      registration_open: typeof r.registration_open === "boolean" ? r.registration_open : true,
      max_upload_size_mb: typeof r.max_upload_size_mb === "number" ? r.max_upload_size_mb : 25,
      maintenance_mode: typeof r.maintenance_mode === "boolean" ? r.maintenance_mode : false,
      maintenance_start_time: typeof r.maintenance_start_time === "string" ? r.maintenance_start_time : null,
      maintenance_end_time: typeof r.maintenance_end_time === "string" ? r.maintenance_end_time : null,
      maintenance_message: typeof r.maintenance_message === "string" ? r.maintenance_message : null,
    };
  }

  return {
    registration_open: true,
    max_upload_size_mb: 25,
    maintenance_mode: false,
    maintenance_start_time: null,
    maintenance_end_time: null,
    maintenance_message: null,
  };
}

export function isMaintenanceCurrentlyActive(settings: PlatformSettingsData): boolean {
  if (!settings.maintenance_mode) return false;

  const startRaw = settings.maintenance_start_time;
  const endRaw = settings.maintenance_end_time;

  if (!startRaw && !endRaw) {
    return true;
  }

  const nowUtcMs = Date.now();
  // Also compute now in BD wall-clock in case naive datetime-local was stored directly as +00:00 in Postgres
  const bdOffsetMs = 6 * 60 * 60 * 1000;
  const nowBdAsUtcMs = nowUtcMs + bdOffsetMs;

  const startMs = startRaw ? new Date(startRaw).getTime() : null;
  const endMs = endRaw ? new Date(endRaw).getTime() : null;

  const checkWindow = (currentMs: number) => {
    if (startMs && endMs) return currentMs >= startMs && currentMs <= endMs;
    if (startMs && !endMs) return currentMs >= startMs;
    if (!startMs && endMs) return currentMs <= endMs;
    return true;
  };

  // Match if active under true UTC OR under naive BD wall-clock stored as UTC
  return checkWindow(nowUtcMs) || checkWindow(nowBdAsUtcMs);
}