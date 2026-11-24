import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { createMaterialSignedUrl } from "@/lib/material-storage";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const rl = await checkRateLimit({ key: `question-access:${user.id}`, limit: 45, windowSeconds: 60 });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role === "student" && !profile.is_verified)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const itemId = String(body?.itemId ?? "").trim();
    const action = body?.action === "download" ? "download" : "view";
    if (!itemId) {
      return NextResponse.json({ error: "Question ID is required." }, { status: 400 });
    }

    const raw = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: item } = await raw
      .from("question_bank_items")
      .select("id, file_path, status, views_count, downloads_count")
      .eq("id", itemId)
      .maybeSingle();

    const row = item as {
      id: string;
      file_path: string;
      status: string;
      views_count: number;
      downloads_count: number;
    } | null;

    if (!row) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const isStaff = ["admin", "super_admin", "moderator"].includes(profile.role);
    if (row.status !== "approved" && !isStaff) {
      return NextResponse.json({ error: "This question is not approved yet." }, { status: 403 });
    }

    const signedUrl = await createMaterialSignedUrl(serviceSupabase, row.file_path, 300, {
      download: action === "download",
    });

    if (!signedUrl) {
      return NextResponse.json({ error: "Could not generate file URL." }, { status: 500 });
    }

    await raw
      .from("question_bank_items")
      .update(
        action === "download"
          ? { downloads_count: (row.downloads_count || 0) + 1 }
          : { views_count: (row.views_count || 0) + 1 },
      )
      .eq("id", row.id);

    return NextResponse.json({ success: true, url: signedUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to access question." },
      { status: 500 },
    );
  }
}