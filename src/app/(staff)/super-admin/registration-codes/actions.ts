"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function normalize(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}
function generateRegistrationCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";

  for (let index = 0; index < 8; index += 1) {
    randomPart += characters[randomInt(0, characters.length)];
  }

  return `JTEC-${randomPart}`;
}

async function generateUniqueRegistrationCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateRegistrationCode();

    const { data: existingCode, error } = await supabase
      .from("registration_codes")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existingCode) {
      return code;
    }
  }

  throw new Error("Unable to generate a unique registration code. Please try again.");
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
    throw new Error("Only Super Admin can manage registration codes.");
  }

  return {
    supabase,
    userId: userData.user.id,
  };
}

function revalidateRegistrationCodes() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/registration-codes");
}

async function validateAcademicAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  departmentId: string,
  batchId: string,
  levelId: string,
  termId: string,
) {
  const { data: department, error: departmentError } = await supabase
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .maybeSingle();

  if (departmentError) {
    throw new Error(departmentError.message);
  }

  if (!department) {
    throw new Error("Selected department was not found.");
  }

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id")
    .eq("id", batchId)
    .maybeSingle();

  if (batchError) {
    throw new Error(batchError.message);
  }

  if (!batch) {
    throw new Error("Selected batch was not found.");
  }

  const { data: level, error: levelError } = await supabase
    .from("levels")
    .select("id")
    .eq("id", levelId)
    .maybeSingle();

  if (levelError) {
    throw new Error(levelError.message);
  }

  if (!level) {
    throw new Error("Selected level was not found.");
  }

  const { data: term, error: termError } = await supabase
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
}

export async function createRegistrationCode(
  formData: FormData,
): Promise<void> {
  const { supabase, userId } = await requireSuperAdmin();

  const code = await generateUniqueRegistrationCode(supabase);
  const studentId = normalize(formData.get("student_id"));
  const departmentId = normalize(formData.get("department_id"));
  const batchId = normalize(formData.get("batch_id"));
  const levelId = normalize(formData.get("level_id"));
  const termId = normalize(formData.get("term_id"));
  const maxUsesValue = normalize(formData.get("max_uses"));
  const expiresAt = normalize(formData.get("expires_at"));

  const maxUses = Number(maxUsesValue);

  if (
    !studentId ||
    !departmentId ||
    !batchId ||
    !levelId ||
    !termId
  ) {
    throw new Error(
      "Code, student ID, department, batch, level, and term are required.",
    );
  }

  if (!Number.isInteger(maxUses) || maxUses < 1) {
    throw new Error("Maximum uses must be a whole number greater than 0.");
  }

  if (expiresAt) {
    const expiryDate = new Date(expiresAt);

    if (Number.isNaN(expiryDate.getTime())) {
      throw new Error("Invalid expiry date.");
    }

    if (expiryDate.getTime() <= Date.now()) {
      throw new Error("Expiry date must be in the future.");
    }
  }

  await validateAcademicAssignment(
    supabase,
    departmentId,
    batchId,
    levelId,
    termId,
  );

  const { data: existingCode, error: duplicateCodeError } = await supabase
    .from("registration_codes")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (duplicateCodeError) {
    throw new Error(duplicateCodeError.message);
  }

  if (existingCode) {
    throw new Error("This registration code already exists.");
  }

  const { error } = await supabase.from("registration_codes").insert({
    code,
    role_scope: "student",
    student_id: studentId,
    department_id: departmentId,
    batch_id: batchId,
    level_id: levelId,
    term_id: termId,
    max_uses: maxUses,
    used_count: 0,
    expires_at: expiresAt || null,
    created_by: userId,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("This registration code already exists.");
    }

    throw new Error(error.message);
  }

  revalidateRegistrationCodes();
}

export async function updateRegistrationCode(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const id = normalize(formData.get("id"));
  const code = normalize(formData.get("code")).toUpperCase();
  const studentId = normalize(formData.get("student_id"));
  const departmentId = normalize(formData.get("department_id"));
  const batchId = normalize(formData.get("batch_id"));
  const levelId = normalize(formData.get("level_id"));
  const termId = normalize(formData.get("term_id"));
  const maxUsesValue = normalize(formData.get("max_uses"));
  const expiresAt = normalize(formData.get("expires_at"));

  const maxUses = Number(maxUsesValue);

  if (
    !id ||
    !code ||
    !studentId ||
    !departmentId ||
    !batchId ||
    !levelId ||
    !termId
  ) {
    throw new Error(
      "Code ID, code, student ID, department, batch, level, and term are required.",
    );
  }

  if (!Number.isInteger(maxUses) || maxUses < 1) {
    throw new Error("Maximum uses must be a whole number greater than 0.");
  }

  if (expiresAt) {
    const expiryDate = new Date(expiresAt);

    if (Number.isNaN(expiryDate.getTime())) {
      throw new Error("Invalid expiry date.");
    }

    if (expiryDate.getTime() <= Date.now()) {
      throw new Error("Expiry date must be in the future.");
    }
  }

  await validateAcademicAssignment(
    supabase,
    departmentId,
    batchId,
    levelId,
    termId,
  );

  const { data: currentCode, error: currentCodeError } = await supabase
    .from("registration_codes")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (currentCodeError) {
    throw new Error(currentCodeError.message);
  }

  if (!currentCode) {
    throw new Error("Registration code not found.");
  }

  const { data: duplicateCode, error: duplicateCodeError } = await supabase
    .from("registration_codes")
    .select("id")
    .eq("code", code)
    .neq("id", id)
    .maybeSingle();

  if (duplicateCodeError) {
    throw new Error(duplicateCodeError.message);
  }

  if (duplicateCode) {
    throw new Error("This registration code already exists.");
  }

  const { error } = await supabase
    .from("registration_codes")
    .update({
      code,
      role_scope: "student",
      student_id: studentId,
      department_id: departmentId,
      batch_id: batchId,
      level_id: levelId,
      term_id: termId,
      max_uses: maxUses,
      expires_at: expiresAt || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("This registration code already exists.");
    }

    throw new Error(error.message);
  }

  revalidateRegistrationCodes();
}

export async function toggleRegistrationCode(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Registration code ID is required.");
  }

  const { data: currentCode, error: currentCodeError } = await supabase
    .from("registration_codes")
    .select("id, is_active, used_count, max_uses, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (currentCodeError) {
    throw new Error(currentCodeError.message);
  }

  if (!currentCode) {
    throw new Error("Registration code not found.");
  }

  const isExpired =
    currentCode.expires_at !== null &&
    new Date(currentCode.expires_at).getTime() <= Date.now();

  const isUsedUp = currentCode.used_count >= currentCode.max_uses;

  if (isExpired) {
    throw new Error("This registration code has expired.");
  }

  if (isUsedUp) {
    throw new Error(
      "This registration code has reached its maximum number of uses.",
    );
  }

  const { error } = await supabase
    .from("registration_codes")
    .update({
      is_active: !currentCode.is_active,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateRegistrationCodes();
}

export async function deleteRegistrationCode(
  formData: FormData,
): Promise<void> {
  const { supabase } = await requireSuperAdmin();

  const id = normalize(formData.get("id"));

  if (!id) {
    throw new Error("Registration code ID is required.");
  }

  const { data: currentCode, error: currentCodeError } = await supabase
    .from("registration_codes")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (currentCodeError) {
    throw new Error(currentCodeError.message);
  }

  if (!currentCode) {
    throw new Error("Registration code not found.");
  }

  const { error } = await supabase
    .from("registration_codes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Unable to delete registration code: ${error.message}`);
  }

  revalidateRegistrationCodes();
}


