import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { destroySession } from "@/server/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await destroySession();
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
