import { SECTION_KEYS, type ResumeDocument, type ResumeSettings, type SectionKey, type TemplateId } from "./validation";

export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback (non-cryptographic) — only used in very old environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const DEFAULT_SETTINGS: ResumeSettings = {
  primaryColor: "#1e3a5f",
  fontFamily: "inter",
  fontSize: "medium",
  spacing: "comfortable",
  pageSize: "A4",
  showPhoto: true,
  sectionOrder: [...SECTION_KEYS],
};

export function emptyDocument(overrides: Partial<ResumeDocument> = {}): ResumeDocument {
  return {
    title: "Untitled Resume",
    templateId: "modern",
    summary: "",
    profile: {
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      github: "",
      profileImage: null,
    },
    settings: { ...DEFAULT_SETTINGS, sectionOrder: [...DEFAULT_SETTINGS.sectionOrder] },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    volunteer: [],
    custom: [],
    ...overrides,
  };
}

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: "Professional Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards",
  volunteer: "Volunteer Experience",
  custom: "Custom Sections",
};

/** Ensures the section order contains every known section exactly once. */
export function normalizeSectionOrder(order: string[] | undefined | null): SectionKey[] {
  const seen = new Set<SectionKey>();
  const result: SectionKey[] = [];
  for (const k of order ?? []) {
    if ((SECTION_KEYS as readonly string[]).includes(k) && !seen.has(k as SectionKey)) {
      seen.add(k as SectionKey);
      result.push(k as SectionKey);
    }
  }
  for (const k of SECTION_KEYS) if (!seen.has(k)) result.push(k);
  return result;
}

