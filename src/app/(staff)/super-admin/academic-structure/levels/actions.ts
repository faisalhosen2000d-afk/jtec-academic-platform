"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("You must be logged in.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "super_admin") {
    throw new Error("Only Super Admin can manage levels.");
  }

  return supabase;
}

export async function createLevel(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const name = normalize(formData.get("name"));

  if (!name) {
    throw new Error("Level name is required.");
  }

  const { data: lastLevel, error: lastLevelError } = await supabase
    .from("levels")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLevelError) {
    throw new Error(lastLevelError.message);
  }

  const nextSortOrder = (lastLevel?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("levels").insert({
    name,
    sort_order: nextSortOrder,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A level with this name already exists.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/levels");
}

export async function updateLevel(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));
  const name = normalize(formData.get("name"));

  if (!id || !name) {
    throw new Error("Level ID and name are required.");
  }

  const { error } = await supabase
    .from("levels")
    .update({
      name,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A level with this name already exists.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/levels");
}

export async function deleteLevel(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Level ID is required.");
  }

  const { error } = await supabase
    .from("levels")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/levels");
}