"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NotificationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteNotification(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
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

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error(
        "Delete notification error:",
        error,
      );

      return {
        success: false,
        error: "Notification could not be deleted.",
      };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Unexpected delete notification error:",
      error,
    );

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}
export async function markNotificationAsRead(
  notificationId: string,
): Promise<NotificationActionResult> {
  try {
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

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error(
        "Mark notification as read error:",
        error,
      );

      return {
        success: false,
        error: "Notification could not be marked as read.",
      };
    }

    revalidatePath("/notifications");
    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Unexpected mark notification as read error:",
      error,
    );

    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}
