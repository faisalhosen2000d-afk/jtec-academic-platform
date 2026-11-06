"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";

function normalizeBdTimestamp(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return `${trimmed}+06:00`;
  }
  return trimmed;
}

export interface SystemSettingsInput {
  registration_open?: boolean;
  max_upload_size_mb?: number;
  maintenance_mode?: boolean;
  maintenance_message?: string;
  maintenance_start_time?: string | null;
  maintenance_end_time?: string | null;
  maintenance_bypass_student_ids?: string | null;
}

export async function savePlatformSettings(input: FormData | SystemSettingsInput) {
  const authSupabase = await createServerAuthClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    return { success: false as const, error: "Unauthorized" };
  }

  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return { success: false as const, error: "Only Super Admins can modify system settings." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const adminClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  let registration_open = false;
  let max_upload_size_mb = 25;
  let maintenance_mode = false;
  let maintenance_message = "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.";
  let maintenance_start_time: string | null = null;
  let maintenance_end_time: string | null = null;
  let maintenance_bypass_student_ids: string | null = null;

  if (input instanceof FormData) {
    registration_open = input.get("registration_open") === "on" || input.get("registration_open") === "true";
    max_upload_size_mb = Number(input.get("max_upload_size_mb")) || 25;
    maintenance_mode = input.get("maintenance_mode") === "on" || input.get("maintenance_mode") === "true";
    maintenance_message = String(input.get("maintenance_message") || maintenance_message);
    maintenance_start_time = normalizeBdTimestamp(input.get("maintenance_start_time") as string);
    maintenance_end_time = normalizeBdTimestamp(input.get("maintenance_end_time") as string);
    const bypassRaw = input.get("maintenance_bypass_student_ids");
    maintenance_bypass_student_ids = typeof bypassRaw === "string" && bypassRaw.trim() ? bypassRaw.trim() : null;
  } else {
    registration_open = Boolean(input.registration_open);
    max_upload_size_mb = Number(input.max_upload_size_mb) || 25;
    maintenance_mode = Boolean(input.maintenance_mode);
    maintenance_message = input.maintenance_message || maintenance_message;
    maintenance_start_time = normalizeBdTimestamp(input.maintenance_start_time);
    maintenance_end_time = normalizeBdTimestamp(input.maintenance_end_time);
    maintenance_bypass_student_ids = input.maintenance_bypass_student_ids ? input.maintenance_bypass_student_ids.trim() : null;
  }

  const payload = {
    id: 1,
    registration_open,
    max_upload_size_mb,
    maintenance_mode,
    maintenance_message,
    maintenance_start_time,
    maintenance_end_time,
    maintenance_bypass_student_ids,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const { error } = await adminClient
    .from("platform_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    return { success: false as const, error: error.message };
  }

  revalidatePath("/super-admin/system-settings");
  revalidatePath("/dashboard");
  revalidatePath("/upload");
  revalidatePath("/");

  return { success: true as const };
}

export const updateSystemSettings = savePlatformSettings;