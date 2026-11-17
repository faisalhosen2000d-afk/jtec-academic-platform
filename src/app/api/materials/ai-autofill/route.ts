import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { callGemini, type GeminiPart } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication is required." }, { status: 401 });
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
      return NextResponse.json({ success: false, error: "Only verified students can use AI Auto-Fill." }, { status: 403 });
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const fileName = String(formData.get("fileName") ?? "").trim();
    const subjectLabel = String(formData.get("subjectLabel") ?? "").trim();

    const parts: GeminiPart[] = [];
    let attachedFile = false;

    if (uploadedFile instanceof File && uploadedFile.size > 0 && uploadedFile.size <= 3.8 * 1024 * 1024) {
      const ft = (uploadedFile.type || "").toLowerCase();
      const ext = uploadedFile.name.split(".").pop()?.toLowerCase() ?? "";
      const isSupportedInline =
        ft.includes("pdf") ||
        ft.includes("image") ||
        ft.includes("text/plain") ||
        ["pdf", "png", "jpg", "jpeg", "webp", "txt"].includes(ext);

      if (isSupportedInline) {
        const buffer = Buffer.from(await uploadedFile.arrayBuffer());
        const mime =
          ft.includes("pdf") || ext === "pdf"
            ? "application/pdf"
            : ft.includes("png") || ext === "png"
              ? "image/png"
              : ft.includes("webp") || ext === "webp"
                ? "image/webp"
                : ft.includes("text/plain") || ext === "txt"
                  ? "text/plain"
                  : "image/jpeg";

        parts.push({
          inlineData: {
            mimeType: mime,
            data: buffer.toString("base64"),
          },
        });
        attachedFile = true;
      }
    }

    const promptContext = [
      fileName ? `Filename: ${fileName}` : "",
      subjectLabel ? `Subject: ${subjectLabel}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    parts.push({
      text: `You are helping a textile engineering student at JTEC fill out an academic material upload form.\n${promptContext}\n\n${
        attachedFile
          ? "Read the attached document carefully (headings, cover, and chapters)."
          : "Based on the filename and subject above, infer clean academic metadata."
      }\nReturn strictly valid JSON with keys "title", "topic", and "description":\n- "title": clean, concise academic title (max 80 chars, no file extension)\n- "topic": main chapter/unit or key topics covered (max 80 chars)\n- "description": clear 1-2 sentence summary of what students will learn from this file (max 220 chars)`,
    });

    const raw = await callGemini(parts, { jsonMode: true });
    const parsed = JSON.parse(raw) as { title?: string; topic?: string; description?: string };

    return NextResponse.json({
      success: true,
      readFullFile: attachedFile,
      title: String(parsed?.title ?? "").trim().slice(0, 180),
      topic: String(parsed?.topic ?? "").trim().slice(0, 250),
      description: String(parsed?.description ?? "").trim().slice(0, 1000),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "AI Auto-Fill failed." },
      { status: 500 }
    );
  }
}