import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
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

    if (body.action === "approve") {
      const result = await approveMaterial(
        user.id,
        body.materialId,
      );

      /*
       * Moderator approval creates a pending escalation.
       * Direct Admin/Super Admin approval completes the action.
       */
      if ("escalated" in result && result.escalated) {
        return NextResponse.json(result, { status: 202 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    if (body.action === "reject") {
      const result = await rejectMaterial(
        user.id,
        body.materialId,
        body.rejectionReason,
      );

      /*
       * Moderator rejection creates a pending escalation.
       * Direct Admin/Super Admin rejection completes the action.
       */
      if ("escalated" in result && result.escalated) {
        return NextResponse.json(result, { status: 202 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    const result = await resolveMaterialEscalation(
      user.id,
      body.escalationId,
      body.approve,
    );

    /*
     * Denying an escalation returns null because the original
     * material action is not executed.
     */
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