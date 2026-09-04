import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, subscriptions } from "@/db/schema";
import { cache } from "react";

export const SESSION_COOKIE = "rf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  theme: string;
  defaultTemplateId: string;
  defaultPageSize: string;
  onboardingCompleted: boolean;
  createdAt: Date;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    ipAddress: (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim().slice(0, 64) || null,
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroyOtherSessions(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const current = token ? hashToken(token) : null;
  const all = await db.select({ id: sessions.id, tokenHash: sessions.tokenHash }).from(sessions).where(eq(sessions.userId, userId));
  const toDelete = all.filter((s) => s.tokenHash !== current).map((s) => s.id);
  for (const id of toDelete) {
    await db.delete(sessions).where(eq(sessions.id, id));
  }
  return toDelete.length;
}

export async function listSessions(userId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const current = token ? hashToken(token) : null;
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())));
  return rows.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: s.tokenHash === current,
  }));
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      sessionId: sessions.id,
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      theme: users.theme,
      defaultTemplateId: users.defaultTemplateId,
      defaultPageSize: users.defaultPageSize,
      onboardingCompleted: users.onboardingCompleted,
      createdAt: users.createdAt,
      lastActiveAt: sessions.lastActiveAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  // Touch last active at most once per 10 minutes
  if (Date.now() - new Date(row.lastActiveAt).getTime() > 10 * 60 * 1000) {
    db.update(sessions).set({ lastActiveAt: new Date() }).where(eq(sessions.id, row.sessionId)).catch(() => {});
  }
  const { sessionId: _s, lastActiveAt: _l, ...user } = row;
  void _s;
  void _l;
  return user;
});

export class AuthError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function ensureSubscription(userId: string) {
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(subscriptions).values({ userId, plan: "free", status: "active" }).returning();
  return created;
}
