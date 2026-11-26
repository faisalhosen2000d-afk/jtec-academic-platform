import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

function getRawClient() { return createRawSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); }

async function requireVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  const serviceSupabase = createServiceRoleClient();
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("id, role, is_verified, department_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: "Profile not found." }, { status: 403 }) };
  }

  const isStaff = ["admin", "super_admin", "moderator"].includes(profile.role);
  if (profile.role === "student" && !profile.is_verified) {
    return { error: NextResponse.json({ error: "Account pending verification." }, { status: 403 }) };
  }

  return { supabase, user, profile, isStaff };
}

// POST: Create a new folder (root inside a subject or nested inside parent_id)
export async function POST(request: Request) {
  try {
    const auth = await requireVerifiedUser();
    if ("error" in auth) return auth.error;

    const rl = await checkRateLimit({
      key: `qfolders-write:${auth.user.id}`,
      limit: 40,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitExceededResponse(rl.retryAfterSeconds);

    const body = await request.json().catch(() => null);
    const subjectId = String(body?.subject_id ?? "").trim();
    const questionType = String(body?.question_type ?? "").trim();
    const parentId =
      typeof body?.parent_id === "string" && body.parent_id.trim()
        ? body.parent_id.trim()
        : null;
    const name = String(body?.name ?? "").trim();

    if (!subjectId || !["previous_year", "ct"].includes(questionType)) {
      return NextResponse.json(
        { error: "Subject and question type are required." },
        { status: 400 },
      );
    }

    if (name.length < 1 || name.length > 80) {
      return NextResponse.json(
        { error: "Folder name must be between 1 and 80 characters." },
        { status: 400 },
      );
    }

    const { data: subjectRow } = await auth.supabase
      .from("subjects")
      .select("id, subject_code, department_id, term_id")
      .eq("id", subjectId)
      .maybeSingle();

    const subject = subjectRow as {
      id: string;
      subject_code: string;
      department_id: string;
      term_id: string;
    } | null;

    if (!subject) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }

    const raw = getRawClient();

    if (parentId) {
      const { data: parentRow } = await raw
        .from("question_bank_folders")
        .select("id, subject_code, question_type")
        .eq("id", parentId)
        .maybeSingle();

      if (
        !parentRow ||
        String(parentRow.subject_code) !== subject.subject_code ||
        String(parentRow.question_type) !== questionType
      ) {
        return NextResponse.json(
          { error: "Invalid parent folder." },
          { status: 400 },
        );
      }
    }

    const { data: created, error: insertErr } = await raw
      .from("question_bank_folders")
      .insert({
        department_id: subject.department_id,
        term_id: subject.term_id,
        subject_id: subject.id,
        subject_code: subject.subject_code,
        question_type: questionType,
        parent_id: parentId,
        name,
        created_by: auth.user.id,
      })
      .select("id, department_id, term_id, subject_id, subject_code, question_type, parent_id, name, created_by, created_at")
      .single();

    if (insertErr || !created) {
      return NextResponse.json(
        { error: insertErr?.message || "Could not create folder." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, folder: created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create folder." },
      { status: 500 },
    );
  }
}

// PATCH: Rename folder OR move a question item into/out of a folder
export async function PATCH(request: Request) {
  try {
    const auth = await requireVerifiedUser();
    if ("error" in auth) return auth.error;

    const rl = await checkRateLimit({
      key: `qfolders-write:${auth.user.id}`,
      limit: 60,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitExceededResponse(rl.retryAfterSeconds);

    const body = await request.json().catch(() => null);
    const action = String(body?.action ?? "rename");
    const raw = getRawClient();

    if (action === "move_item") {
      const itemId = String(body?.item_id ?? "").trim();
      const folderId =
        typeof body?.folder_id === "string" && body.folder_id.trim()
          ? body.folder_id.trim()
          : null;

      if (!itemId) {
        return NextResponse.json({ error: "Item ID is required." }, { status: 400 });
      }

      const { data: itemRow } = await raw
        .from("question_bank_items")
        .select("id, subject_code, question_type")
        .eq("id", itemId)
        .maybeSingle();

      if (!itemRow) {
        return NextResponse.json({ error: "Question not found." }, { status: 404 });
      }

      if (folderId) {
        const { data: folderRow } = await raw
          .from("question_bank_folders")
          .select("id, subject_code, question_type")
          .eq("id", folderId)
          .maybeSingle();

        if (
          !folderRow ||
          String(folderRow.subject_code) !== String(itemRow.subject_code) ||
          String(folderRow.question_type) !== String(itemRow.question_type)
        ) {
          return NextResponse.json(
            { error: "Target folder must belong to the same subject and section." },
            { status: 400 },
          );
        }
      }

      const { error: moveErr } = await raw
        .from("question_bank_items")
        .update({ folder_id: folderId })
        .eq("id", itemId);

      if (moveErr) {
        return NextResponse.json(
          { error: moveErr.message || "Could not move question." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, item_id: itemId, folder_id: folderId });
    }

    // Default: rename folder
    const folderId = String(body?.folder_id ?? "").trim();
    const name = String(body?.name ?? "").trim();

    if (!folderId || name.length < 1 || name.length > 80) {
      return NextResponse.json(
        { error: "Valid folder ID and name (1-80 chars) are required." },
        { status: 400 },
      );
    }

    const { data: updated, error: updateErr } = await raw
      .from("question_bank_folders")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", folderId)
      .select("id, name, parent_id")
      .single();

    if (updateErr || !updated) {
      return NextResponse.json(
        { error: updateErr?.message || "Could not rename folder." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, folder: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update folder." },
      { status: 500 },
    );
  }
}

// DELETE: Safely delete a folder (moves its items & sub-folders up to parent_id so nothing is lost)
export async function DELETE(request: Request) {
  try {
    const auth = await requireVerifiedUser();
    if ("error" in auth) return auth.error;

    const rl = await checkRateLimit({
      key: `qfolders-write:${auth.user.id}`,
      limit: 30,
      windowSeconds: 60,
    });
    if (!rl.allowed) return rateLimitExceededResponse(rl.retryAfterSeconds);

    const body = await request.json().catch(() => null);
    const folderId = String(body?.folder_id ?? "").trim();
    if (!folderId) {
      return NextResponse.json({ error: "Folder ID is required." }, { status: 400 });
    }

    const raw = getRawClient();
    const { data: existing } = await raw
      .from("question_bank_folders")
      .select("id, parent_id")
      .eq("id", folderId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    }

    const parentId = existing.parent_id ?? null;

    // Move items & child folders safely to parent before deleting
    await raw
      .from("question_bank_items")
      .update({ folder_id: parentId })
      .eq("folder_id", folderId);

    await raw
      .from("question_bank_folders")
      .update({ parent_id: parentId })
      .eq("parent_id", folderId);

    const { error: delErr } = await raw
      .from("question_bank_folders")
      .delete()
      .eq("id", folderId);

    if (delErr) {
      return NextResponse.json(
        { error: delErr.message || "Could not delete folder." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, deleted_id: folderId, parent_id: parentId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete folder." },
      { status: 500 },
    );
  }
}