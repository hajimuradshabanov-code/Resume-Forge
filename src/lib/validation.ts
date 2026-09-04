import { z } from "zod";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  image: z.string().max(2_000_000).nullable().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  defaultTemplateId: z.string().max(40).optional(),
  defaultPageSize: z.enum(["A4", "Letter"]).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirmation: z.literal("DELETE"),
});

// ---------------------------------------------------------------------------
// Resume document
// ---------------------------------------------------------------------------
const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+([\/?#].*)?$/i.test(v), {
    message: "Enter a valid URL",
  });

const shortText = z.string().max(200).default("");
const longText = z.string().max(6000).default("");
const dateText = z.string().max(40).default("");
const id = z.string().uuid();

export const profileSchema = z.object({
  fullName: z.string().max(120).default(""),
  headline: shortText,
  email: z
    .string()
    .trim()
    .max(254)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email",
    })
    .default(""),
  phone: z.string().max(40).default(""),
  location: shortText,
  website: optionalUrl.default(""),
  linkedin: optionalUrl.default(""),
  github: optionalUrl.default(""),
  profileImage: z.string().max(2_000_000).nullable().default(null),
});

export const experienceSchema = z.object({
  id,
  company: shortText,
  position: shortText,
  location: shortText,
  startDate: dateText,
  endDate: dateText,
  current: z.boolean().default(false),
  description: longText,
});

export const educationSchema = z.object({
  id,
  institution: shortText,
  degree: shortText,
  field: shortText,
  location: shortText,
  startDate: dateText,
  endDate: dateText,
  description: longText,
});

export const skillSchema = z.object({
  id,
  name: z.string().max(80).default(""),
  level: z.string().max(40).default(""),
});

export const projectSchema = z.object({
  id,
  name: shortText,
  description: longText,
  url: optionalUrl.default(""),
  technologies: z.string().max(500).default(""),
  startDate: dateText,
  endDate: dateText,
});

export const certificationSchema = z.object({
  id,
  name: shortText,
  issuer: shortText,
  date: dateText,
  url: optionalUrl.default(""),
});

export const languageSchema = z.object({
  id,
  language: z.string().max(80).default(""),
  proficiency: z.string().max(40).default(""),
});

export const awardSchema = z.object({
  id,
  title: shortText,
  issuer: shortText,
  date: dateText,
  description: longText,
});

export const volunteerSchema = z.object({
  id,
  organization: shortText,
  role: shortText,
  startDate: dateText,
  endDate: dateText,
  description: longText,
});

export const customSectionSchema = z.object({
  id,
  title: shortText,
  content: longText,
});

export const SECTION_KEYS = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "awards",
  "volunteer",
  "custom",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const settingsSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color")
    .default("#1e3a5f"),
  fontFamily: z.enum(["inter", "georgia", "helvetica", "garamond", "roboto-mono", "lato"]).default("inter"),
  fontSize: z.enum(["small", "medium", "large"]).default("medium"),
  spacing: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
  pageSize: z.enum(["A4", "Letter"]).default("A4"),
  showPhoto: z.boolean().default(true),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).default([...SECTION_KEYS]),
});

export const TEMPLATE_IDS = [
  "modern",
  "minimal",
  "executive",
  "classic",
  "creative",
  "technical",
  "elegant",
  "ats",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const resumeDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  templateId: z.enum(TEMPLATE_IDS),
  summary: z.string().max(4000).default(""),
  profile: profileSchema,
  settings: settingsSchema,
  experience: z.array(experienceSchema).max(50),
  education: z.array(educationSchema).max(50),
  skills: z.array(skillSchema).max(100),
  projects: z.array(projectSchema).max(50),
  certifications: z.array(certificationSchema).max(50),
  languages: z.array(languageSchema).max(30),
  awards: z.array(awardSchema).max(50),
  volunteer: z.array(volunteerSchema).max(50),
  custom: z.array(customSectionSchema).max(20),
});

// Partial update: any subset of document keys
export const resumeUpdateSchema = resumeDocumentSchema.partial();

export const createResumeSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Untitled Resume"),
  templateId: z.enum(TEMPLATE_IDS).optional(),
  mode: z.enum(["scratch", "template", "import", "demo"]).default("scratch"),
  document: resumeUpdateSchema.optional(),
});

export const exportedResumeSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  app: z.string().optional(),
  document: resumeDocumentSchema,
});

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------
export const AI_ACTIONS = ["improve", "shorten", "expand", "professional", "ats", "bullets"] as const;
export type AiAction = (typeof AI_ACTIONS)[number];

export const aiRequestSchema = z.object({
  action: z.enum(AI_ACTIONS),
  text: z.string().trim().min(3, "Add some text first").max(6000),
  context: z
    .object({
      field: z.string().max(60).optional(),
      headline: z.string().max(200).optional(),
      position: z.string().max(200).optional(),
      company: z.string().max(200).optional(),
    })
    .optional(),
});

export type ResumeDocument = z.infer<typeof resumeDocumentSchema>;
export type ResumeDocumentInput = z.input<typeof resumeDocumentSchema>;
export type ResumeProfile = z.infer<typeof profileSchema>;
export type ResumeSettings = z.infer<typeof settingsSchema>;
export type ExperienceItem = z.infer<typeof experienceSchema>;
export type EducationItem = z.infer<typeof educationSchema>;
export type SkillItem = z.infer<typeof skillSchema>;
export type ProjectItem = z.infer<typeof projectSchema>;
export type CertificationItem = z.infer<typeof certificationSchema>;
export type LanguageItem = z.infer<typeof languageSchema>;
export type AwardItem = z.infer<typeof awardSchema>;
export type VolunteerItem = z.infer<typeof volunteerSchema>;
export type CustomSectionItem = z.infer<typeof customSectionSchema>;
