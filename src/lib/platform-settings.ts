import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";

export type StorageSectionKey = "materials" | "questions" | "notices" | "schedules";
export type StorageProviderMode = "smart_auto" | "r2" | "b2" | "supabase";

export interface SectionStorageRule {
  mode: StorageProviderMode;
  cutoff_mb: number;
}

export type StorageRoutingRules = Record<StorageSectionKey, SectionStorageRule>;

export const DEFAULT_STORAGE_ROUTING_RULES: StorageRoutingRules = {
  materials: { mode: "smart_auto", cutoff_mb: 1.5 },
  questions: { mode: "smart_auto", cutoff_mb: 1.5 },
  notices: { mode: "smart_auto", cutoff_mb: 1.5 },
  schedules: { mode: "smart_auto", cutoff_mb: 1.5 },
};

const VALID_MODES: StorageProviderMode[] = ["smart_auto", "r2", "b2", "supabase"];

export function normalizeStorageRoutingRules(raw: unknown): StorageRoutingRules {
  const result: StorageRoutingRules = {
    materials: { ...DEFAULT_STORAGE_ROUTING_RULES.materials },
    questions: { ...DEFAULT_STORAGE_ROUTING_RULES.questions },
    notices: { ...DEFAULT_STORAGE_ROUTING_RULES.notices },
    schedules: { ...DEFAULT_STORAGE_ROUTING_RULES.schedules },
  };

  if (!raw || typeof raw !== "object") return result;
  const obj = raw as Record<string, unknown>;

  for (const section of ["materials", "questions", "notices", "schedules"] as StorageSectionKey[]) {
    const entry = obj[section];
    if (entry && typeof entry === "object") {
      const e = entry as Record<string, unknown>;
      const mode =
        typeof e.mode === "string" && VALID_MODES.includes(e.mode as StorageProviderMode)
          ? (e.mode as StorageProviderMode)
          : result[section].mode;
      const cutoffRaw = Number(e.cutoff_mb);
      const cutoff_mb =
        Number.isFinite(cutoffRaw) && cutoffRaw >= 0.25 && cutoffRaw <= 50
          ? Math.round(cutoffRaw * 100) / 100
          : result[section].cutoff_mb;
      result[section] = { mode, cutoff_mb };
    }
  }

  return result;
}

export interface PlatformSettingsData {
  registration_open: boolean;
  max_upload_size_mb: number;
  material_storage_provider: "b2" | "supabase" | "r2" | "smart_auto";
  storage_routing_rules: StorageRoutingRules;
  maintenance_mode: boolean;
  maintenance_start_time: string | null;
  maintenance_end_time: string | null;
  maintenance_message: string | null;
  maintenance_bypass_student_ids: string | null;
}

export async function getActivePlatformSettings(): Promise<PlatformSettingsData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const rawClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  const { data: tableData } = await rawClient
    .from("platform_settings")
    .select(
      "registration_open, max_upload_size_mb, material_storage_provider, storage_routing_rules, maintenance_mode, maintenance_start_time, maintenance_end_time, maintenance_message, maintenance_bypass_student_ids",
    )
    .eq("id", 1)
    .maybeSingle();

  if (tableData && typeof tableData === "object") {
    const r = tableData as Record<string, unknown>;
    const legacyProvider =
      r.material_storage_provider === "supabase" ||
      r.material_storage_provider === "r2" ||
      r.material_storage_provider === "smart_auto"
        ? r.material_storage_provider
        : "b2";

    return {
      registration_open: typeof r.registration_open === "boolean" ? r.registration_open : true,
      max_upload_size_mb: typeof r.max_upload_size_mb === "number" ? r.max_upload_size_mb : 25,
      material_storage_provider: legacyProvider,
      storage_routing_rules: normalizeStorageRoutingRules(r.storage_routing_rules),
      maintenance_mode: typeof r.maintenance_mode === "boolean" ? r.maintenance_mode : false,
      maintenance_start_time:
        typeof r.maintenance_start_time === "string" ? r.maintenance_start_time : null,
      maintenance_end_time:
        typeof r.maintenance_end_time === "string" ? r.maintenance_end_time : null,
      maintenance_message:
        typeof r.maintenance_message === "string" ? r.maintenance_message : null,
      maintenance_bypass_student_ids:
        typeof r.maintenance_bypass_student_ids === "string"
          ? r.maintenance_bypass_student_ids
          : null,
    };
  }

  return {
    registration_open: true,
    max_upload_size_mb: 25,
    material_storage_provider: "b2",
    storage_routing_rules: { ...DEFAULT_STORAGE_ROUTING_RULES },
    maintenance_mode: false,
    maintenance_start_time: null,
    maintenance_end_time: null,
    maintenance_message: null,
    maintenance_bypass_student_ids: null,
  };
}

export function isStudentAuthorizedBypass(
  candidates: Array<string | null | undefined>,
  bypassList: string | null | undefined,
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

  const nowMs = Date.now();
  const startMs = startRaw ? new Date(startRaw).getTime() : null;
  let endMs = endRaw ? new Date(endRaw).getTime() : null;

  if (startMs && endMs && endMs < startMs) {
    endMs += 24 * 60 * 60 * 1000;
  }

  if (startMs && endMs) return nowMs >= startMs && nowMs <= endMs;
  if (startMs && !endMs) return nowMs >= startMs;
  if (!startMs && endMs) return nowMs <= endMs;
  return true;
}