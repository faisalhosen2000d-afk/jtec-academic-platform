import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createRawSupabaseClient } from "@supabase/supabase-js";
import { callGemini, getGeminiApiKeys } from "@/lib/gemini";

export const maxDuration = 60;

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceSupabase = createRawSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: profile } = await serviceSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "super_admin") return null;
  return { user, serviceSupabase };
}

async function gatherHealthMetrics() {
  const serviceSupabase = createRawSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const [
    { count: openTickets },
    { count: highSeverityOpen },
    { count: pendingVerifications },
    { count: pendingMaterials },
    { count: unlinkedResults },
    { count: missingHashMaterials },
  ] = await Promise.all([
    serviceSupabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    serviceSupabase.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "resolved").in("severity", ["high", "critical"]),
    serviceSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_verified", false),
    serviceSupabase.from("materials").select("id", { count: "exact", head: true }).eq("status", "pending"),
    serviceSupabase.from("term_results").select("id", { count: "exact", head: true }).is("student_id", null),
    serviceSupabase.from("materials").select("id", { count: "exact", head: true }).is("file_hash", null),
  ]);

  return {
    openTickets: openTickets ?? 0,
    highSeverityOpen: highSeverityOpen ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    pendingMaterials: pendingMaterials ?? 0,
    unlinkedResults: unlinkedResults ?? 0,
    missingHashMaterials: missingHashMaterials ?? 0,
    geminiKeysCount: getGeminiApiKeys().length,
  };
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Super Admin access required." }, { status: 403 });
    }

    const [{ data: tickets }, health] = await Promise.all([
      auth.serviceSupabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60),
      gatherHealthMetrics(),
    ]);

    return NextResponse.json({ success: true, tickets: tickets || [], health });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to load Site Guard." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Super Admin access required." }, { status: 403 });
    }

    const body = (await request.json()) as {
      action?: "update_ticket" | "ai_audit";
      ticketId?: string;
      status?: "open" | "in_progress" | "resolved";
      adminReply?: string;
    };

    if (body.action === "update_ticket") {
      if (!body.ticketId) {
        return NextResponse.json({ success: false, error: "Ticket ID required." }, { status: 400 });
      }
      const nextStatus = body.status || "resolved";
      const cleanReply = body.adminReply?.trim() || null;

      const { data: updatedTicket, error } = await auth.serviceSupabase
        .from("support_tickets")
        .update({
          status: nextStatus,
          admin_reply: cleanReply,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", body.ticketId)
        .select("user_id, category, page_path")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const tRow = updatedTicket as {
        user_id?: string | null;
        category?: string | null;
        page_path?: string | null;
      } | null;

      if (tRow?.user_id) {
        try {
          await auth.serviceSupabase.from("notifications").insert({
            recipient_id: tRow.user_id,
            type: nextStatus === "resolved" ? "support_resolved" : "support_update",
            title:
              nextStatus === "resolved"
                ? "Issue Resolved by Super Admin"
                : "Super Admin Update on Your Report",
            body: cleanReply
              ? `Admin Reply: ${cleanReply}`
              : `Your ${tRow.category || "support"} report status is now ${nextStatus.replace("_", " ")}.`,
            link_url: tRow.page_path || "/dashboard",
            is_read: false,
          } as never);
        } catch {
          // Do not fail ticket update if notification insert fails
        }
      }

      return NextResponse.json({ success: true });
    }

    const [health, { data: openList }] = await Promise.all([
      gatherHealthMetrics(),
      auth.serviceSupabase
        .from("support_tickets")
        .select("category, severity, page_path, ai_summary, message, student_roll")
        .neq("status", "resolved")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

    const openRows = (openList || []) as Array<{
      category: string;
      severity: string;
      page_path: string | null;
      ai_summary: string | null;
      message: string;
      student_roll: string | null;
    }>;

    const issueDigest =
      openRows.length > 0
        ? openRows
            .map(
              (t, i) =>
                `${i + 1}. [${t.severity.toUpperCase()} | ${t.category} | ${t.page_path || "/"}] (${t.student_roll || "N/A"}): ${t.ai_summary || t.message.slice(0, 100)}`
            )
            .join("\n")
        : "No open student complaints.";

    const report = await callGemini([
      {
        text: `You are the AI Site Guard for JTEC Academic Platform (Jhenaidah Textile Engineering College).
Live Platform Health Metrics:
- Open Support Tickets: ${health.openTickets} (High/Critical: ${health.highSeverityOpen})
- Pending Student Verifications: ${health.pendingVerifications}
- Pending Material Reviews: ${health.pendingMaterials}
- Unregistered Student Result Rows (normal batch-uploaded results whose students have not registered yet; auto-linked by roll upon signup): ${health.unlinkedResults}
- Legacy Materials Missing SHA-256 Hash (older files uploaded before duplicate-blocker; normal): ${health.missingHashMaterials}
- Active Gemini API Failover Keys: ${health.geminiKeysCount}

Recent Open Issues:
${issueDigest}

STRICT ACCURACY RULES:
1. Open Support Tickets count is exactly ${health.openTickets}. If ${health.openTickets} > 0, you MUST clearly mention that ${health.openTickets} ticket(s) are still open and summarize what they are about. NEVER claim all support tickets are closed when Open Support Tickets > 0.
2. Only flag something as urgent if there is a real open ticket, high-priority alert, pending queue, or missing Gemini key. Treat unregistered batch results and legacy missing hashes as low-priority routine notes.

Provide a crisp Super Admin Maintenance & Guard Report in clean, natural Bengali (\u09AC\u09BE\u0982\u09B2\u09BE) using 4-5 short bullet points formatted as "- **\u09B6\u09BF\u09B0\u09CB\u09A8\u09BE\u09AE:** \u09AC\u09BF\u09AC\u09B0\u09A3":
- Overall platform health status
- Open support tickets & any urgent student complaint patterns
- Exact recommended next actions for the Super Admin
Keep it under 160 words. Do NOT mix Bengali and English letters inside the same word.`,
      },
    ]);

    return NextResponse.json({ success: true, report: report.trim(), health });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI audit failed." },
      { status: 500 }
    );
  }
}