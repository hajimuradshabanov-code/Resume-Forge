import { assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { createResume, demoDocument, listResumes, regenerateIds } from "@/server/resumes";
import { createResumeSchema, resumeDocumentSchema, type TemplateId } from "@/lib/validation";
import { emptyDocument } from "@/lib/resume-utils";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ resumes: await listResumes(user.id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const input = createResumeSchema.parse(await readJson(req));
    let doc;
    if (input.mode === "demo") {
      doc = demoDocument();
    } else if (input.mode === "import" && input.document) {
      // Imported documents are fully validated then re-keyed so ids are fresh
      doc = regenerateIds(resumeDocumentSchema.parse({ ...emptyDocument(), ...input.document, title: input.title }));
    } else {
      doc = emptyDocument({
        title: input.title,
        templateId: (input.templateId ?? (user.defaultTemplateId as TemplateId)) as TemplateId,
      });
      doc.settings.pageSize = (user.defaultPageSize as "A4" | "Letter") ?? "A4";
      doc.profile.fullName = user.name;
      doc.profile.email = user.email;
    }
    const row = await createResume(user.id, doc, { isDemo: input.mode === "demo" });
    return ok({ resume: row }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
