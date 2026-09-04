/**
 * Integration tests against the real PostgreSQL database (DATABASE_URL).
 * Verifies CRUD, relationships, duplication and ownership enforcement.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { users, experiences, resumes } from "@/db/schema";
import { createResume, updateResume, deleteResume, duplicateResume, getOwnedResume, loadDocument, listResumes } from "@/server/resumes";
import { emptyDocument, newId } from "@/lib/resume-utils";
import { demoDocument } from "@/lib/demo-resume";

const suffix = Date.now();
let userA: string;
let userB: string;

beforeAll(async () => {
  const [a] = await db.insert(users).values({ name: "Test A", email: `a-${suffix}@test.local`, passwordHash: "x" }).returning();
  const [b] = await db.insert(users).values({ name: "Test B", email: `b-${suffix}@test.local`, passwordHash: "x" }).returning();
  userA = a.id;
  userB = b.id;
});

afterAll(async () => {
  await db.delete(users).where(eq(users.id, userA));
  await db.delete(users).where(eq(users.id, userB));
  await pool.end();
});

describe("resume repository", () => {
  it("creates, reads, updates and deletes a resume with children", async () => {
    const row = await createResume(userA, emptyDocument({ title: "Integration" }));
    expect(row.userId).toBe(userA);

    const expId = newId();
    await updateResume(userA, row.id, {
      summary: "Hello",
      experience: [{ id: expId, company: "Acme", position: "Dev", location: "", startDate: "2020", endDate: "", current: true, description: "Did things" }],
      skills: [{ id: newId(), name: "TS", level: "Expert" }, { id: newId(), name: "SQL", level: "" }],
    });
    const doc = await loadDocument(row.id);
    expect(doc.summary).toBe("Hello");
    expect(doc.experience[0].id).toBe(expId);
    expect(doc.skills.map((s) => s.name)).toEqual(["TS", "SQL"]);

    // reorder persists
    await updateResume(userA, row.id, { skills: [doc.skills[1], doc.skills[0]] });
    expect((await loadDocument(row.id)).skills.map((s) => s.name)).toEqual(["SQL", "TS"]);

    const list = await listResumes(userA);
    expect(list.find((r) => r.id === row.id)?.completeness).toBeGreaterThan(0);

    await deleteResume(userA, row.id);
    const orphans = await db.select().from(experiences).where(eq(experiences.resumeId, row.id));
    expect(orphans).toHaveLength(0); // cascade
  });

  it("duplicates a resume as an independent copy", async () => {
    const src = await createResume(userA, demoDocument());
    const copy = await duplicateResume(userA, src.id);
    const a = await loadDocument(src.id);
    const b = await loadDocument(copy.id);
    expect(copy.title).toBe(`${src.title} (Copy)`);
    expect(b.experience).toHaveLength(a.experience.length);
    expect(b.experience[0].id).not.toBe(a.experience[0].id);
    await updateResume(userA, copy.id, { summary: "changed" });
    expect((await loadDocument(src.id)).summary).toBe(a.summary);
    await deleteResume(userA, src.id);
    await deleteResume(userA, copy.id);
  });

  it("enforces ownership: user B cannot read, update, duplicate or delete user A's resume", async () => {
    const row = await createResume(userA, emptyDocument({ title: "Private" }));
    await expect(getOwnedResume(userB, row.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateResume(userB, row.id, { title: "hacked" })).rejects.toMatchObject({ status: 404 });
    await expect(duplicateResume(userB, row.id)).rejects.toMatchObject({ status: 404 });
    await expect(deleteResume(userB, row.id)).rejects.toMatchObject({ status: 404 });
    const [still] = await db.select().from(resumes).where(eq(resumes.id, row.id));
    expect(still.title).toBe("Private");
    await deleteResume(userA, row.id);
  });
});
