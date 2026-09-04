"use client";

import { TemplateThumb } from "@/features/templates/TemplateGallery";
import { emptyDocument, TEMPLATE_META } from "@/lib/resume-utils";
import type { TemplateId } from "@/lib/validation";

/** Lightweight card thumbnail built from list metadata (no full document fetch). */
export function TemplateMeta({ item }: { item: { templateId: string; fullName: string; headline: string; title: string; summary?: string } }) {
  const tpl = (item.templateId in TEMPLATE_META ? item.templateId : "modern") as TemplateId;
  const doc = emptyDocument({ templateId: tpl, title: item.title });
  doc.profile.fullName = item.fullName || item.title;
  doc.profile.headline = item.headline;
  doc.profile.email = "  ";
  doc.settings.primaryColor = TEMPLATE_META[tpl].accent;
  doc.summary = item.summary ?? "";
  return <TemplateThumb doc={doc} width={160} />;
}
