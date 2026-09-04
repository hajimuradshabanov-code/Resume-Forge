import { describe, it, expect } from "vitest";
import { computeCompleteness, analyzeAts, normalizeSectionOrder, moveItem, sortByOrder, safeFilename, formatDateRange, splitBullets, emptyDocument } from "@/lib/resume-utils";
import { demoDocument } from "@/lib/demo-resume";
import { computeBreaks } from "@/features/templates/PagedResume";
import { parseResumeText } from "@/server/import-parser";

describe("completeness", () => {
  it("is 0 for an empty resume and high for the demo", () => {
    expect(computeCompleteness(emptyDocument()).score).toBe(0);
    expect(computeCompleteness(demoDocument()).score).toBeGreaterThanOrEqual(90);
  });
  it("gives actionable suggestions", () => {
    const s = computeCompleteness(emptyDocument()).suggestions;
    expect(s).toContain("Add at least 3 skills");
  });
});

describe("ats analysis", () => {
  it("flags missing contact info and weak phrasing", () => {
    const doc = emptyDocument();
    doc.experience.push({ id: "1", company: "X", position: "Y", location: "", startDate: "2020", endDate: "2021", current: false, description: "responsible for stuff" });
    const r = analyzeAts(doc);
    expect(r.issues.some((i) => i.title === "Incomplete contact information")).toBe(true);
    expect(r.issues.some((i) => i.title === "Weak phrasing in experience")).toBe(true);
    expect(r.score).toBeLessThan(analyzeAts(demoDocument()).score);
  });
});

describe("ordering helpers", () => {
  it("normalises section order with missing & unknown keys", () => {
    const o = normalizeSectionOrder(["skills", "bogus", "summary", "skills"]);
    expect(o.slice(0, 2)).toEqual(["skills", "summary"]);
    expect(new Set(o).size).toBe(10);
  });
  it("moves items and sorts by sortOrder", () => {
    expect(moveItem([1, 2, 3], 0, 2)).toEqual([2, 3, 1]);
    expect(sortByOrder([{ sortOrder: 2 }, { sortOrder: 0 }]).map((x) => x.sortOrder)).toEqual([0, 2]);
  });
});

describe("formatting", () => {
  it("builds safe filenames", () => {
    expect(safeFilename("Jordan Avery")).toBe("Jordan_Avery_Resume.pdf");
    expect(safeFilename("")).toBe("Resume.pdf");
    expect(safeFilename("A/B\\C")).toBe("ABC_Resume.pdf");
  });
  it("formats date ranges", () => {
    expect(formatDateRange("2020", "", true)).toBe("2020 – Present");
    expect(formatDateRange("", "")).toBe("");
  });
  it("splits bullets", () => {
    expect(splitBullets("- a\n• b\nc")).toEqual(["a", "b", "c"]);
  });
});

describe("pagination", () => {
  it("never splits a block across pages", () => {
    const blocks = [{ top: 0, bottom: 900 }, { top: 1000, bottom: 1300 }, { top: 1310, bottom: 1400 }];
    const breaks = computeBreaks(blocks, 1400, 1123);
    expect(breaks).toEqual([0, 992]);
  });
  it("returns one page for short docs", () => {
    expect(computeBreaks([], 500, 1123)).toEqual([0]);
  });
});

describe("import parser", () => {
  it("extracts contact info and sections from plain text", () => {
    const text = `Jordan Avery\nSenior Engineer\njordan@example.com | +1 555 014 2290 | linkedin.com/in/jordan\n\nSummary\nBuilds things well.\n\nExperience\nSenior Engineer | Northwind Jan 2021 - Present\n- Led checkout redesign\n\nSkills\nTypeScript, React, SQL`;
    const { document } = parseResumeText(text);
    expect(document.profile.fullName).toBe("Jordan Avery");
    expect(document.profile.email).toBe("jordan@example.com");
    expect(document.summary).toContain("Builds things well");
    expect(document.experience).toHaveLength(1);
    expect(document.experience[0].current).toBe(true);
    expect(document.skills.map((s) => s.name)).toEqual(["TypeScript", "React", "SQL"]);
  });
});
