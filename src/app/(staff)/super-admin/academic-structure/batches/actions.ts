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
    throw new Error("Only Super Admin can manage batches.");
  }

  return supabase;
}

export async function createBatch(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const name = normalize(formData.get("name"));

  if (!name) {
    throw new Error("Batch name is required.");
  }

  const { error } = await supabase.from("batches").insert({
    name,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("A batch with this name already exists.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/batches");
}

export async function updateBatch(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));
  const name = normalize(formData.get("name"));

  if (!id || !name) {
    throw new Error("Batch ID and name are required.");
  }

  const { error } = await supabase
    .from("batches")
    .update({
      name,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("A batch with this name already exists.");
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/batches");
}

export async function deleteBatch(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Batch ID is required.");
  }

  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/batches");
}