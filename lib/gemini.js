const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class RateLimitError extends Error {}

export async function gemini(prompt, { json = false, grounding = false, temperature = 0.7 } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing. Add it to your environment variables.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  if (json) body.generationConfig.responseMimeType = "application/json";
  if (grounding && !json) body.tools = [{ google_search: {} }];

  let lastStatus = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
    });
    lastStatus = res.status;
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * 2 ** attempt);
      continue;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini error ${res.status}: ${t.slice(0, 300)}`);
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new Error("Gemini returned an empty answer.");
    return text;
  }
  if (lastStatus === 429) throw new RateLimitError("Gemini is busy right now. Try again in a minute.");
  throw new Error(`Gemini is not responding (status ${lastStatus}).`);
}

// AI kabhi kabhi JSON ke saath ``` laga deta hai, us ko saaf kar ke parse karta hai
export function parseJSON(text) {
  const clean = String(text).replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.search(/[\[{]/);
    const end = Math.max(clean.lastIndexOf("]"), clean.lastIndexOf("}"));
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("Could not read the AI's JSON response.");
  }
}

// Ek waqt mein sirf `limit` calls chalata hai, taake free quota par 429 na aaye
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
