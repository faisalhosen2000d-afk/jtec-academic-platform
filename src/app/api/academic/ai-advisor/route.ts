import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";
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

function pcmToWavBase64(pcmBase64: string, sampleRate = 24000): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
    }

    const rl = await checkRateLimit({ key: `ai-advisor:${user.id}`, limit: 10, windowSeconds: 60 });
    if (!rl.allowed) {
      return rateLimitExceededResponse(rl.retryAfterSeconds);
    }

    const body = (await request.json()) as {
      mode?: "analyze" | "target_plan" | "chat" | "transcribe" | "tts";
      targetCgpa?: number;
      question?: string;
      history?: ChatMsg[];
      terms?: TermInput[];
      retakes?: string[];
      studentName?: string;
      department?: string;
      audioBase64?: string;
      mimeType?: string;
      voiceLang?: "auto" | "bn" | "en";
      text?: string;
      voiceName?: string;
    };

    const mode = body.mode || "analyze";

    if (mode === "tts") {
      const rawText = String(body.text || "").replace(/\*\*/g, "").replace(/^[\s•*-]+/gm, "").replace(/[`#_~]/g, "").replace(/\s+/g, " ").trim().slice(0, 1200);
      if (!rawText) return NextResponse.json({ success: false, error: "Nothing to read." }, { status: 400 });

      const allowedVoices = new Set(["Kore", "Puck", "Aoede", "Charon"]);
      const voiceName = allowedVoices.has(String(body.voiceName)) ? String(body.voiceName) : "Kore";
      const apiKey = process.env.GEMINI_API_KEY?.trim();

      if (apiKey) {
        try {
          const gRes = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
            {
              method: "POST",
              headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
              signal: AbortSignal.timeout(12000),
              body: JSON.stringify({
                contents: [{ parts: [{ text: `Read this naturally and clearly:\n${rawText}` }] }],
                generationConfig: {
                  responseModalities: ["AUDIO"],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                },
              }),
            }
          );
          if (gRes.ok) {
            const gData = (await gRes.json().catch(() => null)) as {
              candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>;
            } | null;
            const pcmB64 = gData?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (pcmB64) {
              return NextResponse.json({ success: true, audioBase64: pcmToWavBase64(pcmB64), mimeType: "audio/wav" });
            }
          }
        } catch {
          // Fall back to standard TTS below
        }
      }

      const tl = /[\u0980-\u09FF]/.test(rawText) ? "bn" : "en";
      const chunks: string[] = [];
      let cur = "";
      for (const w of rawText.split(" ")) {
        if ((cur + " " + w).trim().length > 170) { if (cur.trim()) chunks.push(cur.trim()); cur = w; }
        else { cur = (cur + " " + w).trim(); }
      }
      if (cur.trim()) chunks.push(cur.trim());
      const bufs: Buffer[] = [];
      for (const ch of chunks) {
        const res = await fetch(`https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&q=${encodeURIComponent(ch)}`, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: "Voice audio service unavailable." }, { status: 502 });
        bufs.push(Buffer.from(await res.arrayBuffer()));
      }
      return NextResponse.json({ success: true, audioBase64: Buffer.concat(bufs).toString("base64"), mimeType: "audio/mpeg" });
    }

    if (mode === "transcribe") {
      const audioBase64 = String(body.audioBase64 || "").trim();
      const mimeType = String(body.mimeType || "audio/webm").split(";")[0] || "audio/webm";
      if (!audioBase64) {
        return NextResponse.json({ success: false, error: "No audio recorded." }, { status: 400 });
      }
      const langRule =
        body.voiceLang === "bn"
          ? "Transcribe accurately in natural Bengali script (keeping English course codes like CHEM-II, CGPA, GPA as-is)."
          : body.voiceLang === "en"
            ? "Transcribe accurately in clear English."
            : "Transcribe accurately in the exact language spoken (Bengali script, English, or natural Banglish as appropriate).";

      const text = await callGemini([
        { inlineData: { mimeType, data: audioBase64 } },
        { text: `${langRule} Return ONLY the transcribed text without quotes or extra commentary.` },
      ]);
      return NextResponse.json({ success: true, text: text.trim() });
    }

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

    const formatTermName = (key: string) => {
      const m = key.match(/^(\d+)-(\d+)$/);
      return m ? `Level ${m[1]} Term ${m[2]} (${key})` : key;
    };

    const termSummary =
      terms.length > 0
        ? terms
            .map(
              (t) =>
                `${formatTermName(t.termKey)}: GPA ${Number(t.gpa).toFixed(2)}${t.cgpa !== null ? ` (Cumulative CGPA ${Number(t.cgpa).toFixed(2)})` : ""}`
            )
            .join("; ")
        : "No published term results yet.";

    const retakeSummary = retakes.length > 0 ? retakes.join(", ") : "None";

    const baseContext = `Identity: You are "JTEC AI Academic Advisor" for JTEC (Jhenaidah Textile Engineering College, affiliated with BUTEX).
JTEC Departments: AE = Apparel Engineering, YE = Yarn Engineering, FE = Fabric Engineering, WPE = Wet Processing Engineering. Never confuse AE with Aeronautical Engineering.

Platform Architecture (Results & CGPA Calculator Sections):
- Official Results (/results): Displays this student's published term-by-term GPA, cumulative CGPA (shown from Level 1 Term 2 onward), batch rank, a 5-Segment Retake Risk Gauge (5+ uncleared retakes trigger Year Drop / Air Drop), and pending retake subject codes tracked by their origin term.
- CGPA Calculator (/cgpa-calculator): Pre-loads this student's published terms with exact Term Credits (18-23 Cr per term). Computes Quality Points = Term GPA x Term Credits, and Cumulative CGPA = Total Quality Points / Total Credits. Students can toggle terms, manually adjust any term GPA (including published terms to simulate <= 3.00 retake clearance), or click "Calculate by Courses" to compute a term GPA course-by-course.
- Retake Rule (3.00 Max Cap): Uncleared retakes are currently EXCLUDED from published term GPA. Students retake failed subjects later with a junior batch offering that term. Under JTEC/BUTEX rules, a cleared retake is capped at max 3.00 (never 4.00). If a term's current GPA is above 3.00 (e.g., 3.49), clearing a 3.00-capped retake slightly lowers that term's GPA and cumulative CGPA.

Language & Precision Rules:
1. NEVER mix Bengali and English letters inside the same word (e.g., NEVER write "অ্যাপarel" — write either "Apparel Engineering (AE)" or "অ্যাপারেল ইঞ্জিনিয়ারিং (AE)").
2. ALWAYS write term names clearly as "Level X Term Y (X-Y)" (e.g., "Level 1 Term 2 (1-2)"), NEVER "১ম-২য়" or "৩য় টার্ম".
3. Strict Scope: Answer ONLY what the student asked using ONLY this student's verified data below. Do NOT dump full CGPA/retake reports on simple greetings or name questions.

Student Profile & Data:
- Name: ${body.studentName || "JTEC Student"}
- Department: ${body.department || "Textile Engineering"}
- Completed Terms: ${completedCount}/${totalProgramTerms} (Remaining: ${remainingTerms})
- Current CGPA: ${latestCgpa > 0 ? latestCgpa.toFixed(2) : "Not published"}
- Published Term History: ${termSummary}
- Pending Retakes: ${retakeSummary}
- Active Target CGPA: ${targetCgpa.toFixed(2)} (Approx. required average GPA across remaining ${remainingTerms} terms: ${requiredAvgGpaText})`;

    let instruction = "";
    if (mode === "analyze") {
      instruction = `Provide a concise, encouraging academic progress analysis in 4-5 short bullet points:
- Current CGPA standing & GPA trend across terms
- Strongest vs weakest term
- Impact of pending retakes (if any) and what to prioritize next term
Keep it under 140 words. Use plain text and simple numbers (no LaTeX).`;
    } else if (mode === "target_plan") {
      instruction = `Create a practical, realistic action plan to reach Target CGPA ${targetCgpa.toFixed(2)}:
- State clearly whether ~${requiredAvgGpaText} GPA per remaining term is realistic (if > 4.00, state honestly that 4.00 is the max and show the highest achievable CGPA instead)
- Explain briefly how higher-credit upcoming terms help lift CGPA faster
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
Answer directly, accurately, and concisely based on the student's actual JTEC term results, retakes, and the JTEC Credit-Weighted CGPA mechanism above. ${
        body.voiceLang === "bn"
          ? "Reply in clear, natural Bengali script (বাংলা). Keep course codes like CHEM-II, CGPA, GPA in English."
          : body.voiceLang === "en"
            ? "Reply in clear English."
            : "Reply in the same language the student asked (Bengali script or English; avoid messy Banglish)."
      } Keep it under 180 words and use plain math (no LaTeX).`;
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