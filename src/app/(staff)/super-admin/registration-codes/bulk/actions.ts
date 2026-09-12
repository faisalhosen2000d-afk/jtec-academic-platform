"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type StudentRow = {
  roll?: string;
  student_id: string;
  name: string;
};

type AcademicAssignment = {
  departmentId: string;
  batchId: string;
  levelId: string;
  termId: string;
};

type GeneratedRegistration = {
  roll: string;
  student_id: string;
  name: string;
  code: string;
};

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
    throw new Error("Only Super Admin can perform this action.");
  }

  return {
    supabase,
    userId: userData.user.id,
  };
}

async function validateAcademicAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignment: AcademicAssignment,
) {
  const [
    { data: department, error: departmentError },
    { data: batch, error: batchError },
    { data: level, error: levelError },
    { data: term, error: termError },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id")
      .eq("id", assignment.departmentId)
      .maybeSingle(),

    supabase
      .from("batches")
      .select("id")
      .eq("id", assignment.batchId)
      .maybeSingle(),

    supabase
      .from("levels")
      .select("id, sort_order")
      .eq("id", assignment.levelId)
      .maybeSingle(),

    supabase
      .from("terms")
      .select("id, level_id, sort_order")
      .eq("id", assignment.termId)
      .maybeSingle(),
  ]);

  if (departmentError) {
    throw new Error(departmentError.message);
  }

  if (batchError) {
    throw new Error(batchError.message);
  }

  if (levelError) {
    throw new Error(levelError.message);
  }

  if (termError) {
    throw new Error(termError.message);
  }

  if (!department) {
    throw new Error("Invalid department.");
  }

  if (!batch) {
    throw new Error("Invalid batch.");
  }

  if (!level) {
    throw new Error("Invalid level.");
  }

  if (level.sort_order < 1 || level.sort_order > 4) {
    throw new Error(
      "Invalid level. Only Level 1 to Level 4 are allowed.",
    );
  }

  if (!term) {
    throw new Error("Invalid term.");
  }

  if (term.level_id !== level.id) {
    throw new Error(
      "Selected term does not belong to the selected level.",
    );
  }

  if (term.sort_order < 1 || term.sort_order > 2) {
    throw new Error(
      "Invalid term. Only Term 1 and Term 2 are allowed.",
    );
  }
}

function generateRegistrationCode() {
  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

  throw new Error(
    "Unable to generate a unique registration code. Please try again.",
  );
}

export async function bulkCreateRegistrationCodes(
  formData: FormData,
) {
  const { supabase, userId } = await requireSuperAdmin();

  const departmentId = String(
    formData.get("department_id") ?? "",
  ).trim();

  const batchId = String(
    formData.get("batch_id") ?? "",
  ).trim();

  const levelId = String(
    formData.get("level_id") ?? "",
  ).trim();

  const termId = String(
    formData.get("term_id") ?? "",
  ).trim();

  const studentsRaw = String(
    formData.get("students") ?? "",
  ).trim();

  if (!departmentId || !batchId || !levelId || !termId) {
    throw new Error(
      "Department, Batch, Level, and Term are required.",
    );
  }

  if (!studentsRaw) {
    throw new Error("Student list is required.");
  }

  let students: StudentRow[];

  try {
    const parsed: unknown = JSON.parse(studentsRaw);

    if (!Array.isArray(parsed)) {
      throw new Error("Student list must be an array.");
    }

    students = parsed as StudentRow[];
  } catch {
    throw new Error("Invalid student list data.");
  }

  if (students.length === 0) {
    throw new Error("Student list is empty.");
  }

  if (students.length > 1000) {
    throw new Error(
      "Maximum 1000 students can be processed at once.",
    );
  }

  const normalizedStudents = students.map((student, index) => {
    const studentId = String(
      student.student_id ?? "",
    ).trim();

    const name = String(
      student.name ?? "",
    ).trim();

    const roll = String(
      student.roll ?? "",
    ).trim();

    if (!studentId) {
      throw new Error(
        `Student ID is missing at row ${index + 1}.`,
      );
    }

    if (!name) {
      throw new Error(
        `Student name is missing at row ${index + 1}.`,
      );
    }

    return {
      student_id: studentId,
      name,
      roll,
    };
  });

  const duplicateStudentIds = normalizedStudents
    .map((student) => student.student_id)
    .filter(
      (studentId, index, all) =>
        all.indexOf(studentId) !== index,
    );

  if (duplicateStudentIds.length > 0) {
    const uniqueDuplicates = Array.from(
      new Set(duplicateStudentIds),
    );

    throw new Error(
      `Duplicate Student ID found: ${uniqueDuplicates.join(", ")}`,
    );
  }

  await validateAcademicAssignment(supabase, {
    departmentId,
    batchId,
    levelId,
    termId,
  });

  const studentIds = normalizedStudents.map(
    (student) => student.student_id,
  );

  const {
    data: existingCodes,
    error: existingCodesError,
  } = await supabase
    .from("registration_codes")
    .select("student_id")
    .in("student_id", studentIds);

  if (existingCodesError) {
    throw new Error(existingCodesError.message);
  }

  const existingStudentIds = new Set(
    (existingCodes ?? []).map(
      (registrationCode) =>
        registrationCode.student_id,
    ),
  );

  const alreadyRegistered = normalizedStudents
    .filter((student) =>
      existingStudentIds.has(student.student_id),
    )
    .map((student) => student.student_id);

  if (alreadyRegistered.length > 0) {
    throw new Error(
      `Registration code already exists for Student ID: ${alreadyRegistered.join(", ")}`,
    );
  }

  const registrationCodes = [];
  const generatedRegistrations: GeneratedRegistration[] =
    [];

  for (const student of normalizedStudents) {
    const code =
      await generateUniqueRegistrationCode(
        supabase,
      );

    registrationCodes.push({
      code,
      role_scope: "student",
      department_id: departmentId,
      batch_id: batchId,
      level_id: levelId,
      term_id: termId,
      max_uses: 1,
      used_count: 0,
      expires_at: null,
      created_by: userId,
      is_active: true,
      student_id: student.student_id,
    });

    generatedRegistrations.push({
      roll: student.roll ?? "",
      student_id: student.student_id,
      name: student.name,
      code,
    });
  }

  const { error: insertError } = await supabase
    .from("registration_codes")
    .insert(registrationCodes);

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath(
    "/super-admin/registration-codes",
  );

  revalidatePath(
    "/super-admin/registration-codes/bulk",
  );

  revalidatePath(
    "/super-admin/registration-codes/manage",
  );

  return {
    success: true,
    count: generatedRegistrations.length,
    registrations: generatedRegistrations,
  };
}