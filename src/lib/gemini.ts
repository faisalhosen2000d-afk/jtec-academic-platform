export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const MODEL_CANDIDATES = ["gemini-3.8-flash", "gemini-flash-latest"] as const;

export async function callGemini(parts: GeminiPart[], options?: { jsonMode?: boolean }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  let lastError = "AI service is temporarily unavailable.";

  for (const model of MODEL_CANDIDATES) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.35,
            ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
          },
        }),
      }
    );

    if (response.status === 429) {
      throw new Error("AI is busy right now due to free-tier limits. Please try again in a minute.");
    }

    if (response.status === 404) {
      lastError = `Model ${model} not found.`;
      continue;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      lastError = data?.error?.message || `Gemini API error (${response.status})`;
      continue;
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error(lastError);
}