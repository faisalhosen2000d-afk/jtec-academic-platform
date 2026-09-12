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

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

  if (profileError || profile?.role !== "super_admin") {
    throw new Error("Only Super Admin can manage subjects.");
  }

  return supabase;
}

function revalidateSubjects() {
  revalidatePath("/super-admin/academic-structure");
  revalidatePath(
    "/super-admin/academic-structure/subjects",
  );
}

export async function createSubject(
  formData: FormData,
): Promise<void> {
  const supabase = await requireSuperAdmin();

  const departmentId = normalize(
    formData.get("department_id"),
  );

  const levelId = normalize(
    formData.get("level_id"),
  );

  const termId = normalize(
    formData.get("term_id"),
  );

  const subjectCode = normalize(
    formData.get("subject_code"),
  ).toUpperCase();

  const subjectName = normalize(
    formData.get("subject_name"),
  );

  if (
    !departmentId ||
    !levelId ||
    !termId ||
    !subjectCode ||
    !subjectName
  ) {
    throw new Error(
      "Department, level, term, subject code, and subject name are required.",
    );
  }

  const { data: term, error: termError } =
    await supabase
      .from("terms")
      .select("id")
      .eq("id", termId)
      .eq("level_id", levelId)
      .maybeSingle();

  if (termError) {
    throw new Error(termError.message);
  }

  if (!term) {
    throw new Error(
      "The selected term does not belong to the selected level.",
    );
  }

  const {
    data: existingSubject,
    error: duplicateCheckError,
  } = await supabase
    .from("subjects")
    .select("id")
    .eq("department_id", departmentId)
    .eq("level_id", levelId)
    .eq("term_id", termId)
    .eq("subject_code", subjectCode)
    .maybeSingle();

  if (duplicateCheckError) {
    throw new Error(duplicateCheckError.message);
  }

  if (existingSubject) {
    throw new Error(
      "A subject with this code already exists for this department, level, and term.",
    );
  }

  const { error } = await supabase
    .from("subjects")
    .insert({
      department_id: departmentId,
      level_id: levelId,
      term_id: termId,
      subject_code: subjectCode,
      subject_name: subjectName,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A subject with this code already exists for this department, level, and term.",
      );
    }

    throw new Error(error.message);
  }

  revalidateSubjects();
}

export async function updateSubject(
  formData: FormData,
): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  const departmentId = normalize(
    formData.get("department_id"),
  );

  const levelId = normalize(
    formData.get("level_id"),
  );

  const termId = normalize(
    formData.get("term_id"),
  );

  const subjectCode = normalize(
    formData.get("subject_code"),
  ).toUpperCase();

  const subjectName = normalize(
    formData.get("subject_name"),
  );

  if (
    !id ||
    !departmentId ||
    !levelId ||
    !termId ||
    !subjectCode ||
    !subjectName
  ) {
    throw new Error(
      "Subject ID, department, level, term, subject code, and subject name are required.",
    );
  }

  const { data: term, error: termError } =
    await supabase
      .from("terms")
      .select("id")
      .eq("id", termId)
      .eq("level_id", levelId)
      .maybeSingle();

  if (termError) {
    throw new Error(termError.message);
  }

  if (!term) {
    throw new Error(
      "The selected term does not belong to the selected level.",
    );
  }

  const {
    data: existingSubject,
    error: duplicateCheckError,
  } = await supabase
    .from("subjects")
    .select("id")
    .eq("department_id", departmentId)
    .eq("level_id", levelId)
    .eq("term_id", termId)
    .eq("subject_code", subjectCode)
    .neq("id", id)
    .maybeSingle();

  if (duplicateCheckError) {
    throw new Error(duplicateCheckError.message);
  }

  if (existingSubject) {
    throw new Error(
      "A subject with this code already exists for this department, level, and term.",
    );
  }

  const { data: currentSubject, error: currentSubjectError } =
    await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .maybeSingle();

  if (currentSubjectError) {
    throw new Error(currentSubjectError.message);
  }

  if (!currentSubject) {
    throw new Error("Subject not found.");
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      department_id: departmentId,
      level_id: levelId,
      term_id: termId,
      subject_code: subjectCode,
      subject_name: subjectName,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "A subject with this code already exists for this department, level, and term.",
      );
    }

    throw new Error(error.message);
  }

  revalidateSubjects();
}

export async function deleteSubject(
  formData: FormData,
): Promise<void> {
  const supabase = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Subject ID is required.");
  }

  const { data: currentSubject, error: currentSubjectError } =
    await supabase
      .from("subjects")
      .select("id")
      .eq("id", id)
      .maybeSingle();

  if (currentSubjectError) {
    throw new Error(currentSubjectError.message);
  }

  if (!currentSubject) {
    throw new Error("Subject not found.");
  }

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to delete subject: ${error.message}`,
    );
  }

  revalidateSubjects();
}