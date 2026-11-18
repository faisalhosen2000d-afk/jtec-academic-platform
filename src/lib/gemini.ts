export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getGeminiApiKeys(): string[] {
  const multi = (process.env.GEMINI_API_KEYS || "")
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const single = (process.env.GEMINI_API_KEY || "").trim();
  const all = single ? [...multi, single] : multi;
  return Array.from(new Set(all));
}

export async function callGemini(
  parts: GeminiPart[],
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<string> {
  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  let lastError = "AI service is temporarily unavailable.";
  const startKeyIdx = Math.floor(Math.random() * keys.length);
  const perAttemptMs = options?.timeoutMs ?? 12000;
  const deadline = Date.now() + 45000;
  const maxKeysPerModel = Math.min(keys.length, 3);

  for (let m = 0; m < MODEL_CANDIDATES.length; m++) {
    const model = MODEL_CANDIDATES[m];
    for (let k = 0; k < maxKeysPerModel; k++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 3500) {
        throw new Error("AI request took too long. Please try again.");
      }

      const apiKey = keys[(startKeyIdx + k) % keys.length];
      if (!apiKey) continue;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": apiKey,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(Math.min(perAttemptMs, remainingMs - 1000)),
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
          await sleep(150);
          continue;
        }

        if (response.status === 404) {
          lastError = `Model ${model} unavailable (404).`;
          break;
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
  }

  throw new Error(lastError);
}