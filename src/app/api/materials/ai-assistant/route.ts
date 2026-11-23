import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createMaterialSignedUrl, downloadMaterialBuffer } from "@/lib/material-storage";
import { PDFDocument } from "pdf-lib";
import { callGemini, type GeminiPart } from "@/lib/gemini";

type AiMode = "summary_en" | "summary_bn" | "questions" | "ask";

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

    const body = await request.json().catch(() => null);
    const materialId = String(body?.materialId ?? "").trim();
    const mode = body?.mode as AiMode;
    const question = String(body?.question ?? "").trim();
    const sampledPdfBase64 = typeof body?.sampledPdfBase64 === "string" ? body.sampledPdfBase64.trim() : "";

    if (!materialId || !["summary_en", "summary_bn", "questions", "ask"].includes(mode)) {
      return NextResponse.json({ success: false, error: "Invalid AI request." }, { status: 400 });
    }

    if (mode === "ask" && (!question || question.length > 600)) {
      return NextResponse.json({ success: false, error: "Please enter a concise question (1-600 characters)." }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();

    const { data: profile } = await serviceSupabase
      .from("profiles")
      .select("role, is_verified")
      .eq("id", user.id)
      .maybeSingle();

    const isAllowed =
      profile &&
      ((profile.role === "student" && profile.is_verified === true) ||
        ["admin", "super_admin", "moderator"].includes(profile.role));

    if (!isAllowed) {
      return NextResponse.json({ success: false, error: "Only verified students can use the AI Study Assistant." }, { status: 403 });
    }

    type MaterialAiRow = {
      id: string;
      title: string;
      description: string | null;
      topic: string | null;
      file_path: string;
      file_type: string;
      file_size_bytes: number;
      ai_summary_en: string | null;
      ai_summary_bn: string | null;
      ai_questions: { q: string; hint: string }[] | null;
    };

    const { data: rawMat, error: matErr } = await serviceSupabase
      .from("materials")
      .select("id, title, description, topic, file_path, file_type, file_size_bytes, ai_summary_en, ai_summary_bn, ai_questions" as never)
      .eq("id", materialId)
      .eq("status", "approved")
      .maybeSingle();

    const material = rawMat as unknown as MaterialAiRow | null;

    if (matErr) {
      return NextResponse.json({ success: false, error: `DB error: ${matErr.message}` }, { status: 500 });
    }
    if (!material) {
      return NextResponse.json({ success: false, error: "Material not found." }, { status: 404 });
    }

    if (mode === "summary_en" && material.ai_summary_en) {
      return NextResponse.json({ success: true, cached: true, content: material.ai_summary_en });
    }
    if (mode === "summary_bn" && material.ai_summary_bn) {
      return NextResponse.json({ success: true, cached: true, content: material.ai_summary_bn });
    }
    if (mode === "questions" && Array.isArray(material.ai_questions) && material.ai_questions.length > 0) {
      return NextResponse.json({ success: true, cached: true, questions: material.ai_questions });
    }

    const contextHeader = [
      `Title: ${material.title}`,
      material.topic ? `Topic: ${material.topic}` : "",
      material.description ? `Description: ${material.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const parts: GeminiPart[] = [];

    const ft = (material.file_type || "").toLowerCase();
    const canAttachInline =
      material.file_path &&
      material.file_size_bytes <= 25 * 1024 * 1024 &&
      (ft.includes("pdf") || ft.includes("image") || ft.includes("text/plain"));

    if (sampledPdfBase64 && sampledPdfBase64.length <= 3_500_000) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: sampledPdfBase64,
        },
      });
    } else if (material.file_path && ft.includes("pdf") && material.file_size_bytes > 25 * 1024 * 1024 && !body?.skipClientSample) {
      const signedUrl = await createMaterialSignedUrl(serviceSupabase, material.file_path, 120); const signed = signedUrl ? { signedUrl } : null;
      if (signed?.signedUrl) {
        return NextResponse.json({
          success: true,
          needsClientSample: true,
          signedUrl: signed.signedUrl,
        });
      }
    } else if (canAttachInline) {
      const downloadedBuffer = await downloadMaterialBuffer(serviceSupabase, material.file_path); if (downloadedBuffer) { let buffer = downloadedBuffer;
        if (ft.includes("pdf") && buffer.length > 1.2 * 1024 * 1024) {
          try {
            const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
            const totalPages = srcDoc.getPageCount();
            if (totalPages > 6) {
              const sampledDoc = await PDFDocument.create();
              const indices = Array.from({ length: 6 }, (_, i) =>
                Math.min(totalPages - 1, Math.floor((i * (totalPages - 1)) / 5))
              );
              const uniqueIndices = Array.from(new Set(indices));
              const copied = await sampledDoc.copyPages(srcDoc, uniqueIndices);
              copied.forEach((p) => sampledDoc.addPage(p));
              buffer = Buffer.from(await sampledDoc.save());
              if (buffer.length > 2.5 * 1024 * 1024) {
                const tinyDoc = await PDFDocument.create();
                const tinyIndices = Array.from(new Set([0, Math.floor(totalPages / 2), totalPages - 1]));
                const tinyCopied = await tinyDoc.copyPages(srcDoc, tinyIndices);
                tinyCopied.forEach((p) => tinyDoc.addPage(p));
                buffer = Buffer.from(await tinyDoc.save());
              }
            }
          } catch {
            // fallback to original buffer if sampling fails
          }
        }
        const mime = ft.includes("pdf")
          ? "application/pdf"
          : ft.includes("png")
            ? "image/png"
            : ft.includes("webp")
              ? "image/webp"
              : ft.includes("text/plain")
                ? "text/plain"
                : "image/jpeg";
        parts.push({
          inlineData: {
            mimeType: mime,
            data: buffer.toString("base64"),
          },
        });
      }
    }

    if (mode === "summary_en") {
      parts.push({
        text: `You are an academic assistant for textile engineering students at JTEC.\n${contextHeader}\n\nList ONLY the main topics covered in this material so a student immediately knows what is inside, and under each topic write a concise 1-2 line definition or core formula. Keep it clean and under 240 words. Write formulas in plain readable math (e.g., A_T, x^2, ×, ÷, ≈, μ, /) and NEVER use LaTeX syntax like $, $$, \\frac, \\text, or --.`,
      });
      const content = await callGemini(parts, { timeoutMs: 24000 });
      await serviceSupabase.from("materials").update({ ai_summary_en: content } as never).eq("id", material.id);
      return NextResponse.json({ success: true, cached: false, content });
    }

    if (mode === "summary_bn") {
      parts.push({
        text: `You are an academic assistant for textile engineering students at JTEC.\n${contextHeader}\n\nList ONLY the main topics covered in this material in simple, clear Bangla (keep technical terms in English in parentheses), and under each topic write a concise 1-2 line definition or core formula in simple Bangla. Keep it under 220 words. Write formulas plainly (e.g., A_T, x^2, ×, ÷, ≈, μ, /) and NEVER use LaTeX like $, $$, \\frac, \\text, or --.`,
      });
      const content = await callGemini(parts, { timeoutMs: 24000 });
      await serviceSupabase.from("materials").update({ ai_summary_bn: content } as never).eq("id", material.id);
      return NextResponse.json({ success: true, cached: false, content });
    }

    if (mode === "questions") {
      parts.push({
        text: `You are an academic exam-prep assistant for textile engineering students at JTEC.\n${contextHeader}\n\nGenerate exactly 5 likely exam practice questions based on this material, each with a concise 1-2 sentence answer hint. Return strictly valid JSON array of objects with keys "q" and "hint": [{"q":"...","hint":"..."}]`,
      });
      const raw = await callGemini(parts, { jsonMode: true, timeoutMs: 24000 });
      const parsed = JSON.parse(raw);
      const questions = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
      if (questions.length > 0) {
        await serviceSupabase.from("materials").update({ ai_questions: questions } as never).eq("id", material.id);
      }
      return NextResponse.json({ success: true, cached: false, questions });
    }

    const extraSummary = [material.ai_summary_en ? `\nSummary (EN):\n${material.ai_summary_en}` : "", material.ai_summary_bn ? `\nSummary (BN):\n${material.ai_summary_bn}` : ""].filter(Boolean).join("");
    parts.push({
      text: `You are a helpful academic tutor for JTEC textile engineering students.\n${contextHeader}${extraSummary}\n\nStudent Question: ${question}\n\nAnswer clearly and concisely in the same language as the student's question (Bangla or English). Write formulas plainly (e.g., A_T, x^2, /) and NEVER use LaTeX like $, $$, \\frac, or \\text.`,
    });
    const answer = await callGemini(parts, { timeoutMs: 24000 });
    return NextResponse.json({ success: true, answer });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI request failed." },
      { status: 500 }
    );
  }
}