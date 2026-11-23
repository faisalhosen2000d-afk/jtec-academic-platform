import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import {
  createB2UploadPresignedUrl,
  isB2Configured,
  removeMaterialObject,
} from "@/lib/material-storage";

function getRawClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createRawSupabaseClient(url, key);
}

async function getStorageProvider(): Promise<"b2" | "supabase"> {
  try {
    const raw = getRawClient();
    const { data } = await raw
      .from("platform_settings")
      .select("material_storage_provider")
      .eq("id", 1)
      .maybeSingle();
    const prov = (data as { material_storage_provider?: string } | null)?.material_storage_provider;
    return prov === "supabase" ? "supabase" : "b2";
  } catch {
    return "b2";
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("id, role, is_verified, department_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 403 });
    }

    const isStaff = ["admin", "super_admin", "moderator"].includes(profile.role);
    if (profile.role === "student" && !profile.is_verified) {
      return NextResponse.json({ error: "Account pending verification." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const action = String(body?.action ?? "prepare");
    if (action !== "prepare" && action !== "finalize") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const subjectId = String(body?.subject_id ?? "").trim();
    const questionType = String(body?.question_type ?? "").trim() as "previous_year" | "ct";
    const examYear = body?.exam_year ? Number(body.exam_year) : null;
    const ctNumber = body?.ct_number ? Number(body.ct_number) : null;
    const batchLabel = String(body?.batch_label ?? "").trim().slice(0, 60) || null;
    const notes = String(body?.notes ?? "").trim().slice(0, 500) || null;
    const fileSize = Number(body?.file_size ?? 0);
    const fileName = String(body?.file_name ?? "question.pdf").trim();

    if (!subjectId || !["previous_year", "ct"].includes(questionType)) {
      return NextResponse.json({ error: "Subject and question type are required." }, { status: 400 });
    }

    if (questionType === "previous_year" && (!examYear || examYear < 2005 || examYear > 2050)) {
      return NextResponse.json({ error: "Please enter a valid exam year (e.g. 2025)." }, { status: 400 });
    }

    if (questionType === "ct" && (!ctNumber || ![1, 2, 3, 4].includes(ctNumber))) {
      return NextResponse.json({ error: "Please select CT 1, CT 2, or CT 3." }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Question PDF must be between 1 byte and 50 MB." }, { status: 400 });
    }

    const rawClient = getRawClient();

    const { data: subjectRow, error: subjectErr } = await rawClient
      .from("subjects")
      .select("id, subject_code, department_id, level_id, term_id")
      .eq("id", subjectId)
      .maybeSingle();

    const subject = subjectRow as {
      id: string;
      subject_code: string;
      department_id: string;
      level_id: string;
      term_id: string;
    } | null;

    if (subjectErr || !subject) {
      return NextResponse.json(
        { error: subjectErr?.message || "Selected subject not found." },
        { status: 404 },
      );
    }

    let dupQuery = rawClient
      .from("question_bank_items")
      .select("id, status")
      .eq("department_id", subject.department_id)
      .eq("term_id", subject.term_id)
      .eq("subject_id", subject.id)
      .eq("question_type", questionType)
      .in("status", ["pending", "approved"]);

    if (questionType === "previous_year") {
      dupQuery = dupQuery.eq("exam_year", examYear);
    } else {
      dupQuery = dupQuery.eq("ct_number", ctNumber);
    }

    const { data: existing } = await dupQuery.limit(1).maybeSingle();
    if (existing) {
      const slotLabel = questionType === "previous_year" ? `Year ${examYear}` : `CT-${ctNumber}`;
      const stateText = (existing as { status?: string }).status === "approved" ? "already uploaded" : "already pending review";
      return NextResponse.json(
        { error: `${subject.subject_code} (${slotLabel}) question is ${stateText}. Duplicate uploads are not allowed.` },
        { status: 409 },
      );
    }

    const itemId = String(body?.item_id ?? "").trim() || randomUUID();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "question.pdf";
    const defaultPath = `questions/${subject.department_id}/${subject.term_id}/${subject.id}/${itemId}/${safeName}`;
    const filePath = String(body?.file_path ?? "").trim() || defaultPath;

    if (action === "prepare") {
      const storageProvider = await getStorageProvider();
      if (storageProvider === "b2" && isB2Configured()) {
        const b2Prep = await createB2UploadPresignedUrl(defaultPath, "application/pdf");
        if (b2Prep) {
          return NextResponse.json({
            success: true,
            itemId,
            filePath: b2Prep.storagePath,
            uploadUrl: b2Prep.uploadUrl,
            storageProvider: "b2",
          });
        }
      }

      return NextResponse.json({
        success: true,
        itemId,
        filePath: defaultPath,
        storageProvider: "supabase",
      });
    }

    const expectedPrefix = `questions/${subject.department_id}/${subject.term_id}/${subject.id}/${itemId}/`;
    if (!filePath.startsWith(expectedPrefix) && !filePath.startsWith(`b2://${expectedPrefix}`)) {
      return NextResponse.json({ error: "Invalid question file path." }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await rawClient
      .from("question_bank_items")
      .insert({
        id: itemId,
        uploader_id: user.id,
        department_id: subject.department_id,
        level_id: subject.level_id,
        term_id: subject.term_id,
        subject_id: subject.id,
        subject_code: subject.subject_code,
        question_type: questionType,
        exam_year: questionType === "previous_year" ? examYear : null,
        ct_number: questionType === "ct" ? ctNumber : null,
        batch_label: batchLabel,
        notes,
        file_path: filePath,
        file_type: "application/pdf",
        file_size_bytes: fileSize,
        share_across_depts: true,
        status: isStaff ? "approved" : "pending",
        reviewed_by: isStaff ? user.id : null,
        reviewed_at: isStaff ? new Date().toISOString() : null,
      })
      .select("id, status")
      .single();

    if (insertError || !inserted) {
      await removeMaterialObject(serviceSupabase, filePath);
      return NextResponse.json(
        { error: insertError?.message || "Could not save question paper." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      item: inserted,
      message: isStaff
        ? "Question published directly to Question Bank!"
        : "Question submitted for admin approval!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Question upload failed." },
      { status: 500 },
    );
  }
}