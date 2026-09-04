"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TemplateGallery } from "./TemplateGallery";
import { demoDocument } from "@/lib/demo-resume";
import { api } from "@/components/ui";
import type { TemplateId } from "@/lib/validation";

export function PublicTemplates({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const sample = React.useMemo(() => demoDocument(), []);
  const [busy, setBusy] = React.useState(false);
  const use = async (id: TemplateId) => {
    if (!signedIn) return router.push(`/register?template=${id}`);
    if (busy) return;
    setBusy(true);
    try {
      const { resume } = await api<{ resume: { id: string } }>("/api/resumes", { method: "POST", json: { mode: "template", templateId: id, title: "Untitled Resume" } });
      toast.success("Resume created");
      router.push(`/resume/${resume.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div>
      {busy && <p className="mb-3 text-sm text-gray-500" role="status">Creating resume…</p>}
      <TemplateGallery doc={sample} onSelect={use} columns={4} thumbWidth={220} />
    </div>
  );
}
