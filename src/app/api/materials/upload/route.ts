import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "txt",
  "jpg",
  "jpeg",
  "png",
]);

const BLOCKED_EXTENSIONS = new Set(["xls", "xlsx"]);

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function getVerifiedStudent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: jsonError("You must be logged in to upload a material.", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_verified, upload_disabled")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { supabase, user: null, error: jsonError("Student profile could not be found.", 403) };
  }

  if (profile.role !== "student") {
    return { supabase, user: null, error: jsonError("Only students can use this upload form.", 403) };
  }

  if (!profile.is_verified) {
    return { supabase, user: null, error: jsonError("Your student account is not verified yet.", 403) };
  }

  if (profile.upload_disabled) {
    return {
      supabase,
      user: null,
      error: jsonError("Material upload is currently disabled for your account.", 403),
    };
  }

  return { supabase, user, error: null };
}

function validateFileMetadata(
  fileName: string,
  fileSize: number,
) {
  if (!fileName.trim()) {
    return "Please select a file.";
  }

  if (fileSize <= 0) {
    return "The selected file is empty.";
  }

  if (fileSize > MAX_FILE_SIZE) {
    return "File size cannot exceed 100 MB.";
  }

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!extension) {
    return "File extension could not be detected.";
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return "Excel files (.xls/.xlsx) are not allowed for academic materials.";
  }

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return "Unsupported file type. Allowed types: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG and PNG.";
  }

  return null;
}

function createStoragePath(
  subject: {
    id: string;
    department_id: string;
    level_id: string;
    term_id: string;
  },
  materialId: string,
  originalName: string,
) {
  const extension = originalName.split(".").pop()?.toLowerCase() ?? "bin";

  const safeBaseName =
    originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120) || "material";

  const safeFileName = `${safeBaseName}-${materialId}.${extension}`;

  return [
    subject.department_id,
    subject.level_id,
    subject.term_id,
    subject.id,
    materialId,
    safeFileName,
  ].join("/");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const action = body?.action ?? "prepare";

    const auth = await getVerifiedStudent();

    if (auth.error || !auth.user) {
      return auth.error;
    }

    const { supabase, user } = auth;

    if (action !== "prepare" && action !== "finalize") {
      return jsonError("Invalid upload action.");
    }

    const subjectId = String(body.subject_id ?? "").trim();
    const title = String(body.title ?? "").trim();
    const descriptionValue = String(body.description ?? "").trim();
    const topicValue = String(body.topic ?? "").trim();
    const fileName = String(body.file_name ?? "").trim();
    const fileType = String(body.file_type ?? "").trim() || "application/octet-stream";
    const fileSize = Number(body.file_size ?? 0);

    if (!subjectId) {
      return jsonError("Please select a subject.");
    }

    if (!title) {
      return jsonError("Material title is required.");
    }

    if (title.length > 200) {
      return jsonError("Material title is too long.");
    }

    if (descriptionValue.length > 5000) {
      return jsonError("Description is too long.");
    }

    if (topicValue.length > 300) {
      return jsonError("Topic is too long.");
    }

    const fileValidationError = validateFileMetadata(fileName, fileSize);

    if (fileValidationError) {
      return jsonError(fileValidationError);
    }

    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, department_id, level_id, term_id")
      .eq("id", subjectId)
      .single();

    if (subjectError || !subject) {
      return jsonError("Selected subject was not found.");
    }

    const materialId = String(body.material_id ?? "").trim() || randomUUID();

    const filePath =
      String(body.file_path ?? "").trim() ||
      createStoragePath(subject, materialId, fileName);

    const expectedPrefix = [
      subject.department_id,
      subject.level_id,
      subject.term_id,
      subject.id,
      materialId,
    ].join("/");

    if (!filePath.startsWith(`${expectedPrefix}/`)) {
      return jsonError("Invalid storage file path.");
    }

    if (action === "prepare") {
      return NextResponse.json({
        success: true,
        materialId,
        filePath,
        message: "Upload preparation successful.",
      });
    }

    const { data: material, error: materialError } = await supabase
      .from("materials")
      .insert({
        id: materialId,
        uploader_id: user.id,
        subject_id: subject.id,
        department_id: subject.department_id,
        level_id: subject.level_id,
        term_id: subject.term_id,
        title,
        description: descriptionValue || null,
        topic: topicValue || null,
        keywords: [],
        file_path: filePath,
        file_type: fileType,
        file_size_bytes: fileSize,
        status: "pending",
      })
      .select("id, title, status, file_path, created_at")
      .single();

    if (materialError || !material) {
      console.error("Material database insert error:", materialError);

      await supabase.storage
        .from("academic-materials")
        .remove([filePath]);

      return NextResponse.json(
        { error: materialError?.message ?? "Material could not be saved." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Material submitted successfully. It is now pending review.",
        material,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Material upload unexpected error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred during upload." },
      { status: 500 },
    );
  }
}
