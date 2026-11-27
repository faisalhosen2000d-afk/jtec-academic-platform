import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createMaterialSignedUrl } from "@/lib/material-storage";
import { recordB2BandwidthUsage } from "@/lib/b2-bandwidth";

type FileAccessRequest = {
  materialId: string;
  action: "open" | "download";
};

function isValidUuid(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
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

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is required.",
        },
        { status: 401 },
      );
    }

    const rl = await checkRateLimit({
      key: `material-access:${user.id}`,
      limit: 45,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
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
        { status: 400 },
      );
    }

    if (!isValidRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file access request.",
        },
        { status: 400 },
      );
    }

    /*
     * 3. Use trusted server client for profile verification.
     */
    const serviceSupabase = createServiceRoleClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("id, role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[api/materials/file-access][profile]", profileError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your account.",
        },
        { status: 500 },
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
      console.warn("[file-access][authorization-failed]", {
        authUserId: user.id,
        role: profile?.role ?? null,
        isVerified: profile?.is_verified ?? null,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Only verified students can access approved materials.",
        },
        { status: 403 },
      );
    }

    /*
     * 5. Load the material.
     */
    const { data: material, error: materialError } = await serviceSupabase
      .from("materials")
      .select("id, status, file_path, file_size_bytes")
      .eq("id", body.materialId)
      .maybeSingle();

    if (materialError) {
      console.error("[api/materials/file-access][material]", materialError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load the material.",
        },
        { status: 500 },
      );
    }

    if (!material) {
      return NextResponse.json(
        {
          success: false,
          error: "Material could not be found.",
        },
        { status: 404 },
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
        { status: 403 },
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
        { status: 404 },
      );
    }

    /*
     * 8. Generate a short-lived signed URL.
     *
     * Bucket remains private.
     */
    const signedUrl = await createMaterialSignedUrl(
      serviceSupabase,
      material.file_path,
      300,
      { download: body.action === "download" },
    );

    if (!signedUrl) {
      console.error("[api/materials/file-access][signed-url]", {
        materialId: material.id,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Unable to create secure access to the material file.",
        },
        { status: 500 },
      );
    }

    /*
     * 9. Log view.
     */
    await recordB2BandwidthUsage(
      serviceSupabase,
      material.file_path,
      Number(material.file_size_bytes ?? 0),
    );

    if (body.action === "open") {
      const { error: logError } = await supabase
        .from("material_view_logs")
        .insert({
          material_id: material.id,
          student_id: user.id,
        });

      if (logError) {
        console.error("[api/materials/file-access][view-log]", logError);
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
        console.error("[api/materials/file-access][download-log]", logError);
      }
    }

    /*
     * 11. Return temporary signed URL.
     */
    return NextResponse.json(
      {
        success: true,
        action: body.action,
        url: signedUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/materials/file-access]", error);

    return NextResponse.json(
      {
        success: false,
        error: "The material file could not be accessed.",
      },
      { status: 500 },
    );
  }
}
