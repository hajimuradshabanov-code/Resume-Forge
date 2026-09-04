import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { loginSchema } from "@/lib/validation";
import { ApiError, assertRateLimit, assertSameOrigin, handleError, ok, readJson } from "@/lib/api";
import { createSession, ensureSubscription, verifyPassword } from "@/server/auth";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    assertRateLimit(req, "login", 20, 15 * 60 * 1000);
    const input = loginSchema.parse(await readJson(req, 10_000));
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    // Constant-ish time: always run a compare even if the user doesn't exist
    const valid = user ? await verifyPassword(input.password, user.passwordHash) : (await verifyPassword(input.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva"), false);
    if (!user || !valid) throw new ApiError(401, "Invalid email or password.");
    await ensureSubscription(user.id);
    await createSession(user.id);
    return ok({ user: { id: user.id, name: user.name, email: user.email, onboardingCompleted: user.onboardingCompleted } });
  } catch (e) {
    return handleError(e);
  }
}
