"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MaterialBookmarkActionResult =
  | { success: true; bookmarked: boolean }
  | { success: false; error: string };

export async function toggleMaterialBookmark(
  materialId: string,
): Promise<MaterialBookmarkActionResult> {
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

  const { data: existingBookmark, error: existingBookmarkError } =
    await supabase
      .from("material_bookmarks")
      .select("id")
      .eq("material_id", trimmedMaterialId)
      .eq("student_id", user.id)
      .maybeSingle();

  if (existingBookmarkError) {
    console.error(
      "Material bookmark lookup error:",
      existingBookmarkError,
    );

    return {
      success: false,
      error: "Bookmark status could not be checked.",
    };
  }

  if (existingBookmark) {
    const { error } = await supabase
      .from("material_bookmarks")
      .delete()
      .eq("id", existingBookmark.id)
      .eq("student_id", user.id);

    if (error) {
      console.error("Material bookmark removal error:", error);

      return {
        success: false,
        error: "Bookmark could not be removed.",
      };
    }

    revalidatePath("/bookmarks");
    revalidatePath(`/materials/${trimmedMaterialId}`);

    return {
      success: true,
      bookmarked: false,
    };
  }

  const { error } = await supabase.from("material_bookmarks").insert({
    material_id: trimmedMaterialId,
    student_id: user.id,
  });

  if (error) {
    console.error("Material bookmark creation error:", error);

    return {
      success: false,
      error: "Bookmark could not be added.",
    };
  }

  revalidatePath("/bookmarks");
  revalidatePath(`/materials/${trimmedMaterialId}`);

  return {
    success: true,
    bookmarked: true,
  };
}
