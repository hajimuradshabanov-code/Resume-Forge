import { z } from "zod";
import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { duplicateResume } from "@/server/resumes";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const id = z.string().uuid("Resume not found.").parse((await ctx.params).id);
    const row = await duplicateResume(user.id, id);
    return ok({ resume: row }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
