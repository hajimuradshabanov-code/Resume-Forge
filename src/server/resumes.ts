import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  awards,
  certifications,
  customSections,
  education,
  experiences,
  languages,
  projects,
  resumeProfiles,
  resumeSettings,
  resumes,
  skills,
  usage,
  volunteerExperience,
} from "@/db/schema";
import { normalizeSectionOrder, sortByOrder, computeCompleteness, emptyDocument } from "@/lib/resume-utils";
import type { ResumeDocument, TemplateId } from "@/lib/validation";
import { notFound } from "@/lib/api";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = typeof db | Tx;

export type ResumeRecord = {
  id: string;
  userId: string;
  title: string;
  templateId: string;
  status: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ResumeWithDocument = ResumeRecord & { document: ResumeDocument };

/** Fetches a resume row while enforcing ownership. Throws 404 if not owned (never reveals existence). */
export async function getOwnedResume(userId: string, resumeId: string, client: Db = db): Promise<ResumeRecord> {
  const rows = await client
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw notFound();
  return row;
}

export async function loadDocument(resumeId: string, client: Db = db): Promise<ResumeDocument> {
  const [row] = await client.select().from(resumes).where(eq(resumes.id, resumeId)).limit(1);
  if (!row) throw notFound();
  const [profile, settings, exp, edu, sk, pr, ce, la, aw, vo, cu] = await Promise.all([
    client.select().from(resumeProfiles).where(eq(resumeProfiles.resumeId, resumeId)).limit(1),
    client.select().from(resumeSettings).where(eq(resumeSettings.resumeId, resumeId)).limit(1),
    client.select().from(experiences).where(eq(experiences.resumeId, resumeId)),
    client.select().from(education).where(eq(education.resumeId, resumeId)),
    client.select().from(skills).where(eq(skills.resumeId, resumeId)),
    client.select().from(projects).where(eq(projects.resumeId, resumeId)),
    client.select().from(certifications).where(eq(certifications.resumeId, resumeId)),
    client.select().from(languages).where(eq(languages.resumeId, resumeId)),
    client.select().from(awards).where(eq(awards.resumeId, resumeId)),
    client.select().from(volunteerExperience).where(eq(volunteerExperience.resumeId, resumeId)),
    client.select().from(customSections).where(eq(customSections.resumeId, resumeId)),
  ]);
  const base = emptyDocument();
  const p = profile[0];
  const s = settings[0];
  const strip = <T extends { resumeId: string; sortOrder: number }>(items: T[]) =>
    sortByOrder(items).map(({ resumeId: _r, sortOrder: _o, ...rest }) => {
      void _r;
      void _o;
      return rest;
    });
  return {
    title: row.title,
    templateId: row.templateId as TemplateId,
    summary: row.summary,
    profile: p
      ? {
          fullName: p.fullName,
          headline: p.headline,
          email: p.email,
          phone: p.phone,
          location: p.location,
          website: p.website,
          linkedin: p.linkedin,
          github: p.github,
          profileImage: p.profileImage,
        }
      : base.profile,
    settings: s
      ? {
          primaryColor: s.primaryColor,
          fontFamily: s.fontFamily as ResumeDocument["settings"]["fontFamily"],
          fontSize: s.fontSize as ResumeDocument["settings"]["fontSize"],
          spacing: s.spacing as ResumeDocument["settings"]["spacing"],
          pageSize: s.pageSize as ResumeDocument["settings"]["pageSize"],
          showPhoto: s.showPhoto,
          sectionOrder: normalizeSectionOrder(s.sectionOrder),
        }
      : base.settings,
    experience: strip(exp),
    education: strip(edu),
    skills: strip(sk),
    projects: strip(pr),
    certifications: strip(ce),
    languages: strip(la),
    awards: strip(aw),
    volunteer: strip(vo),
    custom: strip(cu),
  };
}

export async function getOwnedResumeWithDocument(userId: string, resumeId: string): Promise<ResumeWithDocument> {
  const row = await getOwnedResume(userId, resumeId);
  const document = await loadDocument(resumeId);
  return { ...row, document };
}

export type ResumeListItem = ResumeRecord & { completeness: number; fullName: string; headline: string };

export async function listResumes(userId: string): Promise<ResumeListItem[]> {
  const rows = await db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.updatedAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [profiles, exp, edu, sk] = await Promise.all([
    db.select().from(resumeProfiles).where(inArray(resumeProfiles.resumeId, ids)),
    db.select().from(experiences).where(inArray(experiences.resumeId, ids)),
    db.select().from(education).where(inArray(education.resumeId, ids)),
    db.select().from(skills).where(inArray(skills.resumeId, ids)),
  ]);
  return rows.map((r) => {
    const p = profiles.find((x) => x.resumeId === r.id);
    const doc = emptyDocument({
      title: r.title,
      summary: r.summary,
      profile: p
        ? { ...p, profileImage: p.profileImage }
        : emptyDocument().profile,
      experience: exp.filter((e) => e.resumeId === r.id),
      education: edu.filter((e) => e.resumeId === r.id),
      skills: sk.filter((e) => e.resumeId === r.id),
    });
    return {
      ...r,
      completeness: computeCompleteness(doc).score,
      fullName: p?.fullName ?? "",
      headline: p?.headline ?? "",
    };
  });
}

/** Writes all child rows for a document (replace semantics). */
async function writeChildren(tx: Tx, resumeId: string, doc: Partial<ResumeDocument>) {
  if (doc.profile) {
    await tx.delete(resumeProfiles).where(eq(resumeProfiles.resumeId, resumeId));
    await tx.insert(resumeProfiles).values({ resumeId, ...doc.profile });
  }
  if (doc.settings) {
    await tx.delete(resumeSettings).where(eq(resumeSettings.resumeId, resumeId));
    await tx.insert(resumeSettings).values({ resumeId, ...doc.settings, sectionOrder: normalizeSectionOrder(doc.settings.sectionOrder) });
  }
  const replace = async <T extends { id: string }>(
    table: typeof experiences | typeof education | typeof skills | typeof projects | typeof certifications | typeof languages | typeof awards | typeof volunteerExperience | typeof customSections,
    items: T[] | undefined,
  ) => {
    if (!items) return;
    await tx.delete(table).where(eq(table.resumeId, resumeId));
    if (items.length) {
       
      await tx.insert(table).values(items.map((it, i) => ({ ...it, resumeId, sortOrder: i })) as any);
    }
  };
  await replace(experiences, doc.experience);
  await replace(education, doc.education);
  await replace(skills, doc.skills);
  await replace(projects, doc.projects);
  await replace(certifications, doc.certifications);
  await replace(languages, doc.languages);
  await replace(awards, doc.awards);
  await replace(volunteerExperience, doc.volunteer);
  await replace(customSections, doc.custom);
}

export async function createResume(userId: string, doc: ResumeDocument, opts: { isDemo?: boolean } = {}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(resumes)
      .values({ userId, title: doc.title, templateId: doc.templateId, summary: doc.summary, isDemo: opts.isDemo ?? false })
      .returning();
    await writeChildren(tx, row.id, doc);
    return row;
  });
}

