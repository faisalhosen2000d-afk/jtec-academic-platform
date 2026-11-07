"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { studentFullNameSchema } from "@/lib/validation/student-profile";

export type StudentFullNameActionResult =
  | { success: true }
  | { success: false; error: string };

export async function updateStudentFullName(
  formData: FormData,
): Promise<StudentFullNameActionResult> {
  const parsed = studentFullNameSchema.safeParse(
    formData.get("full_name"),
  );

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Invalid full name.",
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

  const { error } = await supabase.rpc(
    "update_own_student_full_name",
    {
      p_new_name: parsed.data,
    },
  );

  if (error) {
    console.error("Student full name update error:", error);

    return {
      success: false,
      error: "Full name could not be updated. Please try again.",
    };
  }

  revalidatePath("/profile");

  return { success: true };
}
