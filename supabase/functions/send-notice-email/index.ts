import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTICE_EMAIL_SECRET = Deno.env.get("NOTICE_EMAIL_SECRET");

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const requestSecret = req.headers.get("x-notice-email-secret");

    if (!NOTICE_EMAIL_SECRET || requestSecret !== NOTICE_EMAIL_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const {
      noticeTitle,
      noticeContent,
      noticeUrl,
      recipients,
      publisherName,
      publisherRole,
      publisherDepartment,
    } = await req.json();

    if (
      typeof noticeTitle !== "string" ||
      typeof noticeContent !== "string" ||
      typeof noticeUrl !== "string" ||
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid request payload" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "JTEC Academic Platform <onboarding@resend.dev>",
        to: recipients,
        subject: `New Academic Notice: ${noticeTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 640px; margin: 0 auto;">
            <h2>New Academic Notice</h2>
            <p>Your department has a new notice published on JTEC Academic Platform.</p>

            <p><strong>Notice:</strong> ${noticeTitle}</p>

            <p><strong>Published by:</strong> ${publisherName ?? "JTEC Academic Platform"}</p>
            <p><strong>Role:</strong> ${publisherRole ?? "Administrator"}</p>
            <p><strong>Department:</strong> ${publisherDepartment ?? "JTEC Academic Platform"}</p>

            <p>${noticeContent}</p>

            <p>
              <a
                href="${noticeUrl}"
                style="display:inline-block;padding:10px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;"
              >
                View Notice &rarr;
              </a>
            </p>

            <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="font-size:12px;color:#6b7280;">JTEC Academic Platform</p>
          </div>
        `,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", result);

      return new Response(
        JSON.stringify({
          error: "Email could not be sent",
          details: result,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id ?? null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected email function error:", error);

    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});




