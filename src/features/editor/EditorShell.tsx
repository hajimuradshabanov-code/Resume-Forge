"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Check, CloudOff, Loader2, AlertCircle, MoreHorizontal, Download, Eye, LayoutTemplate, ScanSearch, Pencil, Copy, FileJson, FileUp, Trash2,
  User, FileText, Briefcase, GraduationCap, Wrench, FolderKanban, Award, Languages, Trophy, HeartHandshake, Plus, Palette, ListOrdered, ChevronRight, PanelLeft, Undo2, Redo2,
} from "lucide-react";
import { Button, Modal, Dropdown, MenuItem, Input, ProgressRing, cn, api } from "@/components/ui";
import { useEditorStore } from "./store";
import { ProfileForm, SummaryForm, ExperienceEditor, EducationEditor, SkillsEditor, ProjectsEditor, CertificationsEditor, LanguagesEditor, AwardsEditor, VolunteerEditor, CustomSectionsEditor, DesignPanel, SectionOrderPanel } from "./SectionForms";
import { PagedResume } from "@/features/templates/PagedResume";
import { TemplateGallery } from "@/features/templates/TemplateGallery";
import { PdfExporter, type PdfExporterHandle } from "@/features/export/PdfExporter";
import { ImportDialog } from "@/features/resumes/ImportDialog";
import { analyzeAts, computeCompleteness, TEMPLATE_META } from "@/lib/resume-utils";
import { PAGE_SIZES } from "@/features/templates/ResumeDocument";
import type { ResumeDocument, TemplateId } from "@/lib/validation";

type NavKey = ReturnType<typeof useEditorStore.getState>["activeSection"] | "order";

const NAV: { key: NavKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "profile", label: "Personal Info", icon: User },
  { key: "summary", label: "Summary", icon: FileText },
  { key: "experience", label: "Experience", icon: Briefcase },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "skills", label: "Skills", icon: Wrench },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "certifications", label: "Certifications", icon: Award },
  { key: "languages", label: "Languages", icon: Languages },
  { key: "awards", label: "Awards", icon: Trophy },
  { key: "volunteer", label: "Volunteer", icon: HeartHandshake },
  { key: "custom", label: "Custom Sections", icon: Plus },
  { key: "order", label: "Section Order", icon: ListOrdered },
  { key: "design", label: "Design", icon: Palette },
];

