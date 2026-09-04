import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    image: text("image"),
    theme: text("theme").default("system").notNull(),
    defaultTemplateId: text("default_template_id").default("modern").notNull(),
    defaultPageSize: text("default_page_size").default("A4").notNull(),
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_idx").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// Resumes
// ---------------------------------------------------------------------------
export const resumes = pgTable(
  "resumes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    templateId: text("template_id").default("modern").notNull(),
    summary: text("summary").default("").notNull(),
    status: text("status").default("draft").notNull(), // draft | complete
    isDemo: boolean("is_demo").default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index("resumes_user_id_idx").on(t.userId),
    index("resumes_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

export const resumeProfiles = pgTable(
  "resume_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    fullName: text("full_name").default("").notNull(),
    headline: text("headline").default("").notNull(),
    email: text("email").default("").notNull(),
    phone: text("phone").default("").notNull(),
    location: text("location").default("").notNull(),
    website: text("website").default("").notNull(),
    linkedin: text("linkedin").default("").notNull(),
    github: text("github").default("").notNull(),
    profileImage: text("profile_image"),
  },
  (t) => [uniqueIndex("resume_profiles_resume_id_idx").on(t.resumeId)],
);

export const experiences = pgTable(
  "experiences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    company: text("company").default("").notNull(),
    position: text("position").default("").notNull(),
    location: text("location").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    current: boolean("current").default(false).notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("experiences_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const education = pgTable(
  "education",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    institution: text("institution").default("").notNull(),
    degree: text("degree").default("").notNull(),
    field: text("field").default("").notNull(),
    location: text("location").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("education_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    name: text("name").default("").notNull(),
    level: text("level").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("skills_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    name: text("name").default("").notNull(),
    description: text("description").default("").notNull(),
    url: text("url").default("").notNull(),
    technologies: text("technologies").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("projects_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const certifications = pgTable(
  "certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    name: text("name").default("").notNull(),
    issuer: text("issuer").default("").notNull(),
    date: text("date").default("").notNull(),
    url: text("url").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("certifications_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const languages = pgTable(
  "languages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    language: text("language").default("").notNull(),
    proficiency: text("proficiency").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("languages_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const awards = pgTable(
  "awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    issuer: text("issuer").default("").notNull(),
    date: text("date").default("").notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("awards_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const volunteerExperience = pgTable(
  "volunteer_experience",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    organization: text("organization").default("").notNull(),
    role: text("role").default("").notNull(),
    startDate: text("start_date").default("").notNull(),
    endDate: text("end_date").default("").notNull(),
    description: text("description").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("volunteer_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const customSections = pgTable(
  "custom_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    title: text("title").default("").notNull(),
    content: text("content").default("").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("custom_sections_resume_id_idx").on(t.resumeId, t.sortOrder)],
);

export const resumeSettings = pgTable(
  "resume_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id")
      .notNull()
      .references(() => resumes.id, { onDelete: "cascade" }),
    primaryColor: text("primary_color").default("#1e3a5f").notNull(),
    fontFamily: text("font_family").default("inter").notNull(),
    fontSize: text("font_size").default("medium").notNull(), // small | medium | large
    spacing: text("spacing").default("comfortable").notNull(), // compact | comfortable | spacious
    pageSize: text("page_size").default("A4").notNull(), // A4 | Letter
    showPhoto: boolean("show_photo").default(true).notNull(),
    sectionOrder: jsonb("section_order").$type<string[]>().notNull(),
  },
  (t) => [uniqueIndex("resume_settings_resume_id_idx").on(t.resumeId)],
);

// ---------------------------------------------------------------------------
// Billing-ready
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").default("free").notNull(), // free | pro
    status: text("status").default("active").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("subscriptions_user_id_idx").on(t.userId)],
);

export const usage = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // ai_request | pdf_export | json_export | import
    resumeId: uuid("resume_id").references(() => resumes.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("usage_user_kind_idx").on(t.userId, t.kind, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many, one }) => ({
  resumes: many(resumes),
  sessions: many(sessions),
  subscription: one(subscriptions, { fields: [users.id], references: [subscriptions.userId] }),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  profile: one(resumeProfiles, { fields: [resumes.id], references: [resumeProfiles.resumeId] }),
  settings: one(resumeSettings, { fields: [resumes.id], references: [resumeSettings.resumeId] }),
  experiences: many(experiences),
  education: many(education),
  skills: many(skills),
  projects: many(projects),
  certifications: many(certifications),
  languages: many(languages),
  awards: many(awards),
  volunteer: many(volunteerExperience),
  customSections: many(customSections),
}));

export type User = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
