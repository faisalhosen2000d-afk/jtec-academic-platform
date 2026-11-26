import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { callGemini, type GeminiPart } from "@/lib/gemini";

export const maxDuration = 60;

const OCR_PROMPT = `Transcribe this official university exam / class test question paper accurately, preserving its exact academic layout and every printed question word-for-word.

CRITICAL PRIVACY & CLEANUP RULES:
- COMPLETELY IGNORE AND OMIT all handwritten text, personal names, student IDs, roll numbers, dates, signatures, stamps, watermarks, and sticky notes/labels (e.g. yellow stickers or pen annotations). Extract ONLY the official printed exam paper content.

LAYOUT & FORMATTING RULES:
1. "headers": Extract every centered header line at the very top in exact order (university name, degree, level/term & exam title, subject name & code).
2. "time": Extract Time on the left exactly as written (e.g. "Time : 3.0 Hrs").
3. "marks": Extract Full Marks on the right exactly as written (e.g. "Full marks : 72").
4. "instructions": Extract general centered exam instructions below Time/Marks (e.g. ["(Use separate answer script for Part: A and Part: B)", "(All parts of a question must be answered consecutively)"]). Do NOT put "Part: A" or "Part: B" here.
5. "questions": Transcribe every question (1., 2., ... 8.) and sub-questions ((a), (b), (i), (ii), etc.) word-for-word.
   - If a Part heading appears right before a question (e.g. "Part: A" and "(Answer any three questions)" before question 1, or "Part: B" and "(Answer any three questions)" before question 5), put those lines in "sectionHeader": ["Part: A", "(Answer any three questions)"] on that question object, and DO NOT include "Part: A" inside "text"!
   - Format sub-questions cleanly with newlines so each sub-question starts on its own line: "(a) ...\n(b) ...\n(c) ...".
   - Put the right-side marks (e.g. "[2+4+3+3=12]") in the "marks" field of that question, NOT inside "text".
6. Fractions, subscripts, superscripts & symbols:
   - Write stacked fractions using \frac{numerator}{denominator}, e.g. \frac{24x27}{65x60} or \frac{20x16}{110x51}.
   - Write subscripts as D_{7}, H_{2}O and superscripts as m^{2}, 10^{-3}.
   - Use proper degree symbols like °C or °F and standard symbols (-, +, x, =, <=, >=, %). Do NOT wrap formulas in $...$ delimiters.
7. If a question contains any data table / chart of numbers, put it in the "table" 2D array (rows of cells) on that question object.
8. If a question includes ANY diagram, figure, circuit, graph, or sketch, set "hasFigure": true AND include "figureBox": {"pageIndex": 0, "x": left, "y": top, "width": w, "height": h} in 0-1000 coordinates tightly framing the entire diagram with all arrows and labels.
9. "footer": If there is a centered ending mark at the bottom (e.g. "** ** ** **"), include it; otherwise omit.

Return strictly valid JSON with this exact structure:
{
  "headers": ["BANGLADESH UNIVERSITY OF TEXTILES", "B. Sc. in Textile Engineering (For Affiliated colleges)", "Level-2 Term-II, Final Examination-2018", "Subject: Fabric Manufacturing-1 (Code: FE 201)"],
  "time": "Time : 3.0 Hrs",
  "marks": "Full marks : 72",
  "instructions": ["(Use separate answer script for Part: A and Part: B)", "(All parts of a question must be answered consecutively)"],
  "questions": [
    {
      "sectionHeader": ["Part: A", "(Answer any three questions)"],
      "number": "1.",
      "text": "(a) Write down the flow chart of weaving.\n(b) What is ballooning? ...",
      "marks": "[2+4+3+3=12]"
    }
  ],
  "footer": "** ** ** **"
}`;

async function callOpenAiCompatibleVision(
  endpoint: string,
  apiKey: string,
  model: string,
  images: Array<{ mimeType: string; base64: string }>,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [
    ...images.map((img) => ({
      type: "image_url" as const,
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    })),
    { type: "text", text: OCR_PROMPT },
  ];

  const res = await fetch(endpoint, {
    signal: AbortSignal.timeout(18000),
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`${model} HTTP ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${model} returned empty content.`);
  return text;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const rl = await checkRateLimit({ key: `questions-extract:${user.id}`, limit: 8, windowSeconds: 60 });
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

    const formData = await request.formData();
    const imageFiles = formData.getAll("images");

    const encodedImages: Array<{ mimeType: string; base64: string }> = [];
    let totalBytes = 0;

    for (const entry of imageFiles.slice(0, 8)) {
      if (entry instanceof File && entry.size > 0 && totalBytes + entry.size <= 3.6 * 1024 * 1024) {
        const buf = Buffer.from(await entry.arrayBuffer());
        encodedImages.push({
          mimeType: entry.type || "image/jpeg",
          base64: buf.toString("base64"),
        });
        totalBytes += entry.size;
      }
    }

    if (encodedImages.length === 0) {
      return NextResponse.json({ error: "Please attach at least one question image." }, { status: 400 });
    }

    const parts: GeminiPart[] = [
      ...encodedImages.map((img) => ({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })),
      { text: OCR_PROMPT },
    ];

    let raw = "";
    const errors: string[] = [];

    // 1. Try GitHub Models Vision first
    const ghToken = (process.env.GITHUB_MODELS_TOKEN ?? "").trim();
    if (ghToken && !raw) {
      for (const ghModel of ["openai/gpt-4.1-mini", "openai/gpt-4o-mini"]) {
        try {
          raw = await callOpenAiCompatibleVision(
            "https://models.github.ai/inference/chat/completions",
            ghToken,
            ghModel,
            encodedImages,
          );
          if (raw) break;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : ghModel);
        }
      }
    }

    // 2. Fall back to Gemini Vision
    if (!raw) {
      try {
        raw = await callGemini(parts, { jsonMode: true });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Gemini");
      }
    }

    // 3. Fall back to OpenRouter Free Vision
    const orKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
    if (!raw && orKey) {
      for (const orModel of ["google/gemma-3-27b-it:free", "openrouter/free"]) {
        try {
          raw = await callOpenAiCompatibleVision(
            "https://openrouter.ai/api/v1/chat/completions",
            orKey,
            orModel,
            encodedImages,
            { "HTTP-Referer": "https://jtec-academic-platform.vercel.app", "X-Title": "JTEC Academic Platform" },
          );
          if (raw) break;
        } catch (err) {
          errors.push(err instanceof Error ? err.message : orModel);
        }
      }
    }

    if (!raw) {
      throw new Error(`All AI vision engines busy (${errors.join(" | ")}). Please try again or use Original Photo PDF.`);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI could not parse question text cleanly.");
      parsed = JSON.parse(m[0]) as Record<string, unknown>;
    }

    return NextResponse.json({ success: true, extracted: parsed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "OCR extraction failed." },
      { status: 500 },
    );
  }
}