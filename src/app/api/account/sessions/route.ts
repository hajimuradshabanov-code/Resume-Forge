import { assertSameOrigin, handleError, ok } from "@/lib/api";
import { destroyOtherSessions, listSessions, requireUser } from "@/server/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ sessions: await listSessions(user.id) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const revoked = await destroyOtherSessions(user.id);
    return ok({ revoked });
  } catch (e) {
    return handleError(e);
  }
}
