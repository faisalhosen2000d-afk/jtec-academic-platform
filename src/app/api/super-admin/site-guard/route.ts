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
      const { error } = await auth.serviceSupabase
        .from("support_tickets")
        .update({
          status: body.status || "resolved",
          admin_reply: body.adminReply?.trim() || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", body.ticketId);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
- Unlinked Term Result Rows (student_id is null): ${health.unlinkedResults}
- Legacy Materials Missing SHA-256 Hash: ${health.missingHashMaterials}
- Active Gemini API Failover Keys: ${health.geminiKeysCount}

Recent Open Issues:
${issueDigest}

Provide a crisp Super Admin Maintenance & Guard Report in clear Bengali (বাংলা) with 4-5 short bullet points:
- Overall platform health status
- Any urgent faults or student complaint patterns that need immediate attention
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