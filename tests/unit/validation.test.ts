import { describe, it, expect } from "vitest";
import { registerSchema, resumeDocumentSchema, exportedResumeSchema, profileSchema, settingsSchema } from "@/lib/validation";
import { emptyDocument } from "@/lib/resume-utils";
import { demoDocument } from "@/lib/demo-resume";

describe("auth validation", () => {
  it("rejects mismatched passwords", () => {
    const r = registerSchema.safeParse({ name: "Jo", email: "jo@example.com", password: "password123", confirmPassword: "nope" });
    expect(r.success).toBe(false);
  });
  it("normalises email", () => {
    const r = registerSchema.parse({ name: "Jo", email: "  JO@Example.com ", password: "password123", confirmPassword: "password123" });
    expect(r.email).toBe("jo@example.com");
  });
});

describe("resume document validation", () => {
  it("accepts an empty document and the demo document", () => {
    expect(resumeDocumentSchema.safeParse(emptyDocument()).success).toBe(true);
    expect(resumeDocumentSchema.safeParse(demoDocument()).success).toBe(true);
  });
  it("rejects invalid profile email / urls but allows blanks", () => {
    expect(profileSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(profileSchema.safeParse({ website: "no spaces allowed here" }).success).toBe(false);
    expect(profileSchema.safeParse({ email: "", website: "" }).success).toBe(true);
  });
  it("rejects unknown template ids and bad colors", () => {
    expect(resumeDocumentSchema.safeParse({ ...emptyDocument(), templateId: "fancy" }).success).toBe(false);
    expect(settingsSchema.safeParse({ primaryColor: "red" }).success).toBe(false);
  });
  it("validates versioned export envelope", () => {
    expect(exportedResumeSchema.safeParse({ version: 1, document: demoDocument() }).success).toBe(true);
    expect(exportedResumeSchema.safeParse({ version: 2, document: demoDocument() }).success).toBe(false);
  });
});
