import { z } from "zod";
import { assertRateLimit, assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { getOwnedResume, recordUsage } from "@/server/resumes";
import { aiRequestSchema } from "@/lib/validation";
import { runAiAction } from "@/server/ai";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    assertRateLimit(req, `ai:${user.id}`, 40, 60 * 60 * 1000);
    const id = z.string().uuid("Resume not found.").parse((await ctx.params).id);
    await getOwnedResume(user.id, id);
    const input = aiRequestSchema.parse(await readJson(req, 50_000));
    const result = await runAiAction(input.action, input.text, input.context);
    await recordUsage(user.id, "ai_request", id, { action: input.action });
    return ok({ result });
  } catch (e) {
    return handleError(e);
  }
}
