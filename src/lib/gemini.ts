export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
] as const;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
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

function getGroqApiKeys(): string[] {
  const multi = (process.env.GROQ_API_KEYS || "")
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const single = (process.env.GROQ_API_KEY || "").trim();
  const all = single ? [...multi, single] : multi;
  return Array.from(new Set(all));
}

async function callGroqText(
  promptText: string,
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<string | null> {
  const groqKeys = getGroqApiKeys();
  if (groqKeys.length === 0 || !promptText.trim()) return null;

  const startIdx = Math.floor(Math.random() * groqKeys.length);
  for (let m = 0; m < GROQ_MODELS.length; m++) {
    const model = GROQ_MODELS[m];
    if (!model) continue;
    for (let k = 0; k < Math.min(groqKeys.length, 2); k++) {
      const apiKey = groqKeys[(startIdx + k) % groqKeys.length];
      if (!apiKey) continue;
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(Math.min(options?.timeoutMs ?? 15000, 20000)),
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [{ role: "user", content: promptText }],
            ...(options?.jsonMode ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (!res.ok) {
          if (res.status === 429 || res.status === 503) {
            await sleep(120);
            continue;
          }
          continue;
        }
        const data = (await res.json().catch(() => null)) as {
          choices?: Array<{ message?: { content?: string } }>;
        } | null;
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function callGemini(
  parts: GeminiPart[],
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<string> {
  const hasBinary = parts.some((p) => "inlineData" in p);

  if (!hasBinary) {
    const combinedText = parts
      .map((p) => ("text" in p ? p.text : ""))
      .filter(Boolean)
      .join("\n\n");
    const groqResult = await callGroqText(combinedText, options);
    if (groqResult) return groqResult;
  }

  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error("AI API key is not configured on the server.");
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
                ...(model?.startsWith("gemini-2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
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