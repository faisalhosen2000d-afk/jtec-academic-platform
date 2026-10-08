"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  materialRatingSchema,
  type MaterialRatingInput,
} from "@/lib/validation/material-ratings";

export type MaterialRatingActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveMaterialRating(
  input: MaterialRatingInput,
): Promise<MaterialRatingActionResult> {
  const parsed = materialRatingSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid rating.",
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

  const { error } = await supabase
    .from("material_ratings")
    .upsert(
      {
        material_id: parsed.data.material_id,
        student_id: user.id,
        stars: parsed.data.stars,
      },
      {
        onConflict: "material_id,student_id",
      },
    );

  if (error) {
    console.error("Material rating save error:", error);

    return {
      success: false,
      error: "Rating could not be saved.",
    };
  }

  revalidatePath("/materials");

  return {
    success: true,
  };
}

export async function deleteMaterialRating(
  materialId: string,
): Promise<MaterialRatingActionResult> {
  const parsed = materialRatingSchema.shape.material_id.safeParse(materialId);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid material.",
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

  const { error } = await supabase
    .from("material_ratings")
    .delete()
    .eq("material_id", parsed.data)
    .eq("student_id", user.id);

  if (error) {
    console.error("Material rating delete error:", error);

    return {
      success: false,
      error: "Rating could not be removed.",
    };
  }

  revalidatePath("/materials");

  return {
    success: true,
  };
}
