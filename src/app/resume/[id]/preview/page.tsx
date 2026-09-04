import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/auth";
import { getOwnedResumeWithDocument } from "@/server/resumes";
import { PreviewView } from "@/features/editor/PreviewView";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ download?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let resume;
  try {
    resume = await getOwnedResumeWithDocument(user.id, id);
  } catch {
    notFound();
  }
  return <PreviewView resumeId={resume.id} doc={resume.document} autoDownload={sp.download === "1"} />;
}
