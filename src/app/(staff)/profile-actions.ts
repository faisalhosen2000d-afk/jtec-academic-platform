"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type StaffProfileActionResult = {
  success: boolean;
  message: string;
};

export async function updateStaffProfile(
  formData: FormData
): Promise<StaffProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    !["admin", "super_admin", "moderator"].includes(currentProfile.role)
  ) {
    return { success: false, message: "Unauthorized staff access." };
  }

  const fullName = String(formData.get("full_name") || "").trim();
  const designation = String(formData.get("designation") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const officeRoom = String(formData.get("office_room") || "").trim();
  const specialization = String(formData.get("specialization") || "").trim();

  if (fullName.length < 2) {
    return { success: false, message: "Full name must be at least 2 characters." };
  }

  const serviceRole = createServiceRoleClient();
  const { error } = await serviceRole
    .from("profiles")
    .update({
      full_name: fullName,
      designation: designation || null,
      phone: phone || null,
      office_room: officeRoom || null,
      specialization: specialization || null,
    } as never)
    .eq("id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/profile");
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/profile");

  return { success: true, message: "Faculty profile updated successfully." };
}

export async function updateStaffPassword(
  formData: FormData
): Promise<StaffProfileActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Authentication required." };
  }

  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (newPassword.length < 8) {
    return {
      success: false,
      message: "New password must be at least 8 characters long.",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      message: "Passwords do not match. Please re-check.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: "Password updated successfully." };
}