"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ResumeDocument as Doc } from "@/lib/validation";
import { PagedResume, type PagedResumeHandle } from "@/features/templates/PagedResume";
import { downloadBlob, generatePdf, pdfFilename } from "./pdf";

export type PdfExporterHandle = { exportPdf: (doc: Doc) => Promise<void> };

/**
 * Mounts the resume off-screen at native page size only while exporting,
 * waits for pagination to settle, rasterises each sheet and downloads a PDF.
 */
export const PdfExporter = React.forwardRef<PdfExporterHandle, { onStateChange?: (busy: boolean) => void }>(function PdfExporter({ onStateChange }, ref) {
  const [doc, setDoc] = React.useState<Doc | null>(null);
  const pagedRef = React.useRef<PagedResumeHandle>(null);
  const resolver = React.useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);

  React.useImperativeHandle(ref, () => ({
    exportPdf: (d: Doc) =>
      new Promise<void>((resolve, reject) => {
        resolver.current = { resolve, reject };
        onStateChange?.(true);
        setDoc(d);
      }),
  }));

  React.useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const run = async () => {
      // Let layout + ResizeObserver-based pagination settle
      await new Promise((r) => setTimeout(r, 250));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      if (cancelled) return;
      try {
        const sheets = pagedRef.current?.getSheets() ?? [];
        const blob = await generatePdf(sheets, doc);
        downloadBlob(blob, pdfFilename(doc));
        toast.success("PDF downloaded");
        resolver.current?.resolve();
      } catch (e) {
        console.error(e);
        toast.error("PDF generation failed. Please try again.");
        resolver.current?.reject(e as Error);
      } finally {
        resolver.current = null;
        onStateChange?.(false);
        setDoc(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [doc, onStateChange]);

  if (!doc) return null;
  return (
    <div aria-hidden data-pdf-stage style={{ position: "fixed", left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: "none" }}>
      <PagedResume ref={pagedRef} doc={doc} scale={1} showPageNumbers={false} sheetGap={0} />
    </div>
  );
});
