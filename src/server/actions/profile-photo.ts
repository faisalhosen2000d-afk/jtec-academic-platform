"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfilePhotoActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveProfilePhoto(
  avatarUrl: string,
): Promise<ProfilePhotoActionResult> {
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

  const trimmedUrl = avatarUrl.trim();

  if (!trimmedUrl) {
    return {
      success: false,
      error: "Profile photo URL is required.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: trimmedUrl })
    .eq("id", user.id);

  if (error) {
    console.error("Profile photo save error:", error);

    return {
      success: false,
      error: "Profile photo could not be saved.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/materials");

  return { success: true };
}
