import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { callGemini, type GeminiPart } from "@/lib/gemini";

export const maxDuration = 60;

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
      .select("role, is_verified")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role === "student" && !profile.is_verified)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFiles = formData.getAll("images");

    const parts: GeminiPart[] = [];
    let totalBytes = 0;

    for (const entry of imageFiles.slice(0, 8)) {
      if (entry instanceof File && entry.size > 0 && totalBytes + entry.size <= 3.6 * 1024 * 1024) {
        const buf = Buffer.from(await entry.arrayBuffer());
        parts.push({
          inlineData: {
            mimeType: entry.type || "image/jpeg",
            data: buf.toString("base64"),
          },
        });
        totalBytes += entry.size;
      }
    }

    if (parts.length === 0) {
      return NextResponse.json({ error: "Please attach at least one question image." }, { status: 400 });
    }

    parts.push({
      text: `Transcribe this university exam / class test question paper accurately, preserving its exact academic layout and every question word-for-word.

RULES:
1. Extract every header line centered at the top (college name, degree, exam title, level/term, subject name & code).
2. Extract Time (left) and Full Marks (right) exactly as written.
3. Transcribe every question, sub-question ((a), (b), (i), etc.), OR-blocks, and the right-side marks exactly. Do NOT summarize, skip, or rephrase anything.
4. Keep clean ASCII/standard Unicode symbols (use standard -, +, x, =, deg, <=, >=) so standard PDF fonts render cleanly.

Return strictly valid JSON with this exact structure:
{
  "headers": ["Jhenaidah Textile Engineering College, Jhenaidah", "B.Sc in Textile Engineering", "..."],
  "time": "Time: 30 Minutes",
  "marks": "Marks-10",
  "instructions": ["Answer any ...", "..."],
  "questions": [
    { "number": "1.", "text": "Define Market. Classify the market...", "marks": "2" }
  ]
}`,
    });

    const raw = await callGemini(parts, { jsonMode: true });
    let parsed: {
      headers?: string[];
      time?: string;
      marks?: string;
      instructions?: string[];
      questions?: Array<{ number?: string; text?: string; marks?: string }>;
    };

    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI could not parse question text cleanly.");
      parsed = JSON.parse(m[0]);
    }

    return NextResponse.json({ success: true, extracted: parsed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR extraction failed." },
      { status: 500 },
    );
  }
}