export async function updateResume(userId: string, resumeId: string, patch: Partial<ResumeDocument>) {
  return db.transaction(async (tx) => {
    await getOwnedResume(userId, resumeId, tx);
    const update: Partial<typeof resumes.$inferInsert> = { updatedAt: new Date() };
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.templateId !== undefined) update.templateId = patch.templateId;
    if (patch.summary !== undefined) update.summary = patch.summary;
    await tx.update(resumes).set(update).where(eq(resumes.id, resumeId));
    await writeChildren(tx, resumeId, patch);
    const [row] = await tx.select().from(resumes).where(eq(resumes.id, resumeId));
    return row;
  });
}

export async function deleteResume(userId: string, resumeId: string) {
  await getOwnedResume(userId, resumeId);
  // ON DELETE CASCADE removes all child rows
  await db.delete(resumes).where(and(eq(resumes.id, resumeId), eq(resumes.userId, userId)));
}

export async function duplicateResume(userId: string, resumeId: string) {
  const src = await getOwnedResume(userId, resumeId);
  const doc = await loadDocument(resumeId);
  const withNewIds = regenerateIds({ ...doc, title: `${src.title} (Copy)` });
  return createResume(userId, withNewIds);
}

/** Assigns fresh UUIDs to all list items so the copy is fully independent. */
export function regenerateIds(doc: ResumeDocument): ResumeDocument {
  const fresh = <T extends { id: string }>(items: T[]) => items.map((i) => ({ ...i, id: crypto.randomUUID() }));
  return {
    ...doc,
    experience: fresh(doc.experience),
    education: fresh(doc.education),
    skills: fresh(doc.skills),
    projects: fresh(doc.projects),
    certifications: fresh(doc.certifications),
    languages: fresh(doc.languages),
    awards: fresh(doc.awards),
    volunteer: fresh(doc.volunteer),
    custom: fresh(doc.custom),
  };
}

export async function recordUsage(userId: string, kind: string, resumeId?: string, metadata?: Record<string, unknown>) {
  try {
    await db.insert(usage).values({ userId, kind, resumeId: resumeId ?? null, metadata: metadata ?? null });
  } catch (e) {
    console.error("[usage] failed to record", e);
  }
}

export { demoDocument } from "@/lib/demo-resume";
