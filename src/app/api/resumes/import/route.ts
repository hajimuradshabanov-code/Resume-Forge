import { ApiError, assertRateLimit, assertSameOrigin, handleError, ok } from "@/lib/api";
import { requireUser } from "@/server/auth";
import { detectKind, extractText, MAX_IMPORT_BYTES, parseResumeText } from "@/server/import-parser";
import { exportedResumeSchema, resumeDocumentSchema } from "@/lib/validation";
import { recordUsage } from "@/server/resumes";

/**
 * Parses an uploaded resume (PDF / DOCX / JSON) and returns a structured
 * document for the user to REVIEW. Nothing is written to the database here.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    assertRateLimit(req, `import:${user.id}`, 30, 60 * 60 * 1000);
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_IMPORT_BYTES + 4096) throw new ApiError(413, "File too large. Maximum size is 8 MB.");
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file uploaded.");
    if (file.size > MAX_IMPORT_BYTES) throw new ApiError(413, "File too large. Maximum size is 8 MB.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = detectKind(buffer, file.name, file.type);

    if (kind === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(buffer.toString("utf8"));
      } catch {
        throw new ApiError(400, "Invalid JSON file.");
      }
      const asExport = exportedResumeSchema.safeParse(parsed);
      const document = asExport.success ? asExport.data.document : resumeDocumentSchema.parse(parsed);
      await recordUsage(user.id, "import", undefined, { kind });
      return ok({ kind, document, warnings: [] });
    }

    let text = "";
    try {
      text = await extractText(buffer, kind);
    } catch (e) {
      console.error("[import] extraction failed", e);
      throw new ApiError(422, "We couldn't read this file. It may be scanned, encrypted or corrupted.");
    }
    if (text.trim().length < 20) throw new ApiError(422, "No readable text was found in this file.");
    const { document, warnings } = parseResumeText(text);
    await recordUsage(user.id, "import", undefined, { kind });
    return ok({ kind, document, warnings, rawText: text.slice(0, 20000) });
  } catch (e) {
    return handleError(e);
  }
}
