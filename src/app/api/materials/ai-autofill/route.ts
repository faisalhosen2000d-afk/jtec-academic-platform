import { NextResponse } from "next/server";
import { inflateRawSync } from "zlib";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { callGemini, type GeminiPart } from "@/lib/gemini";

function extractXmlTextFromZip(buf: Buffer, entryPattern: RegExp): string {
  const texts: string[] = [];
  let offset = 0;

  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) {
      const nextSig = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), offset + 1);
      if (nextSig === -1) break;
      offset = nextSig;
      continue;
    }

    const flags = buf.readUInt16LE(offset + 6);
    const compression = buf.readUInt16LE(offset + 8);
    let compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLen + extraLen;

    if (dataStart > buf.length) break;
    const entryName = buf.toString("utf8", nameStart, nameStart + nameLen);

    if ((flags & 0x08) !== 0 && compSize === 0) {
      const nextHeader = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), dataStart);
      const centralHeader = buf.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]), dataStart);
      const endPos = nextHeader !== -1 ? nextHeader : centralHeader !== -1 ? centralHeader : buf.length;
      compSize = Math.max(0, endPos - dataStart - 16);
    }

    const dataEnd = Math.min(buf.length, dataStart + compSize);

    if (entryPattern.test(entryName) && dataEnd > dataStart) {
      try {
        const slice = buf.subarray(dataStart, dataEnd);
        const rawXml =
          compression === 0
            ? slice.toString("utf8")
            : compression === 8
              ? inflateRawSync(slice).toString("utf8")
              : "";

        if (rawXml) {
          const cleanText = rawXml
            .replace(/<\/(w:p|a:p|w:tr)>/g, "\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/[ \t]+/g, " ")
            .replace(/\n\s+/g, "\n")
            .trim();
          if (cleanText) texts.push(cleanText);
        }
      } catch {
        // Skip malformed zip entry
      }
    }

    offset = Math.max(offset + 30, dataEnd);
  }

  return texts.join("\n").slice(0, 24000);
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
    let readContent = false;
    let extractedDocText = "";

    if (uploadedFile instanceof File && uploadedFile.size > 0 && uploadedFile.size <= 3.8 * 1024 * 1024) {
      const ft = (uploadedFile.type || "").toLowerCase();
      const ext = uploadedFile.name.split(".").pop()?.toLowerCase() ?? "";
      const buffer = Buffer.from(await uploadedFile.arrayBuffer());

      if (ext === "docx" || ft.includes("wordprocessingml")) {
        extractedDocText = extractXmlTextFromZip(buffer, /^word\/document\.xml$/i);
        if (extractedDocText.length > 20) readContent = true;
      } else if (ext === "pptx" || ft.includes("presentationml")) {
        extractedDocText = extractXmlTextFromZip(buffer, /^ppt\/slides\/slide\d+\.xml$/i);
        if (extractedDocText.length > 20) readContent = true;
      } else if (
        ft.includes("pdf") ||
        ft.includes("image") ||
        ft.includes("text/plain") ||
        ["pdf", "png", "jpg", "jpeg", "webp", "txt"].includes(ext)
      ) {
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
        readContent = true;
      }
    }

    const promptContext = [
      fileName ? `Filename: ${fileName}` : "",
      subjectLabel ? `Selected Subject: ${subjectLabel}` : "",
      extractedDocText ? `\nExtracted Document Content:\n${extractedDocText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    parts.push({
      text: `You are helping a textile engineering student at JTEC fill out an academic material upload form. Our search engine matches materials strictly by Title, Topic, and Description.\n${promptContext}\n\n${
        readContent
          ? "Read the actual document content carefully and extract exact, search-friendly academic metadata."
          : "Only filename/subject is available; infer clean academic metadata."
      }\nReturn strictly valid JSON with keys "title", "topic", and "description":\n- "title": exact, search-friendly academic title in English (include course code/name & type like Note/Suggestion/Question Analysis if present, max 85 chars, no file extension)\n- "topic": comma-separated main chapters & searchable technical keywords from inside the document (max 140 chars) so searching any topic finds this file\n- "description": clear 1-2 sentence summary of what is covered and which exam/years it helps with (max 240 chars)`,
    });

    const raw = await callGemini(parts, { jsonMode: true });
    const parsed = JSON.parse(raw) as { title?: string; topic?: string; description?: string };

    return NextResponse.json({
      success: true,
      readFullFile: readContent,
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