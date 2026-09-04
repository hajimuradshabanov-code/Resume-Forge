"use client";

import type { ResumeDocument as Doc } from "@/lib/validation";
import { PAGE_SIZES } from "@/features/templates/ResumeDocument";
import { safeFilename } from "@/lib/resume-utils";

/**
 * Generates a real multi-page PDF from the rendered page sheets.
 * Each sheet is rasterised at 2x and placed on a correctly sized page,
 * so the PDF matches the live preview exactly.
 */
export async function generatePdf(sheets: HTMLElement[], doc: Doc): Promise<Blob> {
  if (!sheets.length) throw new Error("Nothing to export.");
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  const size = PAGE_SIZES[doc.settings.pageSize];
  const pdf = new jsPDF({ unit: "pt", format: doc.settings.pageSize.toLowerCase() as "a4" | "letter", orientation: "portrait", compress: true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  for (let i = 0; i < sheets.length; i++) {
    const canvas = await html2canvas(sheets[i], {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: size.w,
      height: size.h,
      windowWidth: size.w,
      onclone: (clonedDoc, el) => {
        // The export stage is transparent on the live page; make it opaque in the clone
        clonedDoc.querySelectorAll<HTMLElement>("[data-pdf-stage]").forEach((s) => (s.style.opacity = "1"));
        (el as HTMLElement).style.transform = "none";
        (el as HTMLElement).style.boxShadow = "none";
      },
    });
    const img = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(img, "JPEG", 0, 0, pw, ph, undefined, "FAST");
  }
  pdf.setProperties({ title: `${doc.profile.fullName || "Resume"} — Resume`, creator: "ResumeForge" });
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function pdfFilename(doc: Doc) {
  return safeFilename(doc.profile.fullName);
}
