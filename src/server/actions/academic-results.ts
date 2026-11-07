"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServerAuthClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";

export interface CourseGradeRow {
  course_code: string;
  course_title: string;
  credits: number;
  letter_grade: string;
  grade_point: number;
  is_retake?: boolean;
}

export interface StudentResultEntry {
  student_id_string: string;
  gpa: number;
  cgpa?: number | null;
  earned_credits?: number;
  term_retake_count?: number;
  retake_subjects?: string | null;
  grades?: CourseGradeRow[];
}

export interface MissingStudentDecision {
  profile_id: string;
  student_id_string: string;
  action: "air_drop" | "skip";
  drop_reason?: "academic_failure" | "missed_practical_lab" | "disciplinary" | "manual_admin";
  notes?: string;
}

export interface UploadBatchResultsInput {
  department_id: string;
  batch_id: string;
  level_id: string;
  term_id: string;
  level_term_key: string;
  results: StudentResultEntry[];
  missing_decisions?: MissingStudentDecision[];
}

export async function verifyMissingStudentsForBatch(input: {
  department_id: string;
  batch_id: string;
  present_student_ids: string[];
}) {
  const authSupabase = await createServerAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Insufficient permissions." };
  }

  const { data: registeredStudents, error } = await authSupabase
    .from("profiles")
    .select("id, full_name, student_id, email, batch_id, department_id")
    .eq("role", "student")
    .eq("department_id", input.department_id)
    .eq("batch_id", input.batch_id);

  if (error) return { error: error.message };

  const presentNormalized = input.present_student_ids.map((s) => s.trim().replace(/\.0+$/, "").toLowerCase());
  const missingStudents = (registeredStudents || []).filter((s) => {
    if (!s.student_id) return false;
    return !presentNormalized.includes(s.student_id.trim().replace(/\.0+$/, "").toLowerCase());
  });

  return { success: true, missingStudents };
}

export async function commitBatchResultsAndAirDrops(input: UploadBatchResultsInput) {
  const authSupabase = await createServerAuthClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await authSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "super_admin"].includes(profile.role)) {
    return { error: "Insufficient permissions." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const adminClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  let nextJuniorBatchId: string | null = null;
  const { data: currentBatch } = await adminClient
    .from("batches")
    .select("id, name")
    .eq("id", input.batch_id)
    .single();

  if (currentBatch) {
    const { data: allBatches } = await adminClient
      .from("batches")
      .select("id, name")
      .order("name", { ascending: true });

    if (allBatches && allBatches.length > 1) {
      const found = allBatches.find((b) => b.id !== currentBatch.id && b.name > currentBatch.name);
      nextJuniorBatchId = found ? found.id : allBatches[allBatches.length - 1]?.id || null;
    }
  }

  const { data: allStudents } = await adminClient
    .from("profiles")
    .select("id, student_id")
    .eq("role", "student");

  const studentMap = new Map<string, string>();
  (allStudents || []).forEach((s) => {
    if (s.student_id) {
      studentMap.set(s.student_id.trim().replace(/\.0+$/, "").toLowerCase(), s.id);
    }
  });

  const termResultsPayload = [];
  for (const entry of input.results) {
    const cleanId = entry.student_id_string.trim().replace(/\.0+$/, "").toLowerCase();
    const profileId = studentMap.get(cleanId);
    if (!profileId) continue;

    const cgpaVal = input.level_term_key === "1-1" ? (entry.cgpa ?? null) : (entry.cgpa ?? entry.gpa);
    const retakes = entry.term_retake_count || 0;
    const status = retakes > 0 ? "promoted_with_retake" : "passed";
    const cleanRemarks = entry.retake_subjects ? "Retakes: " + entry.retake_subjects : null;

    termResultsPayload.push({
      student_id: profileId,
      department_id: input.department_id,
      batch_id: input.batch_id,
      level_id: input.level_id,
      term_id: input.term_id,
      level_term_key: input.level_term_key,
      gpa: Number(entry.gpa.toFixed(2)),
      cgpa: cgpaVal !== null ? Number(cgpaVal.toFixed(2)) : null,
      earned_credits: entry.earned_credits || 0,
      term_retake_count: retakes,
      cumulative_retake_count: retakes,
      remarks: cleanRemarks,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  if (termResultsPayload.length > 0) {
    const { error: upsertErr } = await adminClient
      .from("term_results")
      .upsert(termResultsPayload, { onConflict: "student_id,level_id,term_id" });

    if (upsertErr) {
      return { error: `Failed to save results: ${upsertErr.message}` };
    }
  }

  if (input.missing_decisions && input.missing_decisions.length > 0 && nextJuniorBatchId) {
    for (const decision of input.missing_decisions) {
      if (decision.action === "air_drop") {
        await adminClient
          .from("profiles")
          .update({ batch_id: nextJuniorBatchId })
          .eq("id", decision.profile_id);

        await adminClient.from("student_air_drop_history").insert({
          student_id: decision.profile_id,
          previous_batch_id: input.batch_id,
          migrated_batch_id: nextJuniorBatchId,
          dropped_at_level_term: input.level_term_key,
          drop_reason: decision.drop_reason || "academic_failure",
          notes: decision.notes || "Migrated to junior batch on result upload",
          confirmed_by: user.id,
        });

        await adminClient.from("term_results").upsert(
          {
            student_id: decision.profile_id,
            department_id: input.department_id,
            batch_id: input.batch_id,
            level_id: input.level_id,
            term_id: input.term_id,
            level_term_key: input.level_term_key,
            gpa: 0.0,
            cgpa: null,
            earned_credits: 0,
            term_retake_count: 5,
            cumulative_retake_count: 5,
            status: "air_dropped",
            remarks: `Year Dropped: ${decision.drop_reason}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,level_id,term_id" }
        );
      }
    }
  }

  revalidatePath("/results");
  revalidatePath("/ranking");
  revalidatePath("/dashboard");
  revalidatePath("/admin/results/upload");

  return { success: true, count: termResultsPayload.length };
}