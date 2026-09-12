import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

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

const BLOCKED_EXTENSIONS = new Set([
  "xls",
  "xlsx",
]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // --------------------------------------------------
    // 1. Authentication
    // --------------------------------------------------

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to upload a material." },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // 2. Get student's profile
    // --------------------------------------------------

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id,
        role,
        is_verified,
        upload_disabled
      `)
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Student profile could not be found." },
        { status: 403 }
      );
    }

    if (profile.role !== "student") {
      return NextResponse.json(
        { error: "Only students can use this upload form." },
        { status: 403 }
      );
    }

    if (!profile.is_verified) {
      return NextResponse.json(
        { error: "Your student account is not verified yet." },
        { status: 403 }
      );
    }

    if (profile.upload_disabled) {
      return NextResponse.json(
        { error: "Material upload is currently disabled for your account." },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // 3. Read multipart form data
    // --------------------------------------------------

    const formData = await request.formData();

    const subjectId = String(
      formData.get("subject_id") ?? ""
    ).trim();

    const title = String(
      formData.get("title") ?? ""
    ).trim();

    const descriptionValue = String(
      formData.get("description") ?? ""
    ).trim();

    const topicValue = String(
      formData.get("topic") ?? ""
    ).trim();

    const file = formData.get("file");

    // --------------------------------------------------
    // 4. Validate basic fields
    // --------------------------------------------------

    if (!subjectId) {
      return NextResponse.json(
        { error: "Please select a subject." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Material title is required." },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Material title is too long." },
        { status: 400 }
      );
    }

    if (descriptionValue.length > 5000) {
      return NextResponse.json(
        { error: "Description is too long." },
        { status: 400 }
      );
    }

    if (topicValue.length > 300) {
      return NextResponse.json(
        { error: "Topic is too long." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 5. Validate file
    // --------------------------------------------------

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a file." },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "The selected file is empty." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size cannot exceed 100 MB." },
        { status: 400 }
      );
    }

    const originalName = file.name.trim();

    const extension =
      originalName.split(".").pop()?.toLowerCase() ?? "";

    if (!extension) {
      return NextResponse.json(
        { error: "File extension could not be detected." },
        { status: 400 }
      );
    }

    // Explicitly block Excel files.
    if (BLOCKED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        {
          error:
            "Excel files (.xls/.xlsx) are not allowed for academic materials.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed types: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG and PNG.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 6. Verify subject exists
    // --------------------------------------------------

    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select(`
        id,
        department_id,
        level_id,
        term_id
      `)
      .eq("id", subjectId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json(
        { error: "Selected subject was not found." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 7. Generate material ID
    // --------------------------------------------------

    const materialId = randomUUID();

    // Sanitize filename.
    const safeBaseName =
      originalName
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 120) || "material";

    const safeFileName =
      `${safeBaseName}-${materialId}.${extension}`;

    // Architecture-required storage path:
    //
    // academic-materials/
    //   {department_id}/
    //   {level_id}/
    //   {term_id}/
    //   {subject_id}/
    //   {material_id}/
    //   {filename}
    //

    const filePath = [
      subject.department_id,
      subject.level_id,
      subject.term_id,
      subject.id,
      materialId,
      safeFileName,
    ].join("/");

    // --------------------------------------------------
    // 8. Upload file to private Storage bucket
    // --------------------------------------------------

    const { error: storageError } = await supabase.storage
      .from("academic-materials")
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageError) {
      console.error(
        "Material storage upload error:",
        storageError
      );

      return NextResponse.json(
        {
          error:
            "The file could not be uploaded to storage.",
          details: storageError.message,
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 9. Create materials database row
    // --------------------------------------------------

    const { data: material, error: materialError } =
      await supabase
        .from("materials")
        .insert({
          id: materialId,
          uploader_id: user.id,

          subject_id: subject.id,

          // IMPORTANT:
          // materials table requires these three fields.
          // They come directly from the selected subject.
          department_id: subject.department_id,
          level_id: subject.level_id,
          term_id: subject.term_id,

          title,
          description: descriptionValue || null,
          topic: topicValue || null,
          keywords: [],

          file_path: filePath,
          file_type:
            file.type || "application/octet-stream",
          file_size_bytes: file.size,

          status: "pending",
        })
        .select(`
          id,
          title,
          status,
          file_path,
          created_at
        `)
        .single();

    // --------------------------------------------------
    // 10. Roll back Storage if DB insert fails
    // --------------------------------------------------

    if (materialError || !material) {
      console.error(
        "Material database insert error:",
        materialError
      );

      await supabase.storage
        .from("academic-materials")
        .remove([filePath]);

      return NextResponse.json(
        {
          error:
            materialError?.message ??
            "Material could not be saved.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 11. Success
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message:
          "Material submitted successfully. It is now pending review.",
        material,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Material upload unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred during upload.",
      },
      { status: 500 }
    );
  }
}