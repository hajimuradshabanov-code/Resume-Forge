"use client";

import * as React from "react";
import { TemplateThumb } from "./TemplateGallery";
import { demoDocument } from "@/lib/demo-resume";
import { TEMPLATE_META } from "@/lib/resume-utils";
import { TEMPLATE_IDS, type TemplateId } from "@/lib/validation";

export function LandingTemplates({ variant }: { variant: "hero" | "grid" }) {
  const sample = React.useMemo(() => demoDocument(), []);
  const make = (id: TemplateId) => ({ ...sample, templateId: id, settings: { ...sample.settings, primaryColor: TEMPLATE_META[id].accent } });
  if (variant === "hero") {
    const ids: TemplateId[] = ["modern", "creative", "executive"];
    return (
      <div className="flex items-end justify-center gap-6 overflow-hidden">
        {ids.map((id, i) => (
          <div key={id} className={i === 1 ? "hidden sm:block" : i === 2 ? "hidden lg:block" : ""}>
            <TemplateThumb doc={make(id)} width={i === 0 ? 300 : 260} className="shadow-lg" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
      {TEMPLATE_IDS.map((id) => (
        <div key={id}>
          <TemplateThumb doc={make(id)} width={220} className="mx-auto w-full max-w-[220px]" />
          <div className="mt-2 text-sm font-medium">{TEMPLATE_META[id].name}</div>
          <div className="text-xs text-gray-500">{TEMPLATE_META[id].tags.join(" · ")}</div>
        </div>
      ))}
    </div>
  );
}
