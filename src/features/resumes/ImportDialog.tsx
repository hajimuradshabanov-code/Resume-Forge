"use client";

import * as React from "react";
import { FileUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button, Modal, api } from "@/components/ui";
import type { ResumeDocument } from "@/lib/validation";

type ImportResult = { kind: string; document: ResumeDocument; warnings: string[] };

/**
 * Upload → parse (server) → review summary → confirm.
 * Nothing is persisted until the caller's onConfirm runs.
 */
export function ImportDialog({ open, onClose, onConfirm, mode }: { open: boolean; onClose: () => void; onConfirm: (doc: ResumeDocument) => Promise<void> | void; mode: "create" | "replace" }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    setLoading(false);
  };

  const parse = async () => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("File too large. Maximum size is 8 MB.");
      return;
    }
    const ok = /\.(pdf|docx|json)$/i.test(file.name);
    if (!ok) {
      setError("Unsupported file type. Upload a PDF, DOCX or JSON file.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resumes/import", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Import failed");
      setResult(data as ImportResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const d = result?.document;
  const counts = d
    ? [
        ["Experience", d.experience.length],
        ["Education", d.education.length],
        ["Skills", d.skills.length],
        ["Projects", d.projects.length],
        ["Certifications", d.certifications.length],
        ["Languages", d.languages.length],
        ["Awards", d.awards.length],
        ["Volunteer", d.volunteer.length],
        ["Custom", d.custom.length],
      ].filter(([, n]) => (n as number) > 0)
    : [];

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import resume"
      description="Upload a PDF, DOCX or a ResumeForge JSON export. You'll review what was detected before anything is saved."
      size="lg"
    >
      {!result ? (
        <div>
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-gray-400 dark:border-gray-700"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
          >
            <FileUp className="mb-2 h-8 w-8 text-gray-400" />
            <span className="text-sm font-medium">{file ? file.name : "Drop a file here or click to browse"}</span>
            <span className="mt-1 text-xs text-gray-500">PDF, DOCX or JSON · up to 8 MB</span>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={parse} disabled={!file} loading={loading}>
              {loading ? "Importing…" : "Analyze file"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Detected from {result.kind.toUpperCase()}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{d?.profile.fullName || <span className="text-gray-400">not detected</span>}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="truncate">{d?.profile.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd>{d?.profile.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Summary</dt>
                <dd>{d?.summary ? `${d.summary.length} chars` : "—"}</dd>
              </div>
              {counts.map(([k, n]) => (
                <div key={k as string}>
                  <dt className="text-gray-500">{k}</dt>
                  <dd>{n} item(s)</dd>
                </div>
              ))}
            </dl>
          </div>
          {result.warnings.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
              {result.warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
                </li>
              ))}
            </ul>
          )}
          {mode === "replace" && (
            <p className="mt-3 text-sm text-red-600">
              <strong>Warning:</strong> importing will replace the current content of this resume with the detected data. You can undo with Ctrl+Z before the next autosave.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>
              Choose another file
            </Button>
            <Button
              variant={mode === "replace" ? "danger" : "primary"}
              loading={confirming}
              onClick={async () => {
                if (!d) return;
                setConfirming(true);
                try {
                  await onConfirm(d);
                  reset();
                } finally {
                  setConfirming(false);
                }
              }}
            >
              {mode === "replace" ? "Replace content" : "Create resume from import"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export async function createResumeFromImport(doc: ResumeDocument, title?: string) {
  return api<{ resume: { id: string } }>("/api/resumes", { method: "POST", json: { mode: "import", title: title ?? (doc.profile.fullName ? `${doc.profile.fullName} — Imported` : "Imported Resume"), document: doc } });
}
