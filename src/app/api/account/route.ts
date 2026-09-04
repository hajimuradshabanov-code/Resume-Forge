import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { deleteAccountSchema, updateAccountSchema } from "@/lib/validation";
import { destroySession, requireUser, verifyPassword } from "@/server/auth";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const input = updateAccountSchema.parse(await readJson(req));
    if (input.image && !/^data:image\/(png|jpeg|webp);base64,/.test(input.image)) throw new ApiError(400, "Invalid image.");
    const [updated] = await db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning({ id: users.id, name: users.name, email: users.email, image: users.image, theme: users.theme, defaultTemplateId: users.defaultTemplateId, defaultPageSize: users.defaultPageSize, onboardingCompleted: users.onboardingCompleted });
    return ok({ user: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const input = deleteAccountSchema.parse(await readJson(req, 10_000));
    const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
    if (!row || !(await verifyPassword(input.password, row.hash))) throw new ApiError(403, "Incorrect password.");
    await destroySession();
    await db.delete(users).where(eq(users.id, user.id)); // cascades to resumes, sessions, subscriptions, usage
    return ok({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
