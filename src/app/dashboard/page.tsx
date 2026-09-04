import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { listResumes } from "@/server/resumes";
import { DashboardView } from "@/features/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.onboardingCompleted) redirect("/onboarding");
  const resumes = await listResumes(user.id);
  return (
    <DashboardView
      user={{ name: user.name, email: user.email, image: user.image, defaultTemplateId: user.defaultTemplateId }}
      initialResumes={resumes.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))}
    />
  );
}
