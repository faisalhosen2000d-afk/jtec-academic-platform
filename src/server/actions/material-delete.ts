"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DeleteApprovedMaterialResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteApprovedMaterial(
  materialId: string,
): Promise<DeleteApprovedMaterialResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in.",
    };
  }

  const trimmedMaterialId = materialId.trim();

  if (!trimmedMaterialId) {
    return {
      success: false,
      error: "Material ID is required.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "super_admin"
  ) {
    return {
      success: false,
      error: "Only Super Admin can delete approved materials.",
    };
  }

  const serviceSupabase = createServiceRoleClient();

  const { data: material, error: materialError } = await serviceSupabase
    .from("materials")
    .select(`
      id,
      title,
      status,
      file_path,
      uploader_id,
      subject_id,
      department_id,
      level_id,
      term_id,
      file_type,
      file_size_bytes,
      views_count,
      downloads_count,
      created_at,
      reviewed_by,
      reviewed_at,
      rejection_reason
    `)
    .eq("id", trimmedMaterialId)
    .eq("status", "approved")
    .maybeSingle();

  if (materialError || !material) {
    return {
      success: false,
      error: "Approved material could not be found.",
    };
  }

  if (!material.file_path) {
    return {
      success: false,
      error: "Material storage file path is missing.",
    };
  }

  const { error: deleteError } = await serviceSupabase
    .from("materials")
    .delete()
    .eq("id", material.id)
    .eq("status", "approved");

  if (deleteError) {
    console.error("Approved material database deletion error:", deleteError);
    return {
      success: false,
      error: "Material record could not be deleted.",
    };
  }

  const { error: storageError } = await serviceSupabase.storage
    .from("academic-materials")
    .remove([material.file_path]);

  if (storageError) {
    console.error("Material storage deletion error:", storageError);
  }

  // Send in-app notification to the uploader
  if (material.uploader_id) {
    try {
      await serviceSupabase.from("notifications").insert({
        recipient_id: material.uploader_id,
        type: "material_deleted",
        title: "Material Removed",
        body: `Your uploaded material "${material.title}" has been removed by the administration.`,
        link_url: "/materials",
        is_read: false,
      });
    } catch (notifErr) {
      console.error("Failed to send deletion notification:", notifErr);
    }
  }

  await serviceSupabase.from("audit_logs").insert({
    actor_id: user.id,
    action: "material.deleted",
    target_table: "materials",
    target_id: material.id,
    previous_state: {
      id: material.id,
      title: material.title,
      uploader_id: material.uploader_id,
    },
    new_state: null,
  });

  revalidatePath("/super-admin/approved-materials");
  revalidatePath("/materials");
  revalidatePath("/bookmarks");
  revalidatePath("/notifications");

  return { success: true };
}