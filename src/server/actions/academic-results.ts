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
  level_term_key?: string;
  results: StudentResultEntry[];
  missing_decisions?: MissingStudentDecision[];
}

export async function verifyMissingStudentsForBatch(input: {
  department_id: string;
  batch_id: string;
  level_term_key?: string;
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const adminClient = createRawSupabaseClient(supabaseUrl, serviceKey);

  // 1. Fetch registered student profiles in this batch
  const { data: registeredStudents } = await adminClient
    .from("profiles")
    .select("id, full_name, student_id, email, batch_id, department_id")
    .eq("role", "student")
    .eq("department_id", input.department_id)
    .eq("batch_id", input.batch_id);

  // 2. Fetch ALL term_results & air_drop_history to exclude anyone already air-dropped in an earlier term
  const [{ data: allBatchTermRows }, { data: dropHistoryRows }] = await Promise.all([
    adminClient
      .from("term_results")
      .select("student_id, student_id_code, status, level_term_key")
      .eq("department_id", input.department_id)
      .eq("batch_id", input.batch_id),
    adminClient
      .from("student_air_drop_history")
      .select("student_id_code, dropped_roll, previous_batch_id, dropped_at_level_term, dropped_term"),
  ]);

  const alreadyDroppedRolls = new Set<string>();
  (allBatchTermRows || []).forEach((r) => {
    if (r.status === "air_dropped" && (!input.level_term_key || r.level_term_key !== input.level_term_key)) {
      const rl = (r.student_id_code || "").trim().toLowerCase();
      if (rl) alreadyDroppedRolls.add(rl);
    }
  });
  (dropHistoryRows || []).forEach((d: { student_id_code?: string; dropped_roll?: string; dropped_at_level_term?: string; dropped_term?: string }) => {
    const rl = (d.student_id_code || d.dropped_roll || "").trim().toLowerCase();
    const dTerm = d.dropped_at_level_term || d.dropped_term;
    if (rl && (!input.level_term_key || !dTerm || dTerm !== input.level_term_key)) {
      alreadyDroppedRolls.add(rl);
    }
  });

  const rosterMap = new Map<string, { id?: string; student_id: string; full_name?: string }>();

  // Add previously known sheet rolls (only if NOT already air-dropped)
  (allBatchTermRows || []).forEach((r) => {
    if (r.status === "air_dropped") return;
    const roll = (r.student_id_code || "").trim();
    const rollLower = roll.toLowerCase();
    if (roll && !alreadyDroppedRolls.has(rollLower)) {
      rosterMap.set(rollLower, {
        id: r.student_id || undefined,
        student_id: roll,
        full_name: "Roll " + roll,
      });
    }
  });

  // Overwrite with real profile names if registered (and not already dropped)
  (registeredStudents || []).forEach((s) => {
    if (s.student_id) {
      const roll = s.student_id.trim();
      const rollLower = roll.toLowerCase();
      if (!alreadyDroppedRolls.has(rollLower)) {
        rosterMap.set(rollLower, {
          id: s.id,
          student_id: roll,
          full_name: s.full_name || "Roll " + roll,
        });
      }
    }
  });

  const presentNormalized = input.present_student_ids.map((s) => s.trim().replace(/\.0+$/, "").toLowerCase());

  // Detect missing students who were in the roster but omitted from this current term sheet!
  const missingStudents: Array<{ id: string; full_name: string; student_id: string; email: string }> = [];

  rosterMap.forEach((studentInfo, rollKey) => {
    if (!presentNormalized.includes(rollKey)) {
      missingStudents.push({
        id: studentInfo.id || "unregistered_" + studentInfo.student_id,
        full_name: studentInfo.full_name || "Roll " + studentInfo.student_id,
        student_id: studentInfo.student_id,
        email: studentInfo.id ? "Registered Student" : "Unregistered Sheet Roll",
      });
    }
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

  // Recursive Next Junior Batch lookup: find the next batch in chronological order
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
      const getBatchNum = (name: string) => parseInt(name.replace(/\D/g, ""), 10) || 0;
      const sortedBatches = [...allBatches].sort((a, b) => getBatchNum(a.name) - getBatchNum(b.name));
      const currNum = getBatchNum(currentBatch.name);
      const found = sortedBatches.find((b) => b.id !== currentBatch.id && getBatchNum(b.name) > currNum);
      nextJuniorBatchId = found ? found.id : sortedBatches[sortedBatches.length - 1]?.id || null;
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
    const rawRoll = entry.student_id_string.trim().replace(/\.0+$/, "");
    const cleanId = rawRoll.toLowerCase();
    const profileId = studentMap.get(cleanId) || null;

    const cgpaVal = input.level_term_key === "1-1" ? (entry.cgpa ?? null) : (entry.cgpa ?? entry.gpa);
    const retakes = entry.term_retake_count || 0;
    const status = retakes > 0 ? "promoted_with_retake" : "passed";
    const cleanRemarks = entry.retake_subjects ? "Retakes: " + entry.retake_subjects : null;

    termResultsPayload.push({
      student_id: profileId,
      student_id_code: rawRoll,
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
      .upsert(termResultsPayload, { onConflict: "student_id_code,department_id,batch_id,level_term_key" });

    if (upsertErr) {
      return { error: `Failed to save results: ${upsertErr.message}` };
    }
  }

  // Process Air Drops for missing rolls
  if (input.missing_decisions && input.missing_decisions.length > 0) {
    for (const decision of input.missing_decisions) {
      if (decision.action === "air_drop") {
        const isRegistered = !decision.profile_id.startsWith("unregistered_");

        if (isRegistered && nextJuniorBatchId) {
          await adminClient
            .from("profiles")
            .update({
              batch_id: nextJuniorBatchId,
              current_level_id: input.level_id,
              current_term_id: input.term_id,
            })
            .eq("id", decision.profile_id);

          await adminClient.from("student_air_drop_history").insert({
            student_id: decision.profile_id,
            student_id_code: decision.student_id_string,
            previous_batch_id: input.batch_id,
            migrated_batch_id: nextJuniorBatchId,
            dropped_at_level_term: input.level_term_key,
            drop_reason: decision.drop_reason || "academic_failure",
            notes: decision.notes || "Omitted from official result sheet - Air Drop confirmed",
            confirmed_by: user.id,
          });
        } else if (nextJuniorBatchId) {
          // Record air drop history for unregistered student by student_id_code!
          await adminClient.from("student_air_drop_history").insert({
            student_id: null,
            student_id_code: decision.student_id_string,
            previous_batch_id: input.batch_id,
            migrated_batch_id: nextJuniorBatchId,
            dropped_at_level_term: input.level_term_key,
            drop_reason: decision.drop_reason || "academic_failure",
            notes: "Omitted from official result sheet - Unregistered Air Drop confirmed",
            confirmed_by: user.id,
          });
        }

        // Record Year Drop status in term_results so their transcript shows Year Dropped!
        await adminClient.from("term_results").upsert(
          {
            student_id: isRegistered ? decision.profile_id : null,
            student_id_code: decision.student_id_string,
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
            remarks: `Year Dropped: ${decision.drop_reason || "academic_failure"}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id_code,department_id,batch_id,level_term_key" }
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