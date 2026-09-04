"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/components/ui";
import { TEMPLATE_META } from "@/lib/resume-utils";
import { TEMPLATE_IDS, type ResumeDocument as Doc, type TemplateId } from "@/lib/validation";
import { PAGE_SIZES, ResumeDocument } from "./ResumeDocument";

export function TemplateThumb({ doc, width = 220, className }: { doc: Doc; width?: number; className?: string }) {
  const size = PAGE_SIZES[doc.settings.pageSize];
  const scale = width / size.w;
  return (
    <div className={cn("overflow-hidden rounded border border-gray-200 bg-white dark:border-gray-700", className)} style={{ width, height: size.h * scale }} aria-hidden>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: size.w, height: size.h, pointerEvents: "none" }}>
        <ResumeDocument doc={doc} />
      </div>
    </div>
  );
}

export function TemplateGallery({ doc, selected, onSelect, columns = 2, thumbWidth = 200 }: { doc: Doc; selected?: TemplateId; onSelect?: (id: TemplateId) => void; columns?: 2 | 3 | 4; thumbWidth?: number }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <div className={cn("grid grid-cols-1 gap-5", cols)}>
      {TEMPLATE_IDS.map((id) => {
        const meta = TEMPLATE_META[id];
        const preview: Doc = { ...doc, templateId: id, settings: { ...doc.settings, primaryColor: doc.templateId === id ? doc.settings.primaryColor : meta.accent } };
        const active = selected === id;
        const Wrapper = onSelect ? "button" : "div";
        return (
          <Wrapper
            key={id}
            type={onSelect ? "button" : undefined}
            onClick={onSelect ? () => onSelect(id) : undefined}
            aria-pressed={onSelect ? active : undefined}
            className={cn("group flex flex-col items-start rounded-lg border p-3 text-left transition-colors", active ? "border-gray-900 ring-2 ring-gray-900/10 dark:border-white" : "border-gray-200 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-500", onSelect && "cursor-pointer")}
          >
            <div className="relative w-full">
              <TemplateThumb doc={preview} width={thumbWidth} className="mx-auto" />
              {active && (
                <span className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <div className="mt-3 flex w-full items-center justify-between">
              <span className="text-sm font-semibold">{meta.name}</span>
              <span className="flex gap-1">
                {meta.tags.map((t) => (
                  <span key={t} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {t}
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{meta.description}</p>
          </Wrapper>
        );
      })}
    </div>
  );
}
