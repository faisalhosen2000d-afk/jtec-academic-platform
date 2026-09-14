"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileContactsSchema } from "@/lib/validation/profile-contacts";

export type ProfileContactsActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveProfileContacts(
  formData: FormData,
): Promise<ProfileContactsActionResult> {
  const parsed = profileContactsSchema.safeParse({
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
    facebook: formData.get("facebook"),
    instagram: formData.get("instagram"),
    linkedin: formData.get("linkedin"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid contact information.",
    };
  }

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

  const { error } = await supabase.from("profile_contacts").upsert(
    {
      profile_id: user.id,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      facebook: parsed.data.facebook || null,
      instagram: parsed.data.instagram || null,
      linkedin: parsed.data.linkedin || null,
    },
    {
      onConflict: "profile_id",
    },
  );

  if (error) {
    console.error("Profile contacts save error:", error);

    return {
      success: false,
      error: "Contact information could not be saved.",
    };
  }

  revalidatePath("/profile");

  return { success: true };
}
