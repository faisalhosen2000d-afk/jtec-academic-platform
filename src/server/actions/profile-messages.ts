"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { profileMessageSchema } from "@/lib/validation/profile-messages";

export type ProfileMessageActionResult =
  | { success: true }
  | { success: false; error: string };

export async function sendProfileMessage(
  formData: FormData,
): Promise<ProfileMessageActionResult> {
  const parsed = profileMessageSchema.safeParse({
    recipient_id: formData.get("recipient_id"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid message.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to send a message.",
    };
  }

  const { data: senderProfile, error: senderError } = await supabase
    .from("profiles")
    .select("id, role, is_verified, full_name")
    .eq("id", user.id)
    .single();

  if (
    senderError ||
    !senderProfile ||
    senderProfile.role !== "student" ||
    !senderProfile.is_verified
  ) {
    return {
      success: false,
      error: "Only verified students can send messages.",
    };
  }

  if (parsed.data.recipient_id === user.id) {
    return {
      success: false,
      error: "You cannot message yourself.",
    };
  }

  const notificationService = createServiceRoleClient();

  const { data: recipientProfile, error: recipientError } =
    await notificationService
      .from("profiles")
      .select("id, role, is_verified, full_name")
      .eq("id", parsed.data.recipient_id)
      .single();

  if (
    recipientError ||
    !recipientProfile ||
    recipientProfile.role !== "student" ||
    !recipientProfile.is_verified
  ) {
    return {
      success: false,
      error: "The selected student could not be found.",
    };
  }

  const { error: messageError } = await notificationService
    .from("profile_messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipientProfile.id,
      message: parsed.data.message,
    });

  if (messageError) {
    console.error("Profile message insert error:", messageError);

    return {
      success: false,
      error: "The message could not be sent.",
    };
  }

  const { error: notificationError } = await notificationService
    .from("notifications")
    .insert({
      recipient_id: recipientProfile.id,
      type: "profile_message",
      title: `New message from ${senderProfile.full_name}`,
      body: parsed.data.message,
      link_url: "/notifications",
      is_read: false,
    });

  if (notificationError) {
    console.error("Profile message notification error:", notificationError);

    return {
      success: false,
      error: "The message was saved, but notification could not be created.",
    };
  }

  return { success: true };
}
