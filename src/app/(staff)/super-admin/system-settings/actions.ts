"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type SaveSettingsResult =
  | { success: true }
  | { success: false; error: string };

export async function savePlatformSettings(formData: FormData): Promise<SaveSettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") {
    return { success: false, error: "Only Super Admin can change system settings." };
  }

  const registrationOpen = formData.get("registration_open") === "on";
  const maintenanceMode = formData.get("maintenance_mode") === "on";
  const maxUploadSizeMb = parseInt(formData.get("max_upload_size_mb") as string, 10) || 100;
  const maintenanceMessage =
    (formData.get("maintenance_message") as string)?.trim() ||
    "The academic platform is currently undergoing scheduled maintenance. Please check back shortly.";

  const { error: rpcError } = await supabase.rpc("update_platform_settings", {
    p_registration_open: registrationOpen,
    p_max_upload_size_mb: maxUploadSizeMb,
    p_maintenance_mode: maintenanceMode,
    p_maintenance_message: maintenanceMessage,
  });

  if (rpcError) {
    console.error("Platform settings update error:", rpcError);
    return { success: false, error: rpcError.message };
  }

  const serviceSupabase = createServiceRoleClient();
  await serviceSupabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "system.settings_updated",
    target_table: "platform_settings",
    target_id: "1",
    previous_state: null,
    new_state: {
      registration_open: registrationOpen,
      max_upload_size_mb: maxUploadSizeMb,
      maintenance_mode: maintenanceMode,
    },
  });

  revalidatePath("/super-admin/system-settings");
  revalidatePath("/super-admin/audit-logs");

  return { success: true };
}