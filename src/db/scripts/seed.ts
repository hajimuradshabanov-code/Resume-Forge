/**
 * Development seed: creates a demo user with a clearly labeled Demo Resume.
 * Run with: npm run db:seed
 * Credentials: demo@resumeforge.dev / DemoPassword123!
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, pool } from "@/db";
import { users, resumes, subscriptions } from "@/db/schema";
import { demoDocument } from "@/lib/demo-resume";
import { createResume } from "@/server/resumes";

async function main() {
  const email = "demo@resumeforge.dev";
  let [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    [user] = await db.insert(users).values({ name: "Demo User", email, passwordHash: await bcrypt.hash("DemoPassword123!", 12), onboardingCompleted: true }).returning();
    await db.insert(subscriptions).values({ userId: user.id, plan: "free", status: "active" });
    console.log("Created demo user:", email, "/ DemoPassword123!");
  } else {
    console.log("Demo user already exists:", email);
  }
  const existing = await db.select({ id: resumes.id }).from(resumes).where(eq(resumes.userId, user.id));
  if (existing.length === 0) {
    const row = await createResume(user.id, demoDocument(), { isDemo: true });
    console.log("Created Demo Resume:", row.id);
  } else {
    console.log("Demo user already has", existing.length, "resume(s); skipping.");
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
