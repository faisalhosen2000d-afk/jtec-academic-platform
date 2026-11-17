export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGemini(parts: GeminiPart[], options?: { jsonMode?: boolean }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  let lastError = "AI service is temporarily unavailable.";

  for (let i = 0; i < MODEL_CANDIDATES.length; i++) {
    const model = MODEL_CANDIDATES[i];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": apiKey,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(8500),
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.35,
              ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
            },
          }),
        }
      );

      if (response.status === 429 || response.status === 503) {
        lastError =
          response.status === 429
            ? "AI is experiencing high traffic right now. Please try again in a few seconds."
            : `Model ${model} temporarily unavailable (503).`;
        await sleep(350);
        continue;
      }

      if (response.status === 404) {
        lastError = `Model ${model} unavailable (404).`;
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
    } catch (err) {
      lastError = err instanceof Error ? err.message : "AI request timed out.";
      continue;
    }
  }

  throw new Error(lastError);
}