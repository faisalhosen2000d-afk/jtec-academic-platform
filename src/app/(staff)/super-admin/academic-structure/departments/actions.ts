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
    throw new Error("Only Super Admin can manage departments.");
  }

  return supabase;
}

export async function createDepartment(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const name = normalize(formData.get("name"));
  const code = normalize(formData.get("code")).toUpperCase();

  if (!name || !code) {
    throw new Error("Department name and code are required.");
  }

  const { error } = await supabase.from("departments").insert({
    name,
    code,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A department with this name or code already exists.",
      );
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/departments");
}

export async function updateDepartment(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));
  const name = normalize(formData.get("name"));
  const code = normalize(formData.get("code")).toUpperCase();

  if (!id || !name || !code) {
    throw new Error("Department ID, name, and code are required.");
  }

  const { error } = await supabase
    .from("departments")
    .update({
      name,
      code,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A department with this name or code already exists.",
      );
    }

    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/departments");
}

export async function deleteDepartment(formData: FormData): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Department ID is required.");
  }

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/super-admin/academic-structure");
  revalidatePath("/super-admin/academic-structure/departments");
}