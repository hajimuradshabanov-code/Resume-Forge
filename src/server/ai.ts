import "server-only";
import type { AiAction } from "@/lib/validation";
import { ApiError } from "@/lib/api";

export type AiContext = { field?: string; headline?: string; position?: string; company?: string };

export interface AiProvider {
  readonly name: string;
  complete(system: string, user: string): Promise<string>;
}

const SYSTEM_BASE = `You are a professional resume writing assistant inside ResumeForge.
Rules you must never break:
1. NEVER invent facts. Do not add employers, titles, dates, degrees, certifications, awards, metrics, team sizes, budgets, technologies or achievements that are not present in the user's text.
2. Only improve wording, structure, clarity, grammar and tone.
3. If the text lacks numbers, do NOT add numbers. You may leave a bracketed placeholder like [add metric] at most once if it would clearly help.
4. Keep the user's language (respond in the same language as the input).
5. Return ONLY the rewritten text. No preamble, no explanations, no quotes, no markdown headings.`;

const ACTION_PROMPTS: Record<AiAction, string> = {
  improve: "Improve this resume text. Make it clearer, more specific and more impactful while preserving every fact exactly.",
  shorten: "Make this resume text more concise. Cut filler words and redundancy. Preserve all facts. Aim for roughly 60% of the original length.",
  expand: "Expand this resume text with useful structure and clearer phrasing. Do NOT add new facts, metrics or responsibilities that are not implied by the original. You may clarify and reorganise only.",
  professional: "Rewrite this resume text in a polished, professional tone suitable for a senior audience. Preserve all facts exactly.",
  ats: "Rewrite this resume text to be ATS-friendly: plain language, standard job terminology, strong action verbs at the start of statements, no special characters or tables, and keep keywords that already appear. Preserve all facts.",
  bullets: "Turn this rough description into 3–5 concise, professional resume bullet points. Each bullet starts with a strong action verb. One bullet per line, prefixed with '- '. Do not invent metrics or facts.",
};

function buildUserPrompt(action: AiAction, text: string, ctx?: AiContext) {
  const ctxLines: string[] = [];
  if (ctx?.field) ctxLines.push(`Field being edited: ${ctx.field}`);
  if (ctx?.headline) ctxLines.push(`Candidate headline: ${ctx.headline}`);
  if (ctx?.position) ctxLines.push(`Role: ${ctx.position}`);
  if (ctx?.company) ctxLines.push(`Company: ${ctx.company}`);
  return `${ACTION_PROMPTS[action]}\n${ctxLines.length ? "\nContext:\n" + ctxLines.join("\n") + "\n" : ""}\nOriginal text:\n"""\n${text}\n"""`;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
class OpenAiCompatibleProvider implements AiProvider {
  name = "openai";
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {}
  async complete(system: string, user: string) {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error("[ai] provider error", res.status, await res.text().catch(() => ""));
      throw new ApiError(503, "AI service temporarily unavailable. Please try again.");
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }
}

class AnthropicProvider implements AiProvider {
  name = "anthropic";
  constructor(
    private apiKey: string,
    private model: string,
  ) {}
  async complete(system: string, user: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model, max_tokens: 900, temperature: 0.4, system, messages: [{ role: "user", content: user }] }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error("[ai] provider error", res.status, await res.text().catch(() => ""));
      throw new ApiError(503, "AI service temporarily unavailable. Please try again.");
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
  }
}

export function getAiProvider(): AiProvider | null {
  const provider = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const key = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const isAnthropic = provider === "anthropic" || (!provider && !!process.env.ANTHROPIC_API_KEY && !process.env.AI_API_KEY && !process.env.OPENAI_API_KEY);
  if (isAnthropic) return new AnthropicProvider(key, process.env.AI_MODEL ?? "claude-3-5-haiku-latest");
  return new OpenAiCompatibleProvider(key, process.env.AI_MODEL ?? "gpt-4o-mini", process.env.AI_BASE_URL ?? "https://api.openai.com/v1");
}

export function isAiConfigured() {
  return getAiProvider() !== null;
}

export async function runAiAction(action: AiAction, text: string, ctx?: AiContext): Promise<string> {
  const provider = getAiProvider();
  if (!provider) {
    throw new ApiError(
      503,
      "AI assistant is not configured. Set AI_API_KEY (and optionally AI_PROVIDER / AI_MODEL) on the server to enable it.",
    );
  }
  const out = await provider.complete(SYSTEM_BASE, buildUserPrompt(action, text, ctx));
  if (!out) throw new ApiError(502, "AI returned an empty response. Please try again.");
  return out.replace(/^```[a-z]*\n?|```$/g, "").trim();
}
