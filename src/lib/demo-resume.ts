import { emptyDocument, newId } from "./resume-utils";
import type { ResumeDocument } from "./validation";

// ---------------------------------------------------------------------------
// Demo resume (clearly labeled, fictional person)
// ---------------------------------------------------------------------------
export function demoDocument(): ResumeDocument {
  const id = () => newId();
  return emptyDocument({
    title: "Demo Resume",
    templateId: "modern",
    summary:
      "Product-focused software engineer with 7 years of experience building web platforms used by millions of people. Comfortable owning features end-to-end — from discovery and architecture to delivery and iteration. Known for pragmatic technical decisions, clear written communication and mentoring engineers into strong contributors.",
    profile: {
      fullName: "Jordan Avery",
      headline: "Senior Software Engineer",
      email: "jordan.avery@example.com",
      phone: "+1 (555) 014-2290",
      location: "Austin, TX",
      website: "jordanavery.dev",
      linkedin: "linkedin.com/in/jordan-avery",
      github: "github.com/jordanavery",
      profileImage: null,
    },
    experience: [
      {
        id: id(),
        position: "Senior Software Engineer",
        company: "Northwind Labs",
        location: "Austin, TX",
        startDate: "Mar 2021",
        endDate: "",
        current: true,
        description:
          "Led the redesign of the checkout platform serving 2M monthly users, reducing p95 latency by 38%.\nMentored four engineers, two of whom were promoted to mid-level within a year.\nIntroduced contract testing between 12 services, cutting integration incidents by half.",
      },
      {
        id: id(),
        position: "Software Engineer",
        company: "Brightline Health",
        location: "Remote",
        startDate: "Jun 2018",
        endDate: "Feb 2021",
        current: false,
        description:
          "Built patient scheduling APIs in Node.js and PostgreSQL used by 300+ clinics.\nAutomated HIPAA compliance checks in CI, saving roughly 10 engineering hours per week.\nShipped a React design system adopted across three product teams.",
      },
    ],
    education: [
      {
        id: id(),
        institution: "University of Texas at Austin",
        degree: "B.S.",
        field: "Computer Science",
        location: "Austin, TX",
        startDate: "2014",
        endDate: "2018",
        description: "Graduated with honors. Teaching assistant for Data Structures.",
      },
    ],
    skills: [
      { id: id(), name: "TypeScript", level: "Expert" },
      { id: id(), name: "React", level: "Expert" },
      { id: id(), name: "Node.js", level: "Advanced" },
      { id: id(), name: "PostgreSQL", level: "Advanced" },
      { id: id(), name: "AWS", level: "Intermediate" },
      { id: id(), name: "System Design", level: "Advanced" },
      { id: id(), name: "GraphQL", level: "Intermediate" },
      { id: id(), name: "Docker", level: "Advanced" },
    ],
    projects: [
      {
        id: id(),
        name: "OpenLedger",
        description: "Open-source double-entry accounting library with 1.2k GitHub stars. Designed the plugin API and wrote the documentation site.",
        url: "github.com/jordanavery/openledger",
        technologies: "TypeScript, Vitest, Docusaurus",
        startDate: "2022",
        endDate: "",
      },
    ],
    certifications: [{ id: id(), name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", date: "2023", url: "" }],
    languages: [
      { id: id(), language: "English", proficiency: "Native" },
      { id: id(), language: "Spanish", proficiency: "Intermediate" },
    ],
    awards: [{ id: id(), title: "Engineering Excellence Award", issuer: "Northwind Labs", date: "2023", description: "Recognized for leading the checkout platform migration." }],
    volunteer: [
      {
        id: id(),
        organization: "Code for Austin",
        role: "Volunteer Mentor",
        startDate: "2020",
        endDate: "",
        description: "Mentor early-career developers from underrepresented backgrounds through a 12-week program.",
      },
    ],
    custom: [{ id: id(), title: "Interests", content: "Trail running, woodworking, technical writing" }],
  });
}
