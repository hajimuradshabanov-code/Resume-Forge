"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FilePlus2, FileUp, LayoutTemplate, MoreHorizontal, Pencil, Copy, Trash2, Download, Eye, Sparkles, Search } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button, Dropdown, MenuItem, Modal, Input, Select, ProgressRing, Badge, api, cn } from "@/components/ui";
import { ImportDialog, createResumeFromImport } from "@/features/resumes/ImportDialog";
import { TemplateThumb } from "@/features/templates/TemplateGallery";
import { PdfExporter, type PdfExporterHandle } from "@/features/export/PdfExporter";
import { TemplateMeta } from "./TemplateMeta";
import { demoDocument } from "@/lib/demo-resume";
import { emptyDocument, TEMPLATE_META } from "@/lib/resume-utils";
import type { ResumeListItem } from "@/server/resumes";
import { TEMPLATE_IDS, type ResumeDocument, type TemplateId } from "@/lib/validation";

type Item = Omit<ResumeListItem, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString();
}

export function DashboardView({ user, initialResumes }: { user: { name: string; email: string; image: string | null; defaultTemplateId: string }; initialResumes: Item[] }) {
  const router = useRouter();
  const [resumes, setResumes] = React.useState(initialResumes);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "updated" | "created">("all");
  const [sort, setSort] = React.useState<"updated" | "created" | "name">("updated");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [templatePick, setTemplatePick] = React.useState(false);
  const [rename, setRename] = React.useState<Item | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [del, setDel] = React.useState<Item | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const exporterRef = React.useRef<PdfExporterHandle>(null);

  React.useEffect(() => setResumes(initialResumes), [initialResumes]);

  const refresh = async () => {
    const { resumes } = await api<{ resumes: Item[] }>("/api/resumes");
    setResumes(resumes);
  };

  const create = async (mode: "scratch" | "template" | "demo", templateId?: TemplateId) => {
    setBusy("create");
    try {
      const { resume } = await api<{ resume: { id: string } }>("/api/resumes", { method: "POST", json: { mode, templateId, title: mode === "demo" ? "Demo Resume" : "Untitled Resume" } });
      toast.success(mode === "demo" ? "Demo resume added" : "Resume created");
      router.push(`/resume/${resume.id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  };

  const duplicate = async (r: Item) => {
    setBusy(r.id);
    try {
      await api(`/api/resumes/${r.id}/duplicate`, { method: "POST" });
      toast.success("Resume duplicated");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveRename = async () => {
    if (!rename) return;
    const title = renameValue.trim();
    if (!title) return toast.error("Title is required");
    setBusy(rename.id);
    try {
      await api(`/api/resumes/${rename.id}`, { method: "PATCH", json: { title } });
      setResumes((rs) => rs.map((x) => (x.id === rename.id ? { ...x, title } : x)));
      toast.success("Renamed");
      setRename(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(del.id);
    try {
      await api(`/api/resumes/${del.id}`, { method: "DELETE" });
      setResumes((rs) => rs.filter((x) => x.id !== del.id));
      toast.success("Resume deleted");
      setDel(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const download = async (r: Item) => {
    setBusy(`pdf:${r.id}`);
    try {
      const { resume } = await api<{ resume: { document: ResumeDocument } }>(`/api/resumes/${r.id}`);
      await exporterRef.current?.exportPdf(resume.document);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const now = Date.now();
  const visible = resumes
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.fullName.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => (filter === "updated" ? now - new Date(r.updatedAt).getTime() < 7 * 86400000 : filter === "created" ? now - new Date(r.createdAt).getTime() < 7 * 86400000 : true))
    .sort((a, b) => (sort === "name" ? a.title.localeCompare(b.title) : sort === "created" ? +new Date(b.createdAt) - +new Date(a.createdAt) : +new Date(b.updatedAt) - +new Date(a.updatedAt)));

  const firstName = user.name.split(" ")[0];
  const lowest = resumes.length ? resumes.reduce((a, b) => (a.completeness < b.completeness ? a : b)) : null;
  const notifications = lowest && lowest.completeness < 70 ? [`"${lowest.title}" is ${lowest.completeness}% complete — add a summary or more skills to strengthen it.`] : [];

  return (
    <div className="min-h-screen">
      <AppHeader user={user} search={search} onSearch={setSearch} notifications={notifications} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {greeting()}, {firstName}.
            </h1>
            <p className="mt-1 text-sm text-gray-500">Ready to improve your career?</p>
          </div>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" /> Create Resume
          </Button>
        </div>

        {resumes.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <label className="relative sm:hidden">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-9 w-44 pl-8" aria-label="Search resumes" />
            </label>
            <div role="radiogroup" aria-label="Filter" className="inline-flex rounded-md border border-gray-300 p-0.5 dark:border-gray-700">
              {([["all", "All"], ["updated", "Recently updated"], ["created", "Created recently"]] as const).map(([v, l]) => (
                <button key={v} role="radio" aria-checked={filter === v} onClick={() => setFilter(v)} className={cn("rounded px-3 py-1 text-xs font-medium", filter === v ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800")}>
                  {l}
                </button>
              ))}
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-9 w-auto py-0 text-xs" aria-label="Sort by">
              <option value="updated">Sort: Last updated</option>
              <option value="created">Sort: Created date</option>
              <option value="name">Sort: Name</option>
            </Select>
            <span className="ml-auto text-xs text-gray-500">{visible.length} of {resumes.length}</span>
          </div>
        )}

        {resumes.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
            <FilePlus2 className="mx-auto h-10 w-10 text-gray-400" />
            <h2 className="mt-4 text-lg font-semibold">Your first professional resume starts here.</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">Start from scratch, import an existing resume, or explore with a fully filled demo.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setCreateOpen(true)} loading={busy === "create"}>
                <Plus className="h-4 w-4" /> Create your first resume
              </Button>
              <Button variant="outline" onClick={() => create("demo")} disabled={busy === "create"}>
                <Sparkles className="h-4 w-4" /> Add demo resume
              </Button>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <p className="mt-12 text-center text-sm text-gray-500">No resumes match your search.</p>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((r) => (
              <li key={r.id} className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
                <Link href={`/resume/${r.id}`} className="relative block bg-gray-100 p-4 dark:bg-gray-800" aria-label={`Edit ${r.title}`}>
                  <div className="mx-auto w-fit overflow-hidden rounded shadow-sm" style={{ maxHeight: 200 }}>
                    <TemplateMeta item={r} />
                  </div>
                  {r.isDemo && <span className="absolute left-3 top-3"><Badge tone="amber">Demo Resume</Badge></span>}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/resume/${r.id}`} className="block truncate font-medium hover:underline">{r.title}</Link>
                      <div className="mt-0.5 truncate text-xs text-gray-500">{TEMPLATE_META[r.templateId as TemplateId]?.name ?? r.templateId} · Updated {timeAgo(r.updatedAt)}</div>
                    </div>
                    <ProgressRing value={r.completeness} size={36} />
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/resume/${r.id}`)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => download(r)} loading={busy === `pdf:${r.id}`} aria-label="Download PDF"><Download className="h-3.5 w-3.5" /></Button>
                    <div className="flex-1" />
                    <Dropdown trigger={<Button size="icon" variant="ghost" className="h-8 w-8" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>}>
                      <MenuItem icon={Eye} onClick={() => router.push(`/resume/${r.id}/preview`)}>Preview</MenuItem>
                      <MenuItem icon={Pencil} onClick={() => { setRename(r); setRenameValue(r.title); }}>Rename</MenuItem>
                      <MenuItem icon={Copy} onClick={() => duplicate(r)}>Duplicate</MenuItem>
                      <MenuItem icon={Download} onClick={() => download(r)}>Download PDF</MenuItem>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                      <MenuItem icon={Trash2} danger onClick={() => setDel(r)}>Delete</MenuItem>
                    </Dropdown>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Create flow */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create a new resume" description="Your resume is saved from the very first keystroke." size="lg">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: FilePlus2, title: "Start from scratch", desc: "A blank resume with your name pre-filled.", onClick: () => create("scratch") },
            { icon: FileUp, title: "Import existing resume", desc: "Upload a PDF, DOCX or JSON export.", onClick: () => { setCreateOpen(false); setImportOpen(true); } },
            { icon: LayoutTemplate, title: "Use a template", desc: "Pick a design first, fill in later.", onClick: () => { setCreateOpen(false); setTemplatePick(true); } },
          ].map((o) => (
            <button key={o.title} onClick={o.onClick} disabled={busy === "create"} className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-gray-900 dark:border-gray-700 dark:hover:border-white">
              <o.icon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
              <div className="mt-3 text-sm font-semibold">{o.title}</div>
              <div className="mt-1 text-xs text-gray-500">{o.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={() => create("demo")} disabled={busy === "create"} className="mt-4 flex w-full items-center gap-2 rounded-md border border-dashed border-gray-300 px-3 py-2 text-left text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <Sparkles className="h-4 w-4 text-violet-600" /> Or add a clearly-labeled <strong>Demo Resume</strong> to explore every feature with realistic content.
        </button>
        {busy === "create" && <p className="mt-3 text-center text-sm text-gray-500" role="status">Creating resume…</p>}
      </Modal>

      <Modal open={templatePick} onClose={() => setTemplatePick(false)} title="Pick a template" size="xl">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TEMPLATE_IDS.map((id) => (
            <button key={id} onClick={() => create("template", id)} disabled={busy === "create"} className="rounded-lg border border-gray-200 p-2 text-left hover:border-gray-900 dark:border-gray-700 dark:hover:border-white">
              <TemplateThumb doc={{ ...demoDocument(), templateId: id, settings: { ...emptyDocument().settings, primaryColor: TEMPLATE_META[id].accent } }} width={150} className="mx-auto" />
              <div className="mt-2 text-sm font-medium">{TEMPLATE_META[id].name}</div>
            </button>
          ))}
        </div>
      </Modal>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        mode="create"
        onConfirm={async (doc) => {
          try {
            const { resume } = await createResumeFromImport(doc);
            toast.success("Resume imported");
            setImportOpen(false);
            router.push(`/resume/${resume.id}`);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      <Modal open={!!rename} onClose={() => setRename(null)} title="Rename resume" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); saveRename(); }}>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={120} aria-label="Resume title" />
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRename(null)}>Cancel</Button>
            <Button type="submit" loading={busy === rename?.id}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title="Delete this resume?" description="This action cannot be undone." size="sm">
        <p className="text-sm text-gray-600 dark:text-gray-300">“{del?.title}” and all of its sections will be permanently deleted.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy === del?.id}>{busy === del?.id ? "Deleting…" : "Delete Resume"}</Button>
        </div>
      </Modal>

      <PdfExporter ref={exporterRef} />
    </div>
  );
}
