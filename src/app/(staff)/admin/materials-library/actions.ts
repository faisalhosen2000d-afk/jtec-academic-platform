"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function getStaffMaterialAccessUrl(
  materialId: string,
  action: "open" | "download"
): Promise<{ success: boolean; url?: string; error?: string }> {
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

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    return { success: false, error: "Unauthorized staff access." };
  }

  const serviceRole = createServiceRoleClient();
  const { data: material, error: matError } = await serviceRole
    .from("materials")
    .select("id, file_path, status")
    .eq("id", materialId)
    .maybeSingle();

  if (matError || !material || !material.file_path) {
    return { success: false, error: "Material file not found." };
  }

  const { data: signed, error: signError } = await serviceRole.storage
    .from("academic-materials")
    .createSignedUrl(material.file_path, 3600, {
      download: action === "download",
    });

  if (signError || !signed?.signedUrl) {
    return { success: false, error: "Could not generate file access URL." };
  }

  return { success: true, url: signed.signedUrl };
}