import { createClient } from "@/lib/supabase/server";

export interface PlatformSettingsData {
  registration_open: boolean;
  max_upload_size_mb: number;
  maintenance_mode: boolean;
  maintenance_start_time: string | null;
  maintenance_end_time: string | null;
  maintenance_message: string | null;
  maintenance_bypass_student_ids: string | null;
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

export async function getActivePlatformSettings(): Promise<PlatformSettingsData> {
  const supabase = (await createClient()) as unknown as RpcClient;

  // Try RPC first (SECURITY DEFINER bypasses RLS for all users)
  const { data: rpcData } = await supabase.rpc("get_platform_settings");
  const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    if (typeof r.maintenance_bypass_student_ids !== "undefined") {
      return {
        registration_open: typeof r.registration_open === "boolean" ? r.registration_open : true,
        max_upload_size_mb: typeof r.max_upload_size_mb === "number" ? r.max_upload_size_mb : 25,
        maintenance_mode: typeof r.maintenance_mode === "boolean" ? r.maintenance_mode : false,
        maintenance_start_time: typeof r.maintenance_start_time === "string" ? r.maintenance_start_time : null,
        maintenance_end_time: typeof r.maintenance_end_time === "string" ? r.maintenance_end_time : null,
        maintenance_message: typeof r.maintenance_message === "string" ? r.maintenance_message : null,
        maintenance_bypass_student_ids: typeof r.maintenance_bypass_student_ids === "string" ? r.maintenance_bypass_student_ids : null,
      };
    }
  }

  // Fallback to direct table query
  const { data: tableData } = await supabase
    .from("platform_settings")
    .select("registration_open, max_upload_size_mb, maintenance_mode, maintenance_start_time, maintenance_end_time, maintenance_message, maintenance_bypass_student_ids")
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
      maintenance_bypass_student_ids: typeof r.maintenance_bypass_student_ids === "string" ? r.maintenance_bypass_student_ids : null,
    };
  }

  return {
    registration_open: true,
    max_upload_size_mb: 25,
    maintenance_mode: false,
    maintenance_start_time: null,
    maintenance_end_time: null,
    maintenance_message: null,
    maintenance_bypass_student_ids: null,
  };
}

export function isStudentAuthorizedBypass(
  candidates: Array<string | null | undefined>,
  bypassList: string | null | undefined
): boolean {
  if (!bypassList) return false;
  const allowedIds = bypassList
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowedIds.length === 0) return false;

  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) continue;
    if (allowedIds.includes(cleaned)) return true;
    // Also check if email starts with student ID (e.g. 24060401021@...)
    const emailPrefix = cleaned.split("@")[0];
    if (emailPrefix && allowedIds.includes(emailPrefix)) return true;
  }

  return false;
}

export function isMaintenanceCurrentlyActive(settings: PlatformSettingsData): boolean {
  if (!settings.maintenance_mode) return false;

  const startRaw = settings.maintenance_start_time;
  const endRaw = settings.maintenance_end_time;

  if (!startRaw && !endRaw) {
    return true;
  }

  const nowUtcMs = Date.now();
  const bdOffsetMs = 6 * 60 * 60 * 1000;
  const nowBdAsUtcMs = nowUtcMs + bdOffsetMs;

  const startMs = startRaw ? new Date(startRaw).getTime() : null;
  let endMs = endRaw ? new Date(endRaw).getTime() : null;

  if (startMs && endMs && endMs < startMs) {
    endMs += 24 * 60 * 60 * 1000;
  }

  const checkWindow = (currentMs: number) => {
    if (startMs && endMs) return currentMs >= startMs && currentMs <= endMs;
    if (startMs && !endMs) return currentMs >= startMs;
    if (!startMs && endMs) return currentMs <= endMs;
    return true;
  };

  return checkWindow(nowUtcMs) || checkWindow(nowBdAsUtcMs);
}