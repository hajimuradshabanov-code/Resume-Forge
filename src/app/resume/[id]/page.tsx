import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { getOwnedResumeWithDocument } from "@/server/resumes";
import { EditorShell } from "@/features/editor/EditorShell";

export const metadata: Metadata = { title: "Editor", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let resume;
  try {
    resume = await getOwnedResumeWithDocument(user.id, id);
  } catch {
    notFound();
  }
  return <EditorShell resumeId={resume.id} initialDoc={resume.document} isDemo={resume.isDemo} />;
}
