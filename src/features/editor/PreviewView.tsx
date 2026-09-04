"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Download, Printer, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import { PagedResume, type PagedResumeHandle } from "@/features/templates/PagedResume";
import { PdfExporter, type PdfExporterHandle } from "@/features/export/PdfExporter";
import { PAGE_SIZES } from "@/features/templates/ResumeDocument";
import type { ResumeDocument } from "@/lib/validation";

export function PreviewView({ resumeId, doc, autoDownload }: { resumeId: string; doc: ResumeDocument; autoDownload?: boolean }) {
  const [scale, setScale] = React.useState(0.9);
  const [pages, setPages] = React.useState(1);
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pagedRef = React.useRef<PagedResumeHandle>(null);
  const exporterRef = React.useRef<PdfExporterHandle>(null);
  const size = PAGE_SIZES[doc.settings.pageSize];

  const fit = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setScale(Math.min(1.5, (el.clientWidth - 48) / size.w));
  }, [size.w]);

  React.useEffect(() => {
    fit();
  }, [fit]);

  const download = React.useCallback(async () => {
    setBusy(true);
    try {
      await exporterRef.current?.exportPdf(doc);
    } finally {
      setBusy(false);
    }
  }, [doc]);

  const autoRan = React.useRef(false);
  React.useEffect(() => {
    if (autoDownload && !autoRan.current) {
      autoRan.current = true;
      const t = setTimeout(download, 600);
      return () => clearTimeout(t);
    }
  }, [autoDownload, download]);

  const goTo = (n: number) => {
    const sheets = pagedRef.current?.getSheets() ?? [];
    const target = sheets[n - 1]?.parentElement;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPage(n);
  };

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ((size.h + 24) * scale));
    setPage(Math.min(pages, Math.max(1, idx + 1)));
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-200 dark:bg-gray-950 print:h-auto print:bg-white">
      <style>{`@page { size: ${doc.settings.pageSize === "A4" ? "A4" : "letter"}; margin: 0; }`}</style>
      <header className="no-print flex h-14 shrink-0 flex-wrap items-center gap-2 border-b border-gray-300 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
        <Link href={`/resume/${resumeId}`} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to editor</span>
        </Link>
        <span className="truncate text-sm font-semibold">{doc.title}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.max(0.3, s - 0.1))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setScale((s) => Math.min(2, s + 0.1))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fit} aria-label="Fit to screen"><Maximize className="h-4 w-4" /></Button>
        </div>
        {pages > 1 && (
          <div className="hidden items-center gap-1 text-xs sm:flex">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(Math.max(1, page - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronUp className="h-4 w-4" /></Button>
            <span className="tabular-nums">Page {page} / {pages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(Math.min(pages, page + 1))} disabled={page >= pages} aria-label="Next page"><ChevronDown className="h-4 w-4" /></Button>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span></Button>
        <Button size="sm" onClick={download} loading={busy}><Download className="h-4 w-4" /> {busy ? "Generating PDF…" : "Download PDF"}</Button>
      </header>
      <div ref={containerRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <PagedResume ref={pagedRef} doc={doc} scale={scale} onPageCount={setPages} />
      </div>
      <PdfExporter ref={exporterRef} />
    </div>
  );
}
