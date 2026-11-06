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

  // Query direct table first so all columns including maintenance_bypass_student_ids are guaranteed fresh
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

export function isStudentAuthorizedBypass(studentId: string | null | undefined, bypassList: string | null | undefined): boolean {
  if (!studentId || !bypassList) return false;
  const list = bypassList
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(studentId.trim().toLowerCase());
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

  // Smart midnight rollover fix: if Admin entered 11:54 PM start and 12:05 AM end on the same calendar date,
  // automatically add 24 hours to endMs so it represents 12:05 AM the next night!
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