import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type AttachmentAccessRequest = {
  attachmentId: string;
  action: "open" | "download";
};

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidRequest(value: unknown): value is AttachmentAccessRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;

  return (
    isValidUuid(body.attachmentId) &&
    (body.action === "open" || body.action === "download")
  );
}

function getFileName(filePath: string) {
  const fileName =
    filePath.split("/").pop()?.replace(/^[0-9a-f-]+-/i, "") ||
    "Attachment";

  return fileName.replace(/["\r\n]/g, "");
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

    if (!isValidRequest(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid attachment access request.",
        },
        { status: 400 },
      );
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: profile, error: profileError } =
      await serviceSupabase
        .from("profiles")
        .select("id, role, is_verified")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "[api/notices/attachment-access][profile]",
        profileError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify your account.",
        },
        { status: 500 },
      );
    }

    if (
      !profile ||
      profile.role !== "student" ||
      profile.is_verified !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Only verified students can access notice attachments.",
        },
        { status: 403 },
      );
    }

    const { data: attachment, error: attachmentError } =
      await serviceSupabase
        .from("notice_attachments")
        .select(
          "id, notice_id, file_path, file_type, file_size_bytes",
        )
        .eq("id", body.attachmentId)
        .maybeSingle();

    if (attachmentError) {
      console.error(
        "[api/notices/attachment-access][attachment]",
        attachmentError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to load the notice attachment.",
        },
        { status: 500 },
      );
    }

    if (!attachment) {
      return NextResponse.json(
        {
          success: false,
          error: "Notice attachment could not be found.",
        },
        { status: 404 },
      );
    }

    const { data: visibleNotice, error: noticeError } =
      await supabase
        .from("notices")
        .select("id")
        .eq("id", attachment.notice_id)
        .eq("is_archived", false)
        .maybeSingle();

    if (noticeError) {
      console.error(
        "[api/notices/attachment-access][notice]",
        noticeError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify notice access.",
        },
        { status: 500 },
      );
    }

    if (!visibleNotice) {
      return NextResponse.json(
        {
          success: false,
          error: "You do not have access to this notice attachment.",
        },
        { status: 403 },
      );
    }

    const { data: signedUrlData, error: signedUrlError } =
      await serviceSupabase.storage
        .from("notice-attachments")
        .createSignedUrl(attachment.file_path, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error(
        "[api/notices/attachment-access][signed-url]",
        signedUrlError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to create secure access to the notice attachment.",
        },
        { status: 500 },
      );
    }

    if (body.action === "download") {
      const fileResponse = await fetch(signedUrlData.signedUrl);

      if (!fileResponse.ok || !fileResponse.body) {
        console.error(
          "[api/notices/attachment-access][download]",
          fileResponse.status,
        );

        return NextResponse.json(
          {
            success: false,
            error: "Unable to download the notice attachment.",
          },
          { status: 500 },
        );
      }

      const fileName = getFileName(attachment.file_path);

      const headers = new Headers();

      headers.set(
        "Content-Type",
        attachment.file_type || "application/octet-stream",
      );

      headers.set(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );

      headers.set("Cache-Control", "private, no-store");

      const contentLength = fileResponse.headers.get("content-length");

      if (contentLength) {
        headers.set("Content-Length", contentLength);
      }

      return new Response(fileResponse.body, {
        status: 200,
        headers,
      });
    }

    return NextResponse.json(
      {
        success: true,
        action: body.action,
        url: signedUrlData.signedUrl,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/notices/attachment-access]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "The notice attachment could not be accessed.",
      },
      { status: 500 },
    );
  }
}