export function sortByOrder<T extends { sortOrder: number }>(items: T[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function formatDateRange(start: string, end: string, current?: boolean) {
  const s = start?.trim();
  const e = current ? "Present" : end?.trim();
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}

export function safeFilename(fullName: string) {
  const cleaned = fullName
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .join("_");
  return `${cleaned || "Resume"}${cleaned ? "_Resume" : ""}.pdf`;
}

export function splitBullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s?/, "").trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------
export type CompletenessResult = {
  score: number;
  suggestions: string[];
  checks: { label: string; done: boolean; weight: number }[];
};

export function computeCompleteness(doc: ResumeDocument): CompletenessResult {
  const p = doc.profile;
  const checks = [
    { label: "Full name", done: p.fullName.trim().length > 1, weight: 10, hint: "Add your full name" },
    { label: "Professional headline", done: p.headline.trim().length > 2, weight: 6, hint: "Add a professional headline" },
    { label: "Email address", done: p.email.trim().length > 3, weight: 8, hint: "Add an email address" },
    { label: "Phone number", done: p.phone.trim().length > 4, weight: 5, hint: "Add a phone number" },
    { label: "Location", done: p.location.trim().length > 1, weight: 3, hint: "Add your location" },
    { label: "Professional summary", done: doc.summary.trim().length >= 80, weight: 14, hint: "Write a professional summary (at least 80 characters)" },
    { label: "Work experience", done: doc.experience.some((e) => e.position.trim() && e.company.trim()), weight: 18, hint: "Add at least one work experience" },
    {
      label: "Experience descriptions",
      done: doc.experience.length > 0 && doc.experience.every((e) => e.description.trim().length >= 40),
      weight: 8,
      hint: "Describe your responsibilities and achievements in each role",
    },
    {
      label: "Measurable achievements",
      done: doc.experience.some((e) => /\d/.test(e.description)),
      weight: 6,
      hint: "Add measurable achievements to your experience (numbers, percentages, scale)",
    },
    { label: "Education", done: doc.education.some((e) => e.institution.trim()), weight: 10, hint: "Add your education" },
    { label: "At least 3 skills", done: doc.skills.filter((s) => s.name.trim()).length >= 3, weight: 8, hint: "Add at least 3 skills" },
    { label: "Online presence", done: !!(p.linkedin.trim() || p.website.trim() || p.github.trim()), weight: 4, hint: "Add a LinkedIn, website or GitHub link" },
  ];
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.filter((c) => c.done).reduce((a, c) => a + c.weight, 0);
  return {
    score: Math.round((got / total) * 100),
    suggestions: checks.filter((c) => !c.done).map((c) => c.hint),
    checks: checks.map(({ label, done, weight }) => ({ label, done, weight })),
  };
}

// ---------------------------------------------------------------------------
// ATS analysis (heuristic, transparent, not a guarantee)
// ---------------------------------------------------------------------------
export type AtsIssue = { severity: "high" | "medium" | "low"; title: string; detail: string };
export type AtsResult = { score: number; issues: AtsIssue[]; passed: string[] };

const WEAK_VERBS = /\b(responsible for|helped|worked on|assisted with|duties included|tasked with)\b/i;
const STRONG_VERBS = /\b(led|built|designed|delivered|launched|reduced|increased|improved|owned|architected|shipped|automated|managed|drove|mentored|optimi[sz]ed|migrated|scaled|implemented)\b/i;
const DATE_RE = /^(\d{4}|(0?[1-9]|1[0-2])[\/\-.]\d{4}|[A-Za-z]{3,9}\.? \d{4}|Present)$/i;

export function analyzeAts(doc: ResumeDocument): AtsResult {
  const issues: AtsIssue[] = [];
  const passed: string[] = [];
  const p = doc.profile;

  if (!p.fullName.trim()) issues.push({ severity: "high", title: "Missing name", detail: "ATS systems need a clear candidate name at the top of the document." });
  else passed.push("Candidate name present");

  if (!p.email.trim() || !p.phone.trim())
    issues.push({ severity: "high", title: "Incomplete contact information", detail: "Include both an email address and a phone number so recruiters can reach you." });
  else passed.push("Contact information complete");

  const summaryLen = doc.summary.trim().length;
  if (summaryLen === 0) issues.push({ severity: "medium", title: "No professional summary", detail: "A 2–4 sentence summary helps parsers and recruiters understand your profile quickly." });
  else if (summaryLen < 120) issues.push({ severity: "low", title: "Summary is short", detail: "Expand your summary to 2–4 sentences that mention your role, years of experience and key strengths." });
  else if (summaryLen > 900) issues.push({ severity: "low", title: "Summary is long", detail: "Keep the summary concise — under ~150 words." });
  else passed.push("Summary length looks good");

  if (doc.experience.length === 0) issues.push({ severity: "high", title: "No work experience", detail: "Add your work history — it is the most heavily weighted section." });
  else {
    passed.push("Work experience present");
    const weak = doc.experience.filter((e) => WEAK_VERBS.test(e.description));
    if (weak.length) issues.push({ severity: "medium", title: "Weak phrasing in experience", detail: `Replace passive phrases like "responsible for" with strong action verbs in ${weak.length} role(s).` });
    const noVerbs = doc.experience.filter((e) => e.description.trim() && !STRONG_VERBS.test(e.description));
    if (noVerbs.length) issues.push({ severity: "low", title: "Few action verbs", detail: "Start bullet points with action verbs such as Led, Built, Reduced, Delivered." });
    const withNumbers = doc.experience.filter((e) => /\d+%|\$\d|\d+\s?(x|k|m|users|customers|people|engineers|hours|days|percent)/i.test(e.description));
    if (withNumbers.length === 0) issues.push({ severity: "medium", title: "No measurable achievements", detail: "Quantify impact where you truthfully can (%, revenue, users, time saved)." });
    else passed.push("Measurable achievements found");
    const shortDesc = doc.experience.filter((e) => e.description.trim().length < 40);
    if (shortDesc.length) issues.push({ severity: "medium", title: "Thin experience descriptions", detail: `${shortDesc.length} role(s) have little or no description. Add 2–5 bullet points each.` });
    const badDates = doc.experience.filter((e) => (e.startDate && !DATE_RE.test(e.startDate.trim())) || (!e.current && e.endDate && !DATE_RE.test(e.endDate.trim())));
    if (badDates.length) issues.push({ severity: "low", title: "Inconsistent date formats", detail: "Use a consistent format such as 'Jan 2022' or '2022' for all dates so parsers can read them." });
    else passed.push("Date formats are consistent");
  }

  if (doc.education.length === 0) issues.push({ severity: "medium", title: "No education", detail: "Add at least your highest level of education." });
  else passed.push("Education present");

  const skillCount = doc.skills.filter((s) => s.name.trim()).length;
  if (skillCount < 5) issues.push({ severity: "medium", title: "Few skills listed", detail: `You have ${skillCount} skill(s). Aim for 8–15 relevant skills that match job descriptions you target.` });
  else passed.push("Skills section is well populated");

  if (!p.headline.trim()) issues.push({ severity: "low", title: "No headline / target title", detail: "Add a headline such as 'Senior Backend Engineer' so the parser can match your target role." });

  if (doc.templateId === "creative") issues.push({ severity: "low", title: "Visually rich template", detail: "The Creative template uses a sidebar and decorative elements. For strict ATS pipelines consider ATS Focused or Classic." });
  if (doc.settings.showPhoto && p.profileImage) issues.push({ severity: "low", title: "Photo included", detail: "Some ATS parsers and regions discourage photos. Hide it if applying in the US/UK." });

  const weights = { high: 18, medium: 9, low: 4 };
  const penalty = issues.reduce((a, i) => a + weights[i.severity], 0);
  return { score: Math.max(0, Math.min(100, 100 - penalty)), issues, passed };
}

export const TEMPLATE_META: Record<TemplateId, { name: string; description: string; tags: string[]; accent: string }> = {
  modern: { name: "Modern", description: "Clean two-tone header with bold section markers. Great all-rounder.", tags: ["Popular", "Tech"], accent: "#1e3a5f" },
  minimal: { name: "Minimal", description: "Whitespace-first, single column, understated typography.", tags: ["Simple"], accent: "#111827" },
  executive: { name: "Executive", description: "Serif headings, centered header and formal rules for senior roles.", tags: ["Leadership"], accent: "#3b2f2f" },
  classic: { name: "Classic", description: "Traditional layout with small caps headings. Timeless and safe.", tags: ["Traditional"], accent: "#1f2937" },
  creative: { name: "Creative", description: "Colored left sidebar for contact and skills, main column for story.", tags: ["Design", "Sidebar"], accent: "#7c3aed" },
  technical: { name: "Technical", description: "Monospace accents, dense skill grid and project-forward layout.", tags: ["Engineering"], accent: "#0f766e" },
  elegant: { name: "Elegant", description: "Thin rules, generous spacing and a refined serif name treatment.", tags: ["Refined"], accent: "#9f1239" },
  ats: { name: "ATS Focused", description: "Plain single column, no graphics, maximum parser compatibility.", tags: ["ATS-safe"], accent: "#000000" },
};
