import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type ReviewFileRequest = {
  materialId: string;
};

function isValidUuid(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidRequest(value: unknown): value is ReviewFileRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;

  return isValidUuid(body.materialId);
}

export async function POST(request: Request) {
  try {
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
        { status: 401 }
      );
    }

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
          error: "Invalid file review request.",
        },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: profile, error: profileError } = await serviceSupabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[api/materials/review-file][profile]", profileError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your staff account.",
        },
        { status: 500 }
      );
    }

    if (
      !profile ||
      !["super_admin", "admin", "moderator"].includes(profile.role)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to review material files.",
        },
        { status: 403 }
      );
    }

    const { data: material, error: materialError } = await serviceSupabase
      .from("materials")
      .select("id, status, file_path, department_id")
      .eq("id", body.materialId)
      .maybeSingle();

    if (materialError) {
      console.error("[api/materials/review-file][material]", materialError);

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

    if (material.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Only pending materials can be opened for review.",
        },
        { status: 403 }
      );
    }

    if (!material.file_path) {
      return NextResponse.json(
        {
          success: false,
          error: "The material file is not available.",
        },
        { status: 404 }
      );
    }

    if (profile.role === "moderator") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Moderator file review access requires the configured staff scope.",
        },
        { status: 403 }
      );
    }

    if (profile.role === "admin") {
      const { data: canReview, error: permissionError } =
        await supabase.rpc("can_approve_materials", {
          p_department_id: material.department_id,
        });

      if (permissionError) {
        console.error(
          "[api/materials/review-file][permission]",
          permissionError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to verify your material review permission.",
          },
          { status: 500 }
        );
      }

      if (!canReview) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You do not have permission to review materials in this department.",
          },
          { status: 403 }
        );
      }
    }

    const { data: signedUrlData, error: signedUrlError } =
      await serviceSupabase.storage
        .from("academic-materials")
        .createSignedUrl(material.file_path, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(
        "[api/materials/review-file][signed-url]",
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

    return NextResponse.json(
      {
        success: true,
        url: signedUrlData.signedUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[api/materials/review-file]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The material file could not be opened.",
      },
      { status: 500 }
    );
  }
}