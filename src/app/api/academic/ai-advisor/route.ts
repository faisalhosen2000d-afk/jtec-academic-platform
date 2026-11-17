import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGemini, type GeminiPart } from "@/lib/gemini";

interface TermInput {
  termKey: string;
  gpa: number;
  cgpa: number | null;
}

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      mode?: "analyze" | "target_plan" | "chat";
      targetCgpa?: number;
      question?: string;
      history?: ChatMsg[];
      terms?: TermInput[];
      retakes?: string[];
      studentName?: string;
      department?: string;
    };

    const mode = body.mode || "analyze";
    const terms = Array.isArray(body.terms) ? body.terms.filter((t) => Number(t.gpa) > 0) : [];
    const retakes = Array.isArray(body.retakes) ? body.retakes : [];
    const totalProgramTerms = 8;
    const completedCount = terms.length;
    const remainingTerms = Math.max(0, totalProgramTerms - completedCount);

    const lastTerm = terms.at(-1);
    const latestCgpa =
      lastTerm && lastTerm.cgpa !== null
        ? Number(lastTerm.cgpa)
        : terms.length > 0
          ? terms.reduce((s, t) => s + Number(t.gpa), 0) / terms.length
          : 0;

    const targetCgpa = Number(body.targetCgpa) > 0 ? Math.min(4.0, Math.max(2.0, Number(body.targetCgpa))) : 3.5;

    let requiredAvgGpaText = "N/A";
    if (remainingTerms > 0 && completedCount > 0) {
      const needed = (targetCgpa * totalProgramTerms - latestCgpa * completedCount) / remainingTerms;
      requiredAvgGpaText = needed.toFixed(2);
    }

    const termSummary =
      terms.length > 0
        ? terms.map((t) => `${t.termKey}: GPA ${Number(t.gpa).toFixed(2)}${t.cgpa !== null ? ` (CGPA ${Number(t.cgpa).toFixed(2)})` : ""}`).join(", ")
        : "No published term results yet.";

    const retakeSummary = retakes.length > 0 ? retakes.join(", ") : "None";

    const baseContext = `Student: ${body.studentName || "JTEC Student"} (${body.department || "Textile Engineering"})
Completed Terms: ${completedCount}/${totalProgramTerms} (Remaining: ${remainingTerms})
Current CGPA: ${latestCgpa > 0 ? latestCgpa.toFixed(2) : "Not published"}
Term History: ${termSummary}
Pending Retakes: ${retakeSummary}
Target CGPA: ${targetCgpa.toFixed(2)} (Approx. required average GPA across remaining ${remainingTerms} terms: ${requiredAvgGpaText})`;

    let instruction = "";
    if (mode === "analyze") {
      instruction = `Provide a concise, encouraging academic progress analysis in 4-5 short bullet points:
- Current CGPA standing & GPA trend across terms
- Strongest vs weakest term
- Impact of pending retakes (if any) and what to prioritize next term
Keep it under 140 words. Use plain text and simple numbers (no LaTeX).`;
    } else if (mode === "target_plan") {
      instruction = `Create a practical, realistic action plan to reach Target CGPA ${targetCgpa.toFixed(2)}:
- State clearly whether ${requiredAvgGpaText} GPA per remaining term is realistic (if > 4.00, state honestly that 4.00 is the max and show the highest achievable CGPA instead)
- Give 3 concrete steps for upcoming terms & retake clearance
Keep it under 150 words. Use plain text and simple math (no LaTeX).`;
    } else {
      const q = String(body.question || "").trim();
      if (!q) {
        return NextResponse.json({ success: false, error: "Please enter a question." }, { status: 400 });
      }
      const recentHistory = (body.history || [])
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Student" : "Advisor"}: ${m.text}`)
        .join("\n");
      instruction = `${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ""}Student Question: ${q}
Answer directly, accurately, and concisely based on the student's actual JTEC term results and retakes above. Reply in the same language the student asked (Bengali or English). Keep it under 160 words and use plain math (no LaTeX).`;
    }

    const parts: GeminiPart[] = [{ text: `${baseContext}\n\n${instruction}` }];
    const reply = await callGemini(parts);

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
      metrics: {
        currentCgpa: latestCgpa > 0 ? Number(latestCgpa.toFixed(2)) : null,
        completedCount,
        remainingTerms,
        requiredAvgGpa: requiredAvgGpaText,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI Advisor request failed." },
      { status: 500 }
    );
  }
}