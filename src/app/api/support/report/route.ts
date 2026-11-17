import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { callGemini } from "@/lib/gemini";

export const maxDuration = 60;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const serviceSupabase = createRawSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await serviceSupabase
      .from("support_tickets")
      .select("id, category, severity, message, status, admin_reply, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, tickets: data || [] });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load tickets." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = (await request.json()) as { message?: string; pagePath?: string };
    const message = String(body.message || "").trim();
    const pagePath = String(body.pagePath || "").trim().slice(0, 120);

    if (message.length < 4) {
      return NextResponse.json({ success: false, error: "Please describe your issue briefly." }, { status: 400 });
    }

    const serviceSupabase = createRawSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("full_name, student_id, departments:department_id(code)")
      .eq("id", user.id)
      .maybeSingle();

    const pRow = profile as unknown as {
      full_name?: string | null;
      student_id?: string | null;
      departments?: { code?: string | null } | null;
    } | null;

    let category = "General";
    let severity = "medium";
    let aiSummary = message.slice(0, 140);
    let replyToStudent =
      "Your report has been forwarded to the Super Admin. You can track updates in My Reports.";

    try {
      const raw = await callGemini(
        [
          {
            text: `A JTEC student submitted a support issue from page "${pagePath || "/"}":
"${message}"

Classify it and return strictly valid JSON:
- "category": one of "Result Issue", "Material/File", "Bug", "Account", "General"
- "severity": one of "low", "medium", "high"
- "summary": concise 1-sentence technical summary in English for the Super Admin (max 140 chars)
- "replyToStudent": polite 1-2 sentence confirmation in the same language the student used (Bengali script or English), letting them know Super Admin received it.`,
          },
        ],
        { jsonMode: true, timeoutMs: 8000 }
      );
      const parsed = JSON.parse(raw) as {
        category?: string;
        severity?: string;
        summary?: string;
        replyToStudent?: string;
      };
      if (parsed.category) category = parsed.category;
      if (parsed.severity && ["low", "medium", "high"].includes(parsed.severity)) {
        severity = parsed.severity;
      }
      if (parsed.summary) aiSummary = parsed.summary.slice(0, 200);
      if (parsed.replyToStudent) replyToStudent = parsed.replyToStudent;
    } catch {
      // Zero-fail fallback: still save the complaint even if AI is busy
    }

    const { data: inserted, error: insertError } = await serviceSupabase
      .from("support_tickets")
      .insert({
        ticket_type: "complaint",
        user_id: user.id,
        student_name: pRow?.full_name || "Student",
        student_roll: pRow?.student_id || null,
        department_code: pRow?.departments?.code || null,
        page_path: pagePath || "/",
        category,
        severity,
        message: message.slice(0, 1500),
        ai_summary: aiSummary,
        status: "open",
      } as never)
      .select("id, category, severity, message, status, admin_reply, created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, ticket: inserted, reply: replyToStudent });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to submit report." },
      { status: 500 }
    );
  }
}