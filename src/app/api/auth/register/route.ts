import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { registerSchema } from "@/lib/validation";
import { ApiError, assertRateLimit, assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { createSession, ensureSubscription, hashPassword } from "@/server/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    assertRateLimit(req, "register", 10, 15 * 60 * 1000);
    const input = registerSchema.parse(await readJson(req, 10_000));
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
    if (existing[0]) throw new ApiError(409, "An account with this email already exists.");
    const [user] = await db
      .insert(users)
      .values({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) })
      .returning({ id: users.id, name: users.name, email: users.email });
    await ensureSubscription(user.id);
    await createSession(user.id);
    return ok({ user }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
