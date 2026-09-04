import { z } from "zod";
import { handleError } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { getOwnedResumeWithDocument, recordUsage } from "@/server/resumes";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const id = z.string().uuid("Resume not found.").parse((await ctx.params).id);
    const resume = await getOwnedResumeWithDocument(user.id, id);
    await recordUsage(user.id, "json_export", id);
    const payload = { version: 1 as const, app: "ResumeForge", exportedAt: new Date().toISOString(), document: resume.document };
    const filename = `${resume.title.replace(/[^\w-]+/g, "_") || "resume"}.resumeforge.json`;
    return new Response(JSON.stringify(payload, null, 2), {
      headers: { "content-type": "application/json", "content-disposition": `attachment; filename="${filename}"` },
    });
  } catch (e) {
    return handleError(e);
  }
}