function SaveIndicator() {
  const status = useEditorStore((s) => s.status);
  const error = useEditorStore((s) => s.error);
  const flush = useEditorStore((s) => s.flush);
  const map = {
    idle: { icon: Check, text: "Saved", cls: "text-gray-500" },
    saved: { icon: Check, text: "Saved", cls: "text-emerald-600" },
    dirty: { icon: Loader2, text: "Unsaved changes", cls: "text-gray-500" },
    saving: { icon: Loader2, text: "Saving…", cls: "text-gray-500" },
    error: { icon: AlertCircle, text: "Unable to save changes", cls: "text-red-600" },
    offline: { icon: CloudOff, text: "Offline — changes kept locally", cls: "text-amber-600" },
  }[status];
  const Icon = map.icon;
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", map.cls)} role="status" aria-live="polite" title={error ?? undefined}>
      <Icon className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} />
      <span className="hidden sm:inline">{map.text}</span>
      {status === "error" && (
        <button onClick={() => flush()} className="underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function EditorShell({ resumeId, initialDoc, isDemo }: { resumeId: string; initialDoc: ResumeDocument; isDemo: boolean }) {
  const router = useRouter();
  const init = useEditorStore((s) => s.init);
  const doc = useEditorStore((s) => s.doc);
  const storeResumeId = useEditorStore((s) => s.resumeId);
  const active = useEditorStore((s) => s.activeSection) as NavKey;
  const setActive = useEditorStore((s) => s.setActiveSection);
  const apply = useEditorStore((s) => s.apply);
  const flush = useEditorStore((s) => s.flush);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [mobileTab, setMobileTab] = React.useState<"edit" | "preview">("edit");
  const [navOpen, setNavOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [atsOpen, setAtsOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState(initialDoc.title);
  const [previewScale, setPreviewScale] = React.useState(0.6);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const exporterRef = React.useRef<PdfExporterHandle>(null);

  // Initialise the store exactly once per resume id; never re-init on prop
  // identity changes (e.g. router refresh) so unsaved local edits survive.
  const initialized = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (initialized.current !== resumeId) {
      initialized.current = resumeId;
      init(resumeId, initialDoc);
    }
  }, [resumeId, initialDoc, init]);

  // Fit preview to container width
  React.useEffect(() => {
    const el = previewRef.current;
    if (!el || !doc) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 48;
      setPreviewScale(Math.min(1, w / PAGE_SIZES[doc.settings.pageSize].w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [doc?.settings.pageSize, doc, mobileTab]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s") {
        e.preventDefault();
        void flush();
      } else if (e.key === "z" && !e.shiftKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        undo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush, undo, redo]);

  if (!doc || storeResumeId !== resumeId) {
    return (
      <div className="flex h-dvh flex-col bg-gray-50 dark:bg-gray-950" aria-busy="true">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
          <span className="text-sm font-semibold">{initialDoc.title}</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading editor…</span>
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading your resume…</div>
      </div>
    );
  }

  const completeness = computeCompleteness(doc);
  const ats = atsOpen ? analyzeAts(doc) : null;

  const setTemplate = (templateId: TemplateId) => {
    apply((d) => ({ ...d, templateId }), ["templateId"]);
    toast.success(`${TEMPLATE_META[templateId].name} template applied`);
  };

  const saveTitle = () => {
    const t = title.trim();
    if (!t) return toast.error("Title is required");
    apply((d) => ({ ...d, title: t }), ["title"]);
    setRenameOpen(false);
  };

  const duplicate = async () => {
    setBusy("duplicate");
    try {
      await flush();
      const { resume } = await api<{ resume: { id: string } }>(`/api/resumes/${resumeId}/duplicate`, { method: "POST" });
      toast.success("Resume duplicated");
      router.push(`/resume/${resume.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await api(`/api/resumes/${resumeId}`, { method: "DELETE" });
      localStorage.removeItem(`rf:backup:${resumeId}`);
      useEditorStore.setState({ dirty: new Set(), status: "saved" });
      toast.success("Resume deleted");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  };

  const exportJson = async () => {
    await flush();
    window.location.href = `/api/resumes/${resumeId}/export`;
    toast.success("Exporting JSON");
  };

  const download = async () => {
    setBusy("pdf");
    try {
      await flush();
      await exporterRef.current?.exportPdf(doc);
    } finally {
      setBusy(null);
    }
  };

  const panel = (() => {
    switch (active) {
      case "profile": return <ProfileForm />;
      case "summary": return <SummaryForm resumeId={resumeId} />;
      case "experience": return <ExperienceEditor resumeId={resumeId} />;
      case "education": return <EducationEditor resumeId={resumeId} />;
      case "skills": return <SkillsEditor />;
      case "projects": return <ProjectsEditor resumeId={resumeId} />;
      case "certifications": return <CertificationsEditor />;
      case "languages": return <LanguagesEditor />;
      case "awards": return <AwardsEditor resumeId={resumeId} />;
      case "volunteer": return <VolunteerEditor resumeId={resumeId} />;
      case "custom": return <CustomSectionsEditor resumeId={resumeId} />;
      case "order": return <SectionOrderPanel />;
      case "design": return <DesignPanel />;
      default: return null;
    }
  })();
  const activeNav = NAV.find((n) => n.key === active)!;
  const activeIdx = NAV.findIndex((n) => n.key === active);

  const nav = (
    <nav aria-label="Resume sections" className="flex flex-col gap-0.5 p-2">
      {NAV.map((n) => {
        const Icon = n.icon;
        const count = ["experience", "education", "skills", "projects", "certifications", "languages", "awards", "volunteer", "custom"].includes(n.key) ? (doc[n.key as "experience"] as unknown[]).length : null;
        return (
          <button
            key={n.key}
            onClick={() => {
              setActive(n.key as never);
              setNavOpen(false);
            }}
            aria-current={active === n.key ? "page" : undefined}
            className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm", active === n.key ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800")}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{n.label}</span>
            {count ? <span className={cn("rounded px-1.5 text-[10px]", active === n.key ? "bg-white/20" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300")}>{count}</span> : null}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-dvh flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="no-print flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
        <Link href="/dashboard" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Back to dashboard">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden md:inline">Dashboard</span>
        </Link>
        <button onClick={() => setRenameOpen(true)} className="group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800" title="Rename">
          <span className="truncate text-sm font-semibold">{doc.title}</span>
          {isDemo && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Demo</span>}
          <Pencil className="h-3 w-3 shrink-0 text-gray-400 opacity-0 group-hover:opacity-100" />
        </button>
        <SaveIndicator />
        <div className="flex-1" />
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate className="h-4 w-4" /> Templates
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAtsOpen(true)}>
            <ScanSearch className="h-4 w-4" /> ATS Check
          </Button>
          <Link href={`/resume/${resumeId}/preview`} className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
            <Eye className="h-4 w-4" /> Preview
          </Link>
        </div>
        <Button size="sm" onClick={download} loading={busy === "pdf"}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{busy === "pdf" ? "Generating PDF…" : "Download PDF"}</span>
        </Button>
        <Dropdown
          trigger={
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          }
        >
          <div className="md:hidden">
            <MenuItem icon={LayoutTemplate} onClick={() => setTemplatesOpen(true)}>Templates</MenuItem>
            <MenuItem icon={ScanSearch} onClick={() => setAtsOpen(true)}>ATS Check</MenuItem>
            <MenuItem icon={Eye} onClick={() => router.push(`/resume/${resumeId}/preview`)}>Preview</MenuItem>
            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          </div>
          <MenuItem icon={Pencil} onClick={() => setRenameOpen(true)}>Rename</MenuItem>
          <MenuItem icon={Copy} onClick={duplicate}>Duplicate</MenuItem>
          <MenuItem icon={FileJson} onClick={exportJson}>Export JSON</MenuItem>
          <MenuItem icon={FileUp} onClick={() => setImportOpen(true)}>Import…</MenuItem>
          <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
          <MenuItem icon={Trash2} danger onClick={() => setDeleteOpen(true)}>Delete</MenuItem>
        </Dropdown>
      </header>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Desktop nav */}
        <aside className="no-print hidden w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:flex">
          <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
            <ProgressRing value={completeness.score} />
            <div>
              <div className="text-xs font-medium">Completeness</div>
              <div className="text-[11px] text-gray-500">{completeness.suggestions[0] ?? "Looking great!"}</div>
            </div>
          </div>
          {nav}
        </aside>

        {/* Form panel */}
        <section className={cn("no-print flex min-h-0 w-full flex-col lg:w-[460px] lg:shrink-0 xl:w-[520px]", mobileTab === "preview" && "hidden lg:flex")} aria-label="Editor">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
            <button className="lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open section list">
              <PanelLeft className="h-5 w-5" />
            </button>
            <activeNav.icon className="h-4 w-4 text-gray-500" />
            <h1 className="text-sm font-semibold">{activeNav.label}</h1>
            <div className="flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} aria-label="Undo"><Undo2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} aria-label="Redo"><Redo2 className="h-4 w-4" /></Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-24 lg:pb-6">
            <div key={active} className="animate-fade-in">{panel}</div>
            <div className="mt-6 flex justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
              <Button variant="ghost" size="sm" disabled={activeIdx === 0} onClick={() => setActive(NAV[activeIdx - 1].key as never)}>
                <ArrowLeft className="h-4 w-4" /> {NAV[activeIdx - 1]?.label}
              </Button>
              <Button variant="outline" size="sm" disabled={activeIdx === NAV.length - 1} onClick={() => setActive(NAV[activeIdx + 1].key as never)}>
                {NAV[activeIdx + 1]?.label} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Preview */}
        <section ref={previewRef} className={cn("min-h-0 flex-1 overflow-auto bg-gray-100 p-6 dark:bg-gray-950", mobileTab === "edit" && "hidden lg:block")} aria-label="Live preview">
          <PagedResume doc={doc} scale={previewScale} />
        </section>
      </div>

      {/* Mobile tab bar */}
      <div className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:hidden" role="tablist">
        {(["edit", "preview"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={mobileTab === t} onClick={() => setMobileTab(t)} className={cn("flex h-12 items-center justify-center gap-2 text-sm font-medium", mobileTab === t ? "text-gray-900 dark:text-white" : "text-gray-500")}>
            {t === "edit" ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {t === "edit" ? "Edit" : "Preview"}
          </button>
        ))}
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)}>
          <div className="h-full w-72 overflow-y-auto bg-white dark:bg-gray-900" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Sections">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
              <ProgressRing value={completeness.score} />
              <div className="text-xs font-medium">Completeness</div>
            </div>
            {nav}
          </div>
        </div>
      )}

      {/* Templates */}
      <Modal open={templatesOpen} onClose={() => setTemplatesOpen(false)} title="Choose a template" description="Templates apply instantly and are saved automatically." size="xl">
        <TemplateGallery doc={doc} selected={doc.templateId} onSelect={setTemplate} columns={4} thumbWidth={170} />
      </Modal>

      {/* ATS */}
      <Modal open={atsOpen} onClose={() => setAtsOpen(false)} title="ATS Check" description="Heuristic analysis of parser-friendliness and content strength. This is guidance, not a guarantee of how any specific ATS will score you." size="lg">
        {ats && (
          <div>
            <div className="flex items-center gap-4">
              <ProgressRing value={ats.score} size={64} />
              <div>
                <div className="text-2xl font-semibold">{ats.score}/100</div>
                <div className="text-sm text-gray-500">{ats.issues.length === 0 ? "No issues found" : `${ats.issues.length} suggestion${ats.issues.length > 1 ? "s" : ""}`}</div>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {ats.issues.map((i, idx) => (
                <li key={idx} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className={cn("h-2 w-2 rounded-full", i.severity === "high" ? "bg-red-500" : i.severity === "medium" ? "bg-amber-500" : "bg-gray-400")} aria-hidden />
                    <span className="sr-only">{i.severity} severity:</span>
                    {i.title}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{i.detail}</p>
                </li>
              ))}
            </ul>
            {ats.passed.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Passed</div>
                <ul className="flex flex-wrap gap-1.5">
                  {ats.passed.map((p) => (
                    <li key={p} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <Check className="h-3 w-3" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Rename */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename resume" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveTitle(); }}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Resume title" />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete this resume?" description="This action cannot be undone. All sections and settings for this resume will be permanently removed." size="sm">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" onClick={remove} loading={busy === "delete"}>{busy === "delete" ? "Deleting…" : "Delete Resume"}</Button>
        </div>
      </Modal>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        mode="replace"
        onConfirm={(imported) => {
          apply((d) => ({ ...imported, title: d.title, templateId: d.templateId, settings: { ...d.settings, sectionOrder: imported.settings.sectionOrder } }), ["summary", "profile", "settings", "experience", "education", "skills", "projects", "certifications", "languages", "awards", "volunteer", "custom"]);
          setImportOpen(false);
          toast.success("Imported — review the sections and adjust as needed");
        }}
      />

      <PdfExporter ref={exporterRef} />
    </div>
  );
}
