import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertRateLimit, assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";
import { destroyOtherSessions, hashPassword, requireUser, verifyPassword } from "@/server/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    assertRateLimit(req, `pw:${user.id}`, 10, 15 * 60 * 1000);
    const input = changePasswordSchema.parse(await readJson(req, 10_000));
    const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
    if (!row || !(await verifyPassword(input.currentPassword, row.hash))) throw new ApiError(403, "Current password is incorrect.");
    await db.update(users).set({ passwordHash: await hashPassword(input.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    const revoked = await destroyOtherSessions(user.id);
    return ok({ ok: true, revokedSessions: revoked });
  } catch (e) {
    return handleError(e);
  }
}
