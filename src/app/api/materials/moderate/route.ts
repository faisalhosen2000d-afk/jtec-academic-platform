import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  approveMaterial,
  rejectMaterial,
  resolveMaterialEscalation,
} from "@/server/services/material-moderation";

type ModerateRequest =
  | {
      action: "approve";
      materialId: string;
    }
  | {
      action: "reject";
      materialId: string;
      rejectionReason: string;
    }
  | {
      action: "resolve";
      escalationId: string;
      approve: boolean;
    };

function isValidUuid(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isModerateRequest(value: unknown): value is ModerateRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;

  if (body.action === "approve") {
    return isValidUuid(body.materialId);
  }

  if (body.action === "reject") {
    return (
      isValidUuid(body.materialId) &&
      typeof body.rejectionReason === "string"
    );
  }

  if (body.action === "resolve") {
    return (
      isValidUuid(body.escalationId) &&
      typeof body.approve === "boolean"
    );
  }

  return false;
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
        { status: 401 },
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
        { status: 400 },
      );
    }

    if (!isModerateRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid moderation request.",
        },
        { status: 400 },
      );
    }

    const serviceSupabase = createServiceRoleClient();

    if (body.action === "approve") {
      // 1. Fetch material info before/during approval to get uploader_id and title
      const { data: material } = await serviceSupabase
        .from("materials")
        .select("id, title, uploader_id")
        .eq("id", body.materialId)
        .maybeSingle();

      const result = await approveMaterial(
        user.id,
        body.materialId,
      );

      // If approved directly by Admin / Super Admin (not escalated)
      const isEscalated = "escalated" in result && result.escalated;
      if (!isEscalated && material?.uploader_id) {
        try {
          await serviceSupabase.from("notifications").insert({
            recipient_id: material.uploader_id,
            type: "material_approved",
            title: "Material Approved!",
            body: `Your uploaded material "${material.title}" has been approved and is now live for all students.`,
            link_url: "/materials",
            is_read: false,
          });
        } catch (notifErr) {
          console.error("Failed to insert approval notification:", notifErr);
        }
      }

      if (isEscalated) {
        return NextResponse.json(result, { status: 202 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    if (body.action === "reject") {
      const { data: material } = await serviceSupabase
        .from("materials")
        .select("id, title, uploader_id")
        .eq("id", body.materialId)
        .maybeSingle();

      const result = await rejectMaterial(
        user.id,
        body.materialId,
        body.rejectionReason,
      );

      const isEscalated = "escalated" in result && result.escalated;
      if (!isEscalated && material?.uploader_id) {
        try {
          await serviceSupabase.from("notifications").insert({
            recipient_id: material.uploader_id,
            type: "material_rejected",
            title: "Material Rejected",
            body: `Your uploaded material "${material.title}" was not approved. Reason: ${body.rejectionReason}`,
            link_url: "/upload",
            is_read: false,
          });
        } catch (notifErr) {
          console.error("Failed to insert rejection notification:", notifErr);
        }
      }

      if (isEscalated) {
        return NextResponse.json(result, { status: 202 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    const result = await resolveMaterialEscalation(
      user.id,
      body.escalationId,
      body.approve,
    );

    return NextResponse.json(
      {
        success: true,
        action: "resolve",
        approved: body.approve,
        result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/materials/moderate]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Moderation request could not be completed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 400 },
    );
  }
}