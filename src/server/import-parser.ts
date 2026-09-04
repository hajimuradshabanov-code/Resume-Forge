import "server-only";
import { emptyDocument, newId } from "@/lib/resume-utils";
import type { ResumeDocument } from "@/lib/validation";
import { ApiError } from "@/lib/api";

export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

const PDF_MAGIC = "%PDF";
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export type ImportKind = "pdf" | "docx" | "json";

export function detectKind(buffer: Buffer, filename: string, mime: string): ImportKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const head = buffer.subarray(0, 4);
  if (head.toString("latin1") === PDF_MAGIC) return "pdf";
  if (ZIP_MAGIC.every((b, i) => head[i] === b) && (ext === "docx" || mime.includes("wordprocessingml"))) return "docx";
  if (ext === "json" || mime.includes("json")) {
    const text = buffer.toString("utf8").trimStart();
    if (text.startsWith("{")) return "json";
  }
  throw new ApiError(400, "Invalid file. Upload a PDF, DOCX or ResumeForge JSON export.");
}

export async function extractText(buffer: Buffer, kind: ImportKind): Promise<string> {
  if (kind === "pdf") {
    const { extractText: unpdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await unpdfExtract(pdf, { mergePages: true });
    return typeof text === "string" ? text : (text as string[]).join("\n");
  }
  if (kind === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf8");
}

// ---------------------------------------------------------------------------
// Heuristic section parser for plain resume text
// ---------------------------------------------------------------------------
const SECTION_PATTERNS: { key: string; re: RegExp }[] = [
  { key: "summary", re: /^(professional\s+)?(summary|profile|about( me)?|objective)\s*:?$/i },
  { key: "experience", re: /^(work|professional|employment)?\s*(experience|history)\s*:?$/i },
  { key: "education", re: /^(education|academic background|qualifications)\s*:?$/i },
  { key: "skills", re: /^(technical\s+)?(skills|competencies|technologies|core competencies)\s*:?$/i },
  { key: "projects", re: /^(projects|personal projects|selected projects)\s*:?$/i },
  { key: "certifications", re: /^(certifications?|licenses?( & certifications?)?)\s*:?$/i },
  { key: "languages", re: /^languages?\s*:?$/i },
  { key: "awards", re: /^(awards|honors|achievements)( & awards)?\s*:?$/i },
  { key: "volunteer", re: /^(volunteer(ing)?( experience)?|community)\s*:?$/i },
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i;
const URL_RE = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.(?:dev|io|com|me|net|org)(?:\/[\w-]*)?/i;
const DATE_RANGE_RE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—to]+\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now)/i;

export function parseResumeText(raw: string): { document: ResumeDocument; warnings: string[] } {
  const warnings: string[] = [];
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const doc = emptyDocument({ title: "Imported Resume" });

  // Contact info from whole text
  const text = lines.join("\n");
  doc.profile.email = text.match(EMAIL_RE)?.[0] ?? "";
  doc.profile.phone = text.match(PHONE_RE)?.[0]?.trim() ?? "";
  doc.profile.linkedin = text.match(LINKEDIN_RE)?.[0] ?? "";
  doc.profile.github = text.match(GITHUB_RE)?.[0] ?? "";
  const site = text.match(URL_RE)?.[0];
  if (site && !/linkedin|github/i.test(site) && !site.includes("@")) doc.profile.website = site;

  // Name: first short line without digits/@ that isn't a section heading
  const nameLine = lines.slice(0, 6).find((l) => l.length < 60 && !/\d|@|http/.test(l) && !SECTION_PATTERNS.some((p) => p.re.test(l)));
  if (nameLine) doc.profile.fullName = nameLine;
  const headlineIdx = nameLine ? lines.indexOf(nameLine) + 1 : -1;
  if (headlineIdx > 0 && lines[headlineIdx] && lines[headlineIdx].length < 80 && !/\d|@/.test(lines[headlineIdx]) && !SECTION_PATTERNS.some((p) => p.re.test(lines[headlineIdx]))) {
    doc.profile.headline = lines[headlineIdx];
  }

  // Split into sections
  const sections: Record<string, string[]> = {};
  let current = "header";
  for (const line of lines) {
    const match = SECTION_PATTERNS.find((p) => p.re.test(line.replace(/[^a-z &]/gi, " ").trim()) && line.length < 40);
    if (match) {
      current = match.key;
      sections[current] = sections[current] ?? [];
      continue;
    }
    (sections[current] = sections[current] ?? []).push(line);
  }

  if (sections.summary?.length) doc.summary = sections.summary.join(" ").slice(0, 4000);

  const bullet = (l: string) => /^[-•*·▪●]/.test(l);

  // Experience: entries begin on a line containing a date range
  if (sections.experience?.length) {
    let cur: ResumeDocument["experience"][number] | null = null;
    for (const l of sections.experience) {
      const dr = l.match(DATE_RANGE_RE);
      if (dr && !bullet(l)) {
        if (cur) doc.experience.push(cur);
        const rest = l.replace(dr[0], "").replace(/[|,•\-–—]\s*$/g, "").trim();
        const [a, b] = rest.split(/\s+[|•@–-]\s+|,\s+/);
        cur = {
          id: newId(),
          position: a?.trim() ?? "",
          company: b?.trim() ?? "",
          location: "",
          startDate: dr[1],
          endDate: /present|current|now/i.test(dr[2]) ? "" : dr[2],
          current: /present|current|now/i.test(dr[2]),
          description: "",
        };
      } else if (cur) {
        if (!cur.company && !bullet(l) && l.length < 80 && !cur.description) cur.company = l;
        else cur.description += (cur.description ? "\n" : "") + l.replace(/^[-•*·▪●]\s?/, "");
      } else {
        cur = { id: newId(), position: l, company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
      }
    }
    if (cur) doc.experience.push(cur);
    if (doc.experience.length) warnings.push("Experience entries were detected heuristically — please review titles, companies and dates.");
  }

  if (sections.education?.length) {
    let cur: ResumeDocument["education"][number] | null = null;
    for (const l of sections.education) {
      const dr = l.match(DATE_RANGE_RE) ?? l.match(/\b(\d{4})\b/);
      if (!cur || (dr && !bullet(l) && cur.startDate)) {
        if (cur) doc.education.push(cur);
        cur = { id: newId(), institution: l.replace(dr?.[0] ?? "", "").trim(), degree: "", field: "", location: "", startDate: dr?.[1] ?? "", endDate: dr?.[2] ?? "", description: "" };
      } else if (!cur.degree && !bullet(l)) {
        const [deg, field] = l.split(/\s+in\s+|,\s+/);
        cur.degree = deg?.trim() ?? "";
        cur.field = field?.trim() ?? "";
      } else {
        cur.description += (cur.description ? "\n" : "") + l.replace(/^[-•*·▪●]\s?/, "");
      }
    }
    if (cur) doc.education.push(cur);
  }

  if (sections.skills?.length) {
    const tokens = sections.skills
      .join(",")
      .split(/[,•|·\n;]+/)
      .map((s) => s.replace(/^[-*]\s?/, "").trim())
      .filter((s) => s && s.length < 40);
    doc.skills = Array.from(new Set(tokens)).slice(0, 60).map((name) => ({ id: newId(), name, level: "" }));
  }

  if (sections.projects?.length) {
    let cur: ResumeDocument["projects"][number] | null = null;
    for (const l of sections.projects) {
      if (!bullet(l) && l.length < 70 && (!cur || cur.description)) {
        if (cur) doc.projects.push(cur);
        cur = { id: newId(), name: l, description: "", url: l.match(URL_RE)?.[0] ?? "", technologies: "", startDate: "", endDate: "" };
      } else if (cur) cur.description += (cur.description ? "\n" : "") + l.replace(/^[-•*·▪●]\s?/, "");
    }
    if (cur) doc.projects.push(cur);
  }

  if (sections.certifications?.length) {
    doc.certifications = sections.certifications.map((l) => {
      const year = l.match(/\b(19|20)\d{2}\b/)?.[0] ?? "";
      const [name, issuer] = l.replace(year, "").split(/\s+[-–—|]\s+|,\s+/);
      return { id: newId(), name: (name ?? l).replace(/^[-•*·▪●]\s?/, "").trim(), issuer: issuer?.trim() ?? "", date: year, url: "" };
    });
  }

  if (sections.languages?.length) {
    doc.languages = sections.languages
      .join(",")
      .split(/[,•|;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const m = s.match(/^(.+?)\s*[\(\-–—:]\s*(.+?)\)?$/);
        return { id: newId(), language: (m?.[1] ?? s).replace(/^[-•*·▪●]\s?/, "").trim(), proficiency: m?.[2]?.trim() ?? "" };
      });
  }

  if (sections.awards?.length) {
    doc.awards = sections.awards.map((l) => ({ id: newId(), title: l.replace(/^[-•*·▪●]\s?/, ""), issuer: "", date: l.match(/\b(19|20)\d{2}\b/)?.[0] ?? "", description: "" }));
  }

  if (sections.volunteer?.length) {
    doc.volunteer = [{ id: newId(), organization: sections.volunteer[0] ?? "", role: "", startDate: "", endDate: "", description: sections.volunteer.slice(1).join("\n") }];
  }

  if (!doc.profile.fullName) warnings.push("Could not confidently detect a name.");
  if (!doc.experience.length && !doc.education.length && !doc.skills.length) {
    warnings.push("No standard sections were detected. The raw text was placed in a custom section so nothing is lost.");
    doc.custom.push({ id: newId(), title: "Imported content", content: text.slice(0, 6000) });
  }
  return { document: doc, warnings };
}
