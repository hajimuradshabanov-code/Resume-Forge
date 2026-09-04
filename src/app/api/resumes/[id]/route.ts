import { z } from "zod";
import { assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { deleteResume, getOwnedResumeWithDocument, updateResume } from "@/server/resumes";
import { resumeUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid("Resume not found.");

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const id = idSchema.parse((await ctx.params).id);
    const resume = await getOwnedResumeWithDocument(user.id, id);
    return ok({ resume });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const id = idSchema.parse((await ctx.params).id);
    const patch = resumeUpdateSchema.parse(await readJson(req));
    const row = await updateResume(user.id, id, patch);
    return ok({ resume: row, savedAt: row.updatedAt });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const id = idSchema.parse((await ctx.params).id);
    await deleteResume(user.id, id);
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
