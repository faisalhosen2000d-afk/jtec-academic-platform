"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function approveStudentVerification(
  studentId: string,
  imagePath?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    return { success: false, error: "Access denied. Admin or Moderator privileges required." };
  }

  // 1. Call verify_student RPC (syncs Level, Term, Dept from registration_codes and sets approved)
  const { error: rpcError } = await supabase.rpc("verify_student", {
    target_student_id: studentId,
  });

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  // 2. Auto-delete ID card image from private storage bucket
  if (imagePath && imagePath.trim().length > 0) {
    try {
      const serviceRole = createServiceRoleClient();
      await serviceRole.storage
        .from("student-id-verifications")
        .remove([imagePath]);

      await serviceRole
        .from("profiles")
        .update({ id_card_image_path: null } as never)
        .eq("id", studentId);
    } catch (e: unknown) {
      console.error("Warning: Failed to auto-delete verification image:", e);
    }
  }

  revalidatePath("/admin/students/verification");
  revalidatePath("/admin/students");
  revalidatePath("/super-admin/users/students/verification");
  revalidatePath("/super-admin/users/students/accounts");

  return { success: true };
}

export async function rejectStudentVerification(
  studentId: string,
  reason: string,
  imagePath?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
    return { success: false, error: "Access denied. Admin or Moderator privileges required." };
  }

  const cleanReason = reason.trim() || "Student ID card verification could not be confirmed.";

  // 1. Call reject_student_verification RPC
  const { error: rpcError } = await supabase.rpc("reject_student_verification" as never, {
    target_student_id: studentId,
    p_reason: cleanReason,
  } as never);

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  // 2. Auto-delete ID card image from private storage bucket
  if (imagePath && imagePath.trim().length > 0) {
    try {
      const serviceRole = createServiceRoleClient();
      await serviceRole.storage
        .from("student-id-verifications")
        .remove([imagePath]);

      await serviceRole
        .from("profiles")
        .update({ id_card_image_path: null } as never)
        .eq("id", studentId);
    } catch (e: unknown) {
      console.error("Warning: Failed to auto-delete verification image:", e);
    }
  }

  revalidatePath("/admin/students/verification");
  revalidatePath("/admin/students");
  revalidatePath("/super-admin/users/students/verification");
  revalidatePath("/super-admin/users/students/accounts");

  return { success: true };
}
