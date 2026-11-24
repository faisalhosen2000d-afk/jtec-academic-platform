import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { removeMaterialObject } from "@/lib/material-storage";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin", "moderator"].includes(profile.role)) {
      return NextResponse.json({ error: "Staff permission required." }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const itemId = String(body?.itemId ?? "").trim();
    const action = body?.action as "approve" | "reject" | "delete";
    const reason = String(body?.reason ?? "").trim() || null;

    if (!itemId || !["approve", "reject", "delete"].includes(action)) {
      return NextResponse.json({ error: "Invalid moderation request." }, { status: 400 });
    }

    const raw = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data: item } = await raw
      .from("question_bank_items")
      .select("id, uploader_id, subject_code, question_type, exam_year, ct_number, file_path")
      .eq("id", itemId)
      .maybeSingle();

    if (!item) {
      return NextResponse.json({ error: "Question record not found." }, { status: 404 });
    }

    const qItem = item as {
      id: string;
      uploader_id?: string | null;
      subject_code?: string | null;
      question_type?: string | null;
      exam_year?: number | null;
      ct_number?: number | null;
      file_path: string;
    };
    const slotText =
      qItem.question_type === "ct"
        ? `CT-${qItem.ct_number ?? ""}`
        : `Year ${qItem.exam_year ?? ""}`;
    const questionLabel = `${qItem.subject_code || "Question"} (${slotText})`;

    if (action === "approve") {
      const { error } = await raw
        .from("question_bank_items")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (qItem.uploader_id) {
        try {
          await serviceSupabase.from("notifications").insert({
            recipient_id: qItem.uploader_id,
            type: "material_approved",
            title: "Question Approved!",
            body: `Your uploaded question "${questionLabel}" has been approved and is now live in the Question Bank.`,
            link_url: "/materials",
            is_read: false,
          });
        } catch (notifErr) {
          console.error("Failed to insert question approval notification:", notifErr);
        }
      }
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      const { error } = await raw
        .from("question_bank_items")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await removeMaterialObject(serviceSupabase, (item as { file_path: string }).file_path);
      if (qItem.uploader_id) {
        try {
          await serviceSupabase.from("notifications").insert({
            recipient_id: qItem.uploader_id,
            type: "material_rejected",
            title: "Question Rejected",
            body: `Your uploaded question "${questionLabel}" was not approved. Reason: ${reason || "Please review and re-upload a clearer copy."}`,
            link_url: "/materials",
            is_read: false,
          });
        } catch (notifErr) {
          console.error("Failed to insert question rejection notification:", notifErr);
        }
      }
      return NextResponse.json({ success: true, status: "rejected" });
    }

    const { error } = await raw.from("question_bank_items").delete().eq("id", itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await removeMaterialObject(serviceSupabase, (item as { file_path: string }).file_path);
    return NextResponse.json({ success: true, status: "deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Moderation failed." },
      { status: 500 },
    );
  }
}