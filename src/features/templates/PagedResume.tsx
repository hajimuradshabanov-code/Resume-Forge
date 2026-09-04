"use client";

import * as React from "react";
import type { ResumeDocument as Doc } from "@/lib/validation";
import { PAGE_SIZES, ResumeDocument, getSidebarInfo } from "./ResumeDocument";

/**
 * Computes page cut positions from measured block rectangles so that no
 * `data-block` element (heading, list item, entry) is split across pages.
 */
export function computeBreaks(blocks: { top: number; bottom: number }[], totalHeight: number, pageHeight: number, bottomPad = 36): number[] {
  const breaks: number[] = [0];
  if (totalHeight <= pageHeight) return breaks;
  let start = 0;
  let guard = 0;
  while (start + pageHeight < totalHeight && guard++ < 100) {
    const limit = start + pageHeight - bottomPad;
    const straddling = blocks.filter((b) => b.top < limit && b.bottom > limit && b.top > start + pageHeight * 0.25);
    let cut = limit;
    if (straddling.length) cut = Math.min(...straddling.map((b) => b.top)) - 8;
    if (cut <= start + 50) cut = limit; // safety: never produce an empty page
    breaks.push(cut);
    start = cut;
  }
  return breaks;
}

export type PagedResumeHandle = { getSheets: () => HTMLElement[]; pageCount: number };

type Props = {
  doc: Doc;
  scale?: number;
  className?: string;
  showPageNumbers?: boolean;
  onPageCount?: (n: number) => void;
  sheetGap?: number;
};

export const PagedResume = React.forwardRef<PagedResumeHandle, Props>(function PagedResume({ doc, scale = 1, className, showPageNumbers = true, onPageCount, sheetGap = 24 }, ref) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const sheetsRef = React.useRef<HTMLDivElement>(null);
  const [breaks, setBreaks] = React.useState<number[]>([0]);
  const size = PAGE_SIZES[doc.settings.pageSize];

  React.useImperativeHandle(ref, () => ({
    getSheets: () => Array.from(sheetsRef.current?.querySelectorAll<HTMLElement>("[data-sheet]") ?? []),
    pageCount: breaks.length,
  }));

  React.useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const rootRect = el.getBoundingClientRect();
      const blocks = Array.from(el.querySelectorAll<HTMLElement>("[data-block]")).map((b) => {
        const r = b.getBoundingClientRect();
        return { top: r.top - rootRect.top, bottom: r.bottom - rootRect.top };
      });
      const next = computeBreaks(blocks, el.scrollHeight, size.h);
      setBreaks((prev) => (prev.length === next.length && prev.every((v, i) => Math.abs(v - next[i]) < 1) ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [doc, size.h]);

  React.useEffect(() => {
    onPageCount?.(breaks.length);
  }, [breaks.length, onPageCount]);

  const totalMinHeight = breaks.length * size.h;
  const sidebar = getSidebarInfo(doc);

  return (
    <div className={className}>
      {/* Hidden measuring copy */}
      <div aria-hidden style={{ position: "absolute", left: -10000, top: 0, width: size.w, visibility: "hidden", pointerEvents: "none" }}>
        <div ref={measureRef} style={{ width: size.w }}>
          <ResumeDocument doc={doc} />
        </div>
      </div>
      {/* Rendered sheets */}
      <div ref={sheetsRef} className="print-root" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: sheetGap * scale }}>
        {breaks.map((offset, i) => (
          <div key={i} data-sheet-wrap style={{ width: size.w * scale, height: size.h * scale, position: "relative" }}>
            <div
              data-sheet
              className="resume-page shadow-md"
              style={{ width: size.w, height: size.h, overflow: "hidden", background: "#fff", position: "relative", transform: `scale(${scale})`, transformOrigin: "top left" }}
            >
              <div style={{ position: "absolute", top: -offset, left: 0, width: size.w }}>
                <ResumeDocument doc={doc} minHeight={totalMinHeight} />
              </div>
              {/* Mask below the next cut so sheet i never shows sheet i+1 content */}
              {breaks[i + 1] !== undefined && (
                <div style={{ position: "absolute", left: 0, right: 0, top: breaks[i + 1] - offset, bottom: 0, background: "#fff" }}>
                  {sidebar && <div style={{ position: "absolute", top: 0, bottom: 0, [sidebar.side]: 0, width: sidebar.width, background: sidebar.color }} />}
                </div>
              )}
            </div>
            {showPageNumbers && breaks.length > 1 && (
              <div className="no-print" style={{ position: "absolute", right: 0, bottom: -18 * scale, fontSize: 11, color: "#6b7280" }}>
                Page {i + 1} of {breaks.length}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});
