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
    material_id: formData.get("material_id") || undefined,
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

  const { data: recipientProfile, error: recipientError } = await notificationService
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
      error: "The selected student is not available for messaging.",
    };
  }

  const { error: messageError } = await supabase
    .from("profile_messages")
    .insert({
      sender_id: user.id,
      recipient_id: recipientProfile.id,
      material_id: parsed.data.material_id ?? null,
      message: parsed.data.message,
    });

  if (messageError) {
    console.error("Profile message insert error:", messageError);

    return {
      success: false,
      error: "The message could not be sent.",
    };
  }


  return { success: true };
}

export async function markMessageAsRead(
  messageId: string,
): Promise<ProfileMessageActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to mark messages as read.",
    };
  }

  if (!messageId) {
    return {
      success: false,
      error: "Invalid message.",
    };
  }

  const serviceRole = createServiceRoleClient();

  const { error } = await serviceRole
    .from("profile_messages")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Mark message as read error:", error);

    return {
      success: false,
      error: "Message could not be marked as read.",
    };
  }

  return { success: true };
}



export async function markConversationMessagesAsRead(
  partnerId: string,
): Promise<ProfileMessageActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to mark messages as read.",
    };
  }

  if (!partnerId || partnerId === user.id) {
    return {
      success: false,
      error: "Invalid conversation.",
    };
  }

  const serviceRole = createServiceRoleClient();

  const { error } = await serviceRole
    .from("profile_messages")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("sender_id", partnerId)
    .eq("recipient_id", user.id)
    .is("read_at", null)
    .gte(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );

  if (error) {
    console.error(
      "MARK_CONVERSATION_MESSAGES_AS_READ_ERROR",
      JSON.stringify({
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      }),
    );

    return {
      success: false,
      error: "Conversation messages could not be marked as read.",
    };
  }

  return { success: true };
}
