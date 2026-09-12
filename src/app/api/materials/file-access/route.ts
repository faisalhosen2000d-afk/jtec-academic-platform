import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type FileAccessRequest = {
  materialId: string;
  action: "open" | "download";
};

function isValidUuid(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidRequest(value: unknown): value is FileAccessRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;

  return (
    isValidUuid(body.materialId) &&
    (body.action === "open" || body.action === "download")
  );
}

export async function POST(request: Request) {
  try {
    /*
     * 1. Get the actual authenticated browser user.
     */
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[file-access][auth]", {
      userId: user?.id ?? null,
      email: user?.email ?? null,
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is required.",
        },
        { status: 401 }
      );
    }

    /*
     * 2. Parse request.
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (!isValidRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file access request.",
        },
        { status: 400 }
      );
    }

    /*
     * 3. Use trusted server client for profile verification.
     */
    const serviceSupabase = createServiceRoleClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, role, is_verified, student_id, email")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[file-access][profile]", {
      authUserId: user.id,
      profileId: profile?.id ?? null,
      role: profile?.role ?? null,
      isVerified: profile?.is_verified ?? null,
      studentId: profile?.student_id ?? null,
      profileEmail: profile?.email ?? null,
      error: profileError?.message ?? null,
    });

    if (profileError) {
      console.error(
        "[api/materials/file-access][profile]",
        profileError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your account.",
        },
        { status: 500 }
      );
    }

    /*
     * 4. Student authorization.
     */
    if (
      !profile ||
      profile.role !== "student" ||
      profile.is_verified !== true
    ) {
      console.error("[file-access][authorization-failed]", {
        authUserId: user.id,
        profileId: profile?.id ?? null,
        role: profile?.role ?? null,
        isVerified: profile?.is_verified ?? null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Only verified students can access approved materials.",
        },
        { status: 403 }
      );
    }

    /*
     * 5. Load the material.
     */
    const { data: material, error: materialError } =
      await serviceSupabase
        .from("materials")
        .select("id, status, file_path")
        .eq("id", body.materialId)
        .maybeSingle();

    if (materialError) {
      console.error(
        "[api/materials/file-access][material]",
        materialError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load the material.",
        },
        { status: 500 }
      );
    }

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: "Material could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * 6. Students can access approved materials only.
     */
    if (material.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          error: "This material is not currently available.",
        },
        { status: 403 }
      );
    }

    /*
     * 7. Storage path must exist.
     */
    if (!material.file_path) {
      return NextResponse.json(
        {
          success: false,
          error: "The material file is not available.",
        },
        { status: 404 }
      );
    }

    /*
     * 8. Generate a short-lived signed URL.
     *
     * Bucket remains private.
     */
    const { data: signedUrlData, error: signedUrlError } =
      await serviceSupabase.storage
        .from("academic-materials")
        .createSignedUrl(material.file_path, 300, { download: body.action === "download" });

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(
        "[api/materials/file-access][signed-url]",
        signedUrlError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to create secure access to the material file.",
        },
        { status: 500 }
      );
    }

    /*
     * 9. Log view.
     */
    if (body.action === "open") {
      const { error: logError } = await supabase
        .from("material_view_logs")
        .insert({
          material_id: material.id,
          student_id: user.id,
        });

      if (logError) {
        console.error(
          "[api/materials/file-access][view-log]",
          logError
        );
      }
    }

    /*
     * 10. Log download.
     */
    if (body.action === "download") {
      const { error: logError } = await supabase
        .from("material_download_logs")
        .insert({
          material_id: material.id,
          student_id: user.id,
        });

      if (logError) {
        console.error(
          "[api/materials/file-access][download-log]",
          logError
        );
      }
    }

    /*
     * 11. Return temporary signed URL.
     */
    return NextResponse.json(
      {
        success: true,
        action: body.action,
        url: signedUrlData.signedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/materials/file-access]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The material file could not be accessed.",
      },
      { status: 500 }
    );
  }
}