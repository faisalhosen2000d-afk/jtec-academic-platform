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

    const body = (await request.json()) as {
      noticeId?: string;
      mode?: "en" | "bn" | "ask";
      question?: string;
    };

    const noticeId = String(body.noticeId || "").trim();
    const mode = body.mode || "en";
    if (!noticeId) {
      return NextResponse.json({ success: false, error: "Notice ID is required." }, { status: 400 });
    }

    const { data: notice, error: noticeError } = await supabase
      .from("notices")
      .select("id, title, content, created_at")
      .eq("id", noticeId)
      .eq("is_archived", false)
      .maybeSingle();

    if (noticeError || !notice) {
      return NextResponse.json({ success: false, error: "Notice not found." }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data: attachments } = await serviceSupabase
      .from("notice_attachments")
      .select("file_path, file_type, file_size_bytes")
      .eq("notice_id", noticeId);

    const parts: GeminiPart[] = [];
    let attachedCount = 0;

    if (attachments && attachments.length > 0) {
      const bucket = serviceSupabase.storage.from("notice-attachments");
      for (const att of attachments.slice(0, 2)) {
        const ft = (att.file_type || "").toLowerCase();
        const isSupported = ft.includes("pdf") || ft.startsWith("image/");
        if (!isSupported || att.file_size_bytes > 4 * 1024 * 1024) continue;

        const { data: fileBlob } = await bucket.download(att.file_path);
        if (!fileBlob) continue;
        const buf = Buffer.from(await fileBlob.arrayBuffer());
        const mime = ft.includes("pdf") ? "application/pdf" : ft;
        parts.push({ inlineData: { mimeType: mime, data: buf.toString("base64") } });
        attachedCount++;
      }
    }

    const contextText = `Official Notice for JTEC (Jhenaidah Textile Engineering College, affiliated with BUTEX):
Title: ${notice.title}
Published: ${notice.created_at}
Content: ${notice.content || "(See attached file)"}${attachedCount > 0 ? `\n(${attachedCount} attachment(s) provided above)` : ""}`;

    let instruction = "";
    if (mode === "bn") {
      instruction = `নিচের নিয়ম মেনে সহজ বাংলায় (Bengali script) এই অফিশিয়াল নোটিশটির মূল পয়েন্টগুলো ৩–৫টি বুলেট পয়েন্টে লিখো:
- কাদের জন্য প্রযোজ্য (ব্যাচ/ডিপার্টমেন্ট/লেভেল-টার্ম)
- গুরুত্বপূর্ণ তারিখ ও সময়সীমা (Deadline)
- শিক্ষার্থীদের করণীয় বা ফি/ডকুমেন্ট সংক্রান্ত তথ্য (যদি থাকে)
গুরুত্বপূর্ণ: একই শব্দে বাংলা ও ইংরেজি অক্ষর মেশাবে না। ১৫০ শব্দের মধ্যে সংক্ষেপে লিখো।`;
    } else if (mode === "ask") {
      const q = String(body.question || "").trim();
      if (!q) {
        return NextResponse.json({ success: false, error: "Please enter a question." }, { status: 400 });
      }
      instruction = `Student Question: ${q}
Answer directly and accurately based ONLY on the notice content and attachments above. Reply in the same language the student asked (Bengali script or English). Keep it under 120 words.`;
    } else {
      instruction = `Extract the Key Highlights of this official notice in 3-5 concise bullet points in clear English:
- Target Audience (Batch / Department / Level-Term, if mentioned)
- Important Dates & Deadlines
- Required Student Actions / Fees / Documents (if mentioned)
Keep it under 130 words and strictly factual.`;
    }

    parts.push({ text: `${contextText}\n\n${instruction}` });
    const reply = await callGemini(parts);

    return NextResponse.json({
      success: true,
      reply: reply.trim(),
      readAttachments: attachedCount,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to analyze notice." },
      { status: 500 }
    );
  }
}