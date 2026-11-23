import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { callGemini, type GeminiPart } from "@/lib/gemini";

export const maxDuration = 60;

const OCR_PROMPT = `Transcribe this university exam / class test question paper accurately, preserving its exact academic layout and every question word-for-word.

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

    // 1. Try GitHub Models Vision first (fast, reliable, no Gemini 503 bottleneck)
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