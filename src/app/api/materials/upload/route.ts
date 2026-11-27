import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  createB2UploadPresignedUrl,
  createR2UploadPresignedUrl,
  removeMaterialObject,
  resolveTargetStorageProvider,
} from "@/lib/material-storage";
import { getActivePlatformSettings } from "@/lib/platform-settings";
import { getTodayB2BandwidthStatus } from "@/lib/b2-bandwidth";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isSafeStoragePath(filePath: string, expectedPrefix: string): boolean {
  if (!filePath || filePath.includes("\0") || filePath.includes("\\")) {
    return false;
  }

  const lower = filePath.toLowerCase();
  if (
    filePath.includes("..") ||
    lower.includes("%2e") ||
    lower.includes("%2f") ||
    lower.includes("%5c")
  ) {
    return false;
  }

  const normalizedPath = filePath.startsWith("r2://")
    ? filePath.slice("r2://".length)
    : filePath.startsWith("b2://")
      ? filePath.slice("b2://".length)
      : filePath;

  const prefixWithSlash = `${expectedPrefix}/`;
  if (!normalizedPath.startsWith(prefixWithSlash)) {
    return false;
  }

  const fileNamePart = normalizedPath.slice(prefixWithSlash.length);

  if (!fileNamePart || fileNamePart.includes("/")) {
    return false;
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(fileNamePart)) {
    return false;
  }

  const ext = fileNamePart.split(".").pop()?.toLowerCase() ?? "";
  if (!ext || BLOCKED_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
    return false;
  }

  return true;
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function getVerifiedStudent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      error: jsonError("You must be logged in to upload a material.", 401),
    };
  }

  const rl = await checkRateLimit({
    key: `materials-upload:${user.id}`,
    limit: 25,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return {
      supabase,
      user: null,
      error: rateLimitExceededResponse(rl.retryAfterSeconds),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_verified, upload_disabled")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      supabase,
      user: null,
      error: jsonError("Student profile could not be found.", 403),
    };
  }

  if (profile.role !== "student") {
    return {
      supabase,
      user: null,
      error: jsonError("Only students can use this upload form.", 403),
    };
  }

  if (!profile.is_verified) {
    return {
      supabase,
      user: null,
      error: jsonError("Your student account is not verified yet.", 403),
    };
  }

  if (profile.upload_disabled) {
    return {
      supabase,
      user: null,
      error: jsonError(
        "Material upload is currently disabled for your account.",
        403,
      ),
    };
  }

  return { supabase, user, error: null };
}

function validateFileMetadata(
  fileName: string,
  fileSize: number,
  maxBytes: number,
  maxMb: number,
) {
  if (!fileName.trim()) {
    return "Please select a file.";
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return "The selected file is empty.";
  }

  if (fileSize > maxBytes) {
    return `File size cannot exceed ${maxMb} MB.`;
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON request body.");
    }

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
    const fileType =
      String(body.file_type ?? "").trim() || "application/octet-stream";
    const fileSize = Number(body.file_size ?? 0);
    const fileHash = String(body.file_hash ?? "").trim().toLowerCase();

    if (!subjectId) return jsonError("Please select a subject.");
    if (!title) return jsonError("Material title is required.");
    if (title.length > 200) return jsonError("Material title is too long.");
    if (descriptionValue.length > 5000) return jsonError("Description is too long.");
    if (topicValue.length > 300) return jsonError("Topic is too long.");

    const platformSettings = await getActivePlatformSettings();
    const maxMb = platformSettings.max_upload_size_mb || 100;
    const maxBytes = maxMb * 1024 * 1024;

    const fileValidationError = validateFileMetadata(
      fileName,
      fileSize,
      maxBytes,
      maxMb,
    );
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

    let materialId: string;
    let filePath: string;

    if (action === "prepare") {
      materialId = randomUUID();
      filePath = createStoragePath(subject, materialId, fileName);
    } else {
      const requestedMaterialId = String(body.material_id ?? "").trim();
      if (!isValidUuid(requestedMaterialId)) {
        return jsonError("Invalid material ID.");
      }
      materialId = requestedMaterialId;

      const requestedFilePath = String(body.file_path ?? "").trim();
      const expectedPrefix = [
        subject.department_id,
        subject.level_id,
        subject.term_id,
        subject.id,
        materialId,
      ].join("/");

      if (!isSafeStoragePath(requestedFilePath, expectedPrefix)) {
        return jsonError("Invalid storage file path.");
      }

      filePath = requestedFilePath;
    }

    if (fileHash && !/^[a-f0-9]{64}$/.test(fileHash)) {
      return jsonError("Invalid file fingerprint.");
    }

    if (fileHash) {
      const serviceSupabase = createServiceRoleClient();
      const { data: existingDuplicate } = await serviceSupabase
        .from("materials")
        .select("id, title, status")
        .eq("file_hash", fileHash)
        .in("status", ["approved", "pending"])
        .limit(1)
        .maybeSingle();

      if (existingDuplicate) {
        return NextResponse.json(
          {
            error: `This exact file has already been uploaded ("${existingDuplicate.title}"). Duplicate files are not allowed.`,
          },
          { status: 409 },
        );
      }
    }

    if (action === "prepare") {
      const b2Bandwidth = await getTodayB2BandwidthStatus().catch(() => null);
      const resolved = await resolveTargetStorageProvider({
        rule: platformSettings.storage_routing_rules.materials,
        fileSizeBytes: fileSize,
        b2DailyBandwidthPercent: b2Bandwidth?.percentUsed ?? 0,
      });

      if (resolved.provider === "r2") {
        const r2Prep = await createR2UploadPresignedUrl(filePath, fileType);
        if (!r2Prep) {
          return NextResponse.json(
            { error: "Cloudflare R2 could not prepare upload URL." },
            { status: 500 },
          );
        }
        return NextResponse.json({
          success: true,
          materialId,
          filePath: r2Prep.storagePath,
          uploadUrl: r2Prep.uploadUrl,
          storageProvider: "r2",
          routingReason: resolved.reason,
          fallbackTriggered: resolved.fallbackTriggered,
          message: "Upload preparation successful.",
        });
      }

      if (resolved.provider === "b2") {
        const b2Prep = await createB2UploadPresignedUrl(filePath, fileType);
        if (!b2Prep) {
          return NextResponse.json(
            { error: "Backblaze B2 could not prepare upload URL." },
            { status: 500 },
          );
        }
        return NextResponse.json({
          success: true,
          materialId,
          filePath: b2Prep.storagePath,
          uploadUrl: b2Prep.uploadUrl,
          storageProvider: "b2",
          routingReason: resolved.reason,
          fallbackTriggered: resolved.fallbackTriggered,
          message: "Upload preparation successful.",
        });
      }

      return NextResponse.json({
        success: true,
        materialId,
        filePath,
        storageProvider: "supabase",
        routingReason: resolved.reason,
        fallbackTriggered: resolved.fallbackTriggered,
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
        file_hash: fileHash || null,
        status: "pending",
      })
      .select("id, title, status, file_path, created_at")
      .single();

    if (materialError || !material) {
      console.error("Material database insert error:", materialError);
      await removeMaterialObject(createServiceRoleClient(), filePath);

      return NextResponse.json(
        { error: "Material could not be saved." },
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