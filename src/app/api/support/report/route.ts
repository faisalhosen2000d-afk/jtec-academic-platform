import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import { checkMaterialObjectExists } from "@/lib/material-storage";
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

    const serviceSupabase = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await serviceSupabase
      .from("support_tickets")
      .select("id, category, severity, message, ai_summary, status, admin_reply, created_at")
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

    const rl = await checkRateLimit({ key: `support-report:${user.id}`, limit: 5, windowSeconds: 300 });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = (await request.json()) as { message?: string; pagePath?: string };
    const message = String(body.message || "").trim();
    const pagePath = String(body.pagePath || "").trim().slice(0, 120);

    if (message.length < 4) {
      return NextResponse.json({ success: false, error: "Please describe your issue briefly." }, { status: 400 });
    }

    const serviceSupabase = createRawSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: profile }, { count: openTicketsCount }] = await Promise.all([
      serviceSupabase
        .from("profiles")
        .select("full_name, student_id, is_verified, verification_status, departments:department_id(name, code)")
        .eq("id", user.id)
        .maybeSingle(),
      serviceSupabase
        .from("support_tickets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("status", "resolved"),
    ]);

    const pRow = profile as unknown as {
      full_name?: string | null;
      student_id?: string | null;
      is_verified?: boolean | null;
      verification_status?: string | null;
      departments?: { name?: string | null; code?: string | null } | null;
    } | null;

    const roll = (pRow?.student_id || "").trim();
    const deptLabel = pRow?.departments?.name
      ? `${pRow.departments.name} (${pRow.departments.code || ""})`
      : pRow?.departments?.code || "Unknown";

    const diagnostics: string[] = [
      `Account verified: ${pRow?.is_verified || pRow?.verification_status === "approved" ? "Yes" : "No"} (${pRow?.verification_status || "unknown"})`,
      `Student Roll: ${roll || "Missing"}, Department: ${deptLabel}`,
      `Student's existing open tickets: ${openTicketsCount ?? 0}`,
    ];

    const resultQuery = roll
      ? serviceSupabase
          .from("term_results")
          .select("level_term_key, status, gpa")
          .or(`student_id.eq.${user.id},student_id_code.eq.${roll}`)
      : serviceSupabase.from("term_results").select("level_term_key, status, gpa").eq("student_id", user.id);

    const { data: resultRows } = await resultQuery;
    const rows = (resultRows || []) as Array<{ level_term_key: string; status: string; gpa: number }>;
    const airDropped = rows.filter((r) => r.status === "air_dropped").length;
    diagnostics.push(
      `Published Term Results found: ${rows.length} (Air-dropped rows: ${airDropped})`
    );

    const matMatch = pagePath.match(/\/materials\/([0-9a-f-]{36})/i);
    if (matMatch?.[1]) {
      const { data: mat } = await serviceSupabase
        .from("materials")
        .select("title, status, file_path")
        .eq("id", matMatch[1])
        .maybeSingle();
      const matRow = mat as { title?: string; status?: string; file_path?: string } | null;
      if (!matRow) {
        diagnostics.push("Material check: Record not found in database.");
      } else {
        let storageOk = false;
        if (matRow.file_path) { storageOk = await checkMaterialObjectExists(serviceSupabase, matRow.file_path); }
        diagnostics.push(
          `Material "${matRow.title || "Untitled"}" (status: ${matRow.status || "unknown"}), File in storage: ${storageOk ? "Yes" : "NO (Missing/Broken file)"}`
        );
      }
    }

    const noticeMatch = pagePath.match(/\/notices\/([0-9a-f-]{36})/i);
    if (noticeMatch?.[1]) {
      const { data: notice } = await serviceSupabase
        .from("notices")
        .select("title, is_archived")
        .eq("id", noticeMatch[1])
        .maybeSingle();
      const nRow = notice as { title?: string; is_archived?: boolean } | null;
      diagnostics.push(
        nRow ? `Notice "${nRow.title || "Untitled"}" (archived: ${nRow.is_archived ? "Yes" : "No"})` : "Notice check: Not found."
      );
    }

    const diagText = diagnostics.join("\n- ");

    let category = "General";
    let severity = "medium";
    let aiSummary = `${message.slice(0, 90)} | Check: ${diagnostics[3] || diagnostics[0]}`;
    let replyToStudent =
      "AI Guard checked your account & platform data and forwarded the diagnostic report to the Super Admin. Please wait a bit—Super Admin will review and fix it soon.";

    try {
      const raw = await callGemini(
        [
          {
            text: `You are the JTEC AI Site Guard for JTEC Academic Platform (Jhenaidah Textile Engineering College, affiliated with BUTEX).
Student Portal Sections: Dashboard (/dashboard), Materials & Study AI (/materials), Bookmarks (/bookmarks), Upload (/upload), Results (/results), Batch Ranking (/ranking), CGPA Calculator & Advisor (/cgpa-calculator), Conversations/Messages (/conversations, /messages), Notifications & Official Notices (/notices), Profile (/profile).

Student Page: ${pagePath || "/"}
Student Message: "${message}"

Live Site Guard Diagnostic Findings:
- ${diagText}

Return strictly valid JSON:
- "category": one of "Result Issue", "Material/File", "Notice", "Messaging/Chat", "Account", "Bug", "General"
- "severity": one of "low", "medium", "high" (set "high" if a file is missing in storage or account/result data is broken)
- "summary": concise 1-2 sentence technical diagnostic summary in English for the Super Admin combining the issue + live check findings (max 190 chars)
- "replyToStudent": warm, clear 2-3 sentence response in the SAME language the student used (Bengali script or English; NEVER mix Bengali & English inside one word). State what AI Guard found during the live check, ask them to wait patiently, and confirm the full diagnostic has been sent to the Super Admin to fix.`,
          },
        ],
        { jsonMode: true, timeoutMs: 9500 }
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
      if (parsed.summary) aiSummary = parsed.summary.slice(0, 220);
      if (parsed.replyToStudent) replyToStudent = parsed.replyToStudent;
    } catch {
      // Zero-fail fallback
    }

    const { data: inserted, error: insertError } = await serviceSupabase
      .from("support_tickets")
      .insert({
        ticket_type: "complaint",
        user_id: user.id,
        student_name: pRow?.full_name || "Student",
        student_roll: roll || null,
        department_code: pRow?.departments?.code || null,
        page_path: pagePath || "/",
        category,
        severity,
        message: message.slice(0, 1500),
        ai_summary: aiSummary,
        status: "open",
      } as never)
      .select("id, category, severity, message, ai_summary, status, admin_reply, created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ticket: inserted,
      reply: replyToStudent,
      diagnostics,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to submit report." },
      { status: 500 }
    );
  }
}