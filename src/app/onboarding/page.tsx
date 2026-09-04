import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { OnboardingView } from "@/features/auth/OnboardingView";

export const metadata: Metadata = { title: "Get started", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.onboardingCompleted) redirect("/dashboard");
  return <OnboardingView name={user.name} />;
}
