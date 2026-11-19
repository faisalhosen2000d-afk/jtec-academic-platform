export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

const MODEL_CANDIDATES = [
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
] as const;

const GROQ_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
] as const;

const OPENROUTER_MODELS = [
  "openrouter/free",
  "google/gemma-3-27b-it:free",
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

function getKeys(envMulti: string | undefined, envSingle: string | undefined): string[] {
  const multi = (envMulti || "")
    .split(/[\s,;]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const single = (envSingle || "").trim();
  const all = single ? [...multi, single] : multi;
  return Array.from(new Set(all));
}

function cleanJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const start =
    firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
      ? firstBrace
      : firstBracket;
  if (start !== -1) {
    const closeChar = start === firstBrace ? "}" : "]";
    const end = trimmed.lastIndexOf(closeChar);
    if (end > start) return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

async function callGroqText(
  promptText: string,
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<{ text: string | null; error?: string }> {
  const groqKeys = getKeys(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY);
  if (groqKeys.length === 0 || !promptText.trim()) return { text: null };

  const startIdx = Math.floor(Math.random() * groqKeys.length);
  let lastErr = "";

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
          signal: AbortSignal.timeout(Math.min(options?.timeoutMs ?? 12000, 14000)),
          body: JSON.stringify({
            model,
            temperature: 0.25,
            max_tokens: 4096,
            reasoning_effort: "low",
            messages: [
              ...(options?.jsonMode
                ? [{ role: "system", content: "Return ONLY valid JSON. No markdown, no extra text." }]
                : []),
              { role: "user", content: promptText },
            ],
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        } | null;

        if (!res.ok) {
          lastErr = `Groq(${model} ${res.status}): ${data?.error?.message || "request failed"}`;
          if (res.status === 429 || res.status === 503) await sleep(120);
          continue;
        }
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          return { text: options?.jsonMode ? cleanJsonString(content) : content };
        }
      } catch (err) {
        lastErr = err instanceof Error ? `Groq(${model}): ${err.message}` : "Groq timeout";
        continue;
      }
    }
  }
  return { text: null, error: lastErr };
}

async function callOpenRouterText(
  promptText: string,
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<{ text: string | null; error?: string }> {
  const orKeys = getKeys(process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY);
  if (orKeys.length === 0 || !promptText.trim()) return { text: null };

  const startIdx = Math.floor(Math.random() * orKeys.length);
  let lastErr = "";

  for (let m = 0; m < OPENROUTER_MODELS.length; m++) {
    const model = OPENROUTER_MODELS[m];
    if (!model) continue;
    for (let k = 0; k < Math.min(orKeys.length, 2); k++) {
      const apiKey = orKeys[(startIdx + k) % orKeys.length];
      if (!apiKey) continue;
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://jtec-academic-platform.vercel.app",
            "X-Title": "JTEC Academic Platform",
          },
          signal: AbortSignal.timeout(Math.min(options?.timeoutMs ?? 12000, 14000)),
          body: JSON.stringify({
            model,
            temperature: 0.25,
            max_tokens: 3000,
            messages: [
              ...(options?.jsonMode
                ? [{ role: "system", content: "Return ONLY valid JSON. No markdown, no extra text." }]
                : []),
              { role: "user", content: promptText },
            ],
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          choices?: Array<{ message?: { content?: string } }>;
          error?: { message?: string };
        } | null;

        if (!res.ok) {
          lastErr = `OpenRouter(${model} ${res.status}): ${data?.error?.message || "request failed"}`;
          if (res.status === 429 || res.status === 503) await sleep(120);
          continue;
        }
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) {
          return { text: options?.jsonMode ? cleanJsonString(content) : content };
        }
      } catch (err) {
        lastErr = err instanceof Error ? `OpenRouter(${model}): ${err.message}` : "OpenRouter timeout";
        continue;
      }
    }
  }
  return { text: null, error: lastErr };
}

export async function callGemini(
  parts: GeminiPart[],
  options?: { jsonMode?: boolean; timeoutMs?: number }
): Promise<string> {
  const hasBinary = parts.some((p) => "inlineData" in p);
  const fallbackErrors: string[] = [];

  if (!hasBinary) {
    const combinedText = parts
      .map((p) => ("text" in p ? p.text : ""))
      .filter(Boolean)
      .join("\n\n");

    const groqRes = await callGroqText(combinedText, options);
    if (groqRes.text) return groqRes.text;
    if (groqRes.error) fallbackErrors.push(groqRes.error);

    const orRes = await callOpenRouterText(combinedText, options);
    if (orRes.text) return orRes.text;
    if (orRes.error) fallbackErrors.push(orRes.error);
  }

  const keys = getGeminiApiKeys();
  if (keys.length === 0) {
    throw new Error(fallbackErrors.join(" | ") || "AI API key is not configured on the server.");
  }

  let lastError = "AI service is temporarily unavailable.";
  const startKeyIdx = Math.floor(Math.random() * keys.length);
  const perAttemptMs = Math.min(options?.timeoutMs ?? 12000, 18000);
  const deadline = Date.now() + 42000;
  const maxKeysPerModel = Math.min(keys.length, 2);

  for (let m = 0; m < MODEL_CANDIDATES.length; m++) {
    const model = MODEL_CANDIDATES[m];
    for (let k = 0; k < maxKeysPerModel; k++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 3500) {
        throw new Error([...fallbackErrors, lastError].filter(Boolean).join(" | "));
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
          lastError = `Gemini(${model} ${response.status})`;
          await sleep(150);
          continue;
        }

        if (response.status === 404) {
          lastError = `Gemini(${model} 404)`;
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
          return options?.jsonMode ? cleanJsonString(text) : text;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "AI request timed out.";
        continue;
      }
    }
  }

  throw new Error([...fallbackErrors, lastError].filter(Boolean).join(" | "));
}