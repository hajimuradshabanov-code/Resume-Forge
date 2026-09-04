import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, listSessions } from "@/server/auth";
import { SettingsView } from "@/features/settings/SettingsView";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sessions = await listSessions(user.id);
  return (
    <SettingsView
      user={{ ...user, createdAt: user.createdAt.toISOString() }}
      sessions={sessions.map((s) => ({ ...s, lastActiveAt: s.lastActiveAt.toISOString(), createdAt: s.createdAt.toISOString() }))}
    />
  );
}
