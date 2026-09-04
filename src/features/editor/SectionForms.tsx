"use client";

import * as React from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown, Plus, Undo2, Redo2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Input, Textarea, Select, Label, cn } from "@/components/ui";
import { useEditorStore, type ListKey } from "./store";
import { AiAssist } from "@/features/ai/AiAssist";
import { newId, SECTION_LABELS, normalizeSectionOrder } from "@/lib/resume-utils";
import { profileSchema, SECTION_KEYS, type ResumeDocument, type SectionKey } from "@/lib/validation";

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------
export function ProfileForm() {
  const doc = useEditorStore((s) => s.doc)!;
  const apply = useEditorStore((s) => s.apply);
  const p = doc.profile;
  const set = (patch: Partial<ResumeDocument["profile"]>) => apply((d) => ({ ...d, profile: { ...d.profile, ...patch } }), ["profile"]);
  const parsed = profileSchema.safeParse(p);
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[String(i.path[0])] = i.message;

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast.error("Invalid file. Use a PNG, JPEG or WebP image.");
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large. Maximum 5 MB.");
    // Verify magic bytes — never trust extension alone
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isPng = head[0] === 0x89 && head[1] === 0x50;
    const isJpg = head[0] === 0xff && head[1] === 0xd8;
    const isWebp = head[8] === 0x57 && head[9] === 0x45;
    if (!isPng && !isJpg && !isWebp) return toast.error("File content does not match an image.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 400;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      set({ profileImage: c.toDataURL("image/jpeg", 0.85) });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => toast.error("Could not read image.");
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.profileImage ? <img src={p.profileImage} alt="Profile photo" className="h-full w-full object-cover" /> : <ImagePlus className="absolute inset-0 m-auto h-6 w-6 text-gray-400" />}
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-gray-300 px-3 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Upload photo
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          {p.profileImage && (
            <Button variant="ghost" size="sm" onClick={() => set({ profileImage: null })}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required htmlFor="fullName">
          <Input id="fullName" value={p.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="Jordan Avery" autoComplete="name" />
        </Field>
        <Field label="Professional headline" htmlFor="headline">
          <Input id="headline" value={p.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Senior Software Engineer" />
        </Field>
        <Field label="Email" required htmlFor="email" error={errors.email}>
          <Input id="email" type="email" value={p.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} placeholder="you@example.com" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+1 555 000 0000" />
        </Field>
        <Field label="Location" htmlFor="location">
          <Input id="location" value={p.location} onChange={(e) => set({ location: e.target.value })} placeholder="Austin, TX" />
        </Field>
        <Field label="Website" htmlFor="website" error={errors.website}>
          <Input id="website" value={p.website} aria-invalid={!!errors.website} onChange={(e) => set({ website: e.target.value })} placeholder="yourname.dev" />
        </Field>
        <Field label="LinkedIn" htmlFor="linkedin" error={errors.linkedin}>
          <Input id="linkedin" value={p.linkedin} aria-invalid={!!errors.linkedin} onChange={(e) => set({ linkedin: e.target.value })} placeholder="linkedin.com/in/you" />
        </Field>
        <Field label="GitHub" htmlFor="github" error={errors.github}>
          <Input id="github" value={p.github} aria-invalid={!!errors.github} onChange={(e) => set({ github: e.target.value })} placeholder="github.com/you" />
        </Field>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
export function SummaryForm({ resumeId }: { resumeId: string }) {
  const doc = useEditorStore((s) => s.doc)!;
  const apply = useEditorStore((s) => s.apply);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const set = (summary: string) => apply((d) => ({ ...d, summary }), ["summary"]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor="summary" className="mb-0">
          Professional summary
        </Label>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!past.length} aria-label="Undo">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!future.length} aria-label="Redo">
            <Redo2 className="h-4 w-4" />
          </Button>
          <AiAssist resumeId={resumeId} text={doc.summary} context={{ field: "summary", headline: doc.profile.headline }} onAccept={set} actions={["improve", "shorten", "expand", "professional", "ats"]} />
        </div>
      </div>
      <Textarea id="summary" rows={6} value={doc.summary} onChange={(e) => set(e.target.value)} placeholder="2–4 sentences about who you are professionally, what you're great at and what you're looking for." maxLength={4000} />
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>Aim for 300–600 characters.</span>
        <span className={cn(doc.summary.length > 900 && "text-amber-600")}>{doc.summary.length} / 4000</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic sortable list
// ---------------------------------------------------------------------------
type AnyItem = { id: string };

function SortableRow({ id, children, title, onDelete, onDuplicate, onUp, onDown, canUp, canDown, defaultOpen }: { id: string; title: string; children: React.ReactNode; onDelete: () => void; onDuplicate?: () => void; onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean; defaultOpen?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [open, setOpen] = React.useState(!!defaultOpen);
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900", isDragging && "opacity-70 shadow-lg")}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button className="cursor-grab touch-none rounded p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing" aria-label="Drag to reorder" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button className="flex-1 truncate py-1 text-left text-sm font-medium" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {title || <span className="text-gray-400">Untitled</span>}
        </button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUp} disabled={!canUp} aria-label="Move up">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDown} disabled={!canDown} aria-label="Move down">
          <ChevronDown className="h-4 w-4" />
        </Button>
        {onDuplicate && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} aria-label="Duplicate">
            <Copy className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={onDelete} aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {open && <div className="border-t border-gray-100 p-3 dark:border-gray-800">{children}</div>}
    </div>
  );
}

function ListEditor<K extends ListKey>({ listKey, make, title, renderForm, emptyTitle, emptyHint, addLabel }: { listKey: K; make: () => ResumeDocument[K][number]; title: (item: ResumeDocument[K][number]) => string; renderForm: (item: ResumeDocument[K][number], update: (p: Partial<ResumeDocument[K][number]>) => void) => React.ReactNode; emptyTitle: string; emptyHint: string; addLabel: string }) {
  const items = useEditorStore((s) => s.doc![listKey]) as ResumeDocument[K];
  const { setList, updateItem, addItem, removeItem, moveItem } = useEditorStore();
  const [lastAdded, setLastAdded] = React.useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    setList(listKey, arrayMove(items as AnyItem[], from, to) as ResumeDocument[K]);
  };
  const add = () => {
    const it = make();
    addItem(listKey, it);
    setLastAdded(it.id);
  };
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-gray-500">{emptyHint}</p>
          <Button className="mt-4" size="sm" onClick={add}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        </div>
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <SortableRow
                    key={item.id}
                    id={item.id}
                    title={title(item)}
                    defaultOpen={item.id === lastAdded || items.length === 1}
                    canUp={idx > 0}
                    canDown={idx < items.length - 1}
                    onUp={() => moveItem(listKey, idx, idx - 1)}
                    onDown={() => moveItem(listKey, idx, idx + 1)}
                    onDelete={() => removeItem(listKey, item.id)}
                    onDuplicate={() => {
                      const copy = { ...item, id: newId() };
                      setList(listKey, [...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)] as ResumeDocument[K]);
                    }}
                  >
                    {renderForm(item, (p) => updateItem(listKey, item.id, p))}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" size="sm" onClick={add}>
            <Plus className="h-4 w-4" /> {addLabel}
          </Button>
        </>
      )}
    </div>
  );
}

const DateInputs = ({ start, end, current, onChange, allowCurrent }: { start: string; end: string; current?: boolean; onChange: (p: { startDate?: string; endDate?: string; current?: boolean }) => void; allowCurrent?: boolean }) => (
  <>
    <Field label="Start date" htmlFor={undefined}>
      <Input value={start} onChange={(e) => onChange({ startDate: e.target.value })} placeholder="Jan 2022" />
    </Field>
    <Field label="End date">
      <Input value={current ? "" : end} disabled={current} onChange={(e) => onChange({ endDate: e.target.value })} placeholder={current ? "Present" : "Dec 2023"} />
      {allowCurrent && (
        <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={!!current} onChange={(e) => onChange({ current: e.target.checked })} className="rounded" /> Currently here
        </label>
      )}
    </Field>
  </>
);

const DescriptionField = ({ value, onChange, resumeId, context, placeholder }: { value: string; onChange: (v: string) => void; resumeId: string; context?: { position?: string; company?: string; field?: string }; placeholder?: string }) => (
  <div className="sm:col-span-2">
    <div className="mb-1.5 flex items-center justify-between">
      <Label className="mb-0">Description</Label>
      <AiAssist resumeId={resumeId} text={value} context={context} onAccept={onChange} />
    </div>
    <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "One achievement per line. Start with an action verb; add numbers where you truthfully can."} />
  </div>
);

// ---------------------------------------------------------------------------
// Section editors
// ---------------------------------------------------------------------------
export function ExperienceEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="experience"
      make={() => ({ id: newId(), company: "", position: "", location: "", startDate: "", endDate: "", current: false, description: "" })}
      title={(e) => [e.position, e.company].filter(Boolean).join(" · ")}
      emptyTitle="No experience added yet."
      emptyHint="Add your first position to show employers where you've made an impact."
      addLabel="Add experience"
      renderForm={(e, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Job title" required>
            <Input value={e.position} onChange={(ev) => u({ position: ev.target.value })} placeholder="Software Engineer" />
          </Field>
          <Field label="Company" required>
            <Input value={e.company} onChange={(ev) => u({ company: ev.target.value })} placeholder="Acme Inc." />
          </Field>
          <Field label="Location">
            <Input value={e.location} onChange={(ev) => u({ location: ev.target.value })} placeholder="Remote" />
          </Field>
          <div />
          <DateInputs start={e.startDate} end={e.endDate} current={e.current} onChange={u} allowCurrent />
          <DescriptionField value={e.description} onChange={(description) => u({ description })} resumeId={resumeId} context={{ field: "experience description", position: e.position, company: e.company }} />
        </div>
      )}
    />
  );
}

export function EducationEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="education"
      make={() => ({ id: newId(), institution: "", degree: "", field: "", location: "", startDate: "", endDate: "", description: "" })}
      title={(e) => [e.degree, e.institution].filter(Boolean).join(" · ")}
      emptyTitle="No education added yet."
      emptyHint="Add your degrees, bootcamps or relevant coursework."
      addLabel="Add education"
      renderForm={(e, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Institution" required>
            <Input value={e.institution} onChange={(ev) => u({ institution: ev.target.value })} placeholder="University of Texas" />
          </Field>
          <Field label="Location">
            <Input value={e.location} onChange={(ev) => u({ location: ev.target.value })} />
          </Field>
          <Field label="Degree">
            <Input value={e.degree} onChange={(ev) => u({ degree: ev.target.value })} placeholder="B.S." />
          </Field>
          <Field label="Field of study">
            <Input value={e.field} onChange={(ev) => u({ field: ev.target.value })} placeholder="Computer Science" />
          </Field>
          <DateInputs start={e.startDate} end={e.endDate} onChange={u} />
          <DescriptionField value={e.description} onChange={(description) => u({ description })} resumeId={resumeId} context={{ field: "education description" }} placeholder="Honors, thesis, relevant coursework…" />
        </div>
      )}
    />
  );
}

const LEVELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];
export function SkillsEditor() {
  const [quick, setQuick] = React.useState("");
  const addItem = useEditorStore((s) => s.addItem);
  const quickAdd = () => {
    const names = quick
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    names.forEach((name) => addItem("skills", { id: newId(), name, level: "" }));
    setQuick("");
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              quickAdd();
            }
          }}
          placeholder="Type skills separated by commas and press Enter"
          aria-label="Quick add skills"
        />
        <Button variant="outline" onClick={quickAdd} disabled={!quick.trim()}>
          Add
        </Button>
      </div>
      <ListEditor
        listKey="skills"
        make={() => ({ id: newId(), name: "", level: "" })}
        title={(s) => (s.level ? `${s.name} — ${s.level}` : s.name)}
        emptyTitle="No skills added yet."
        emptyHint="List 8–15 skills that match the roles you're targeting."
        addLabel="Add skill"
        renderForm={(s, u) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Skill" required>
              <Input value={s.name} onChange={(e) => u({ name: e.target.value })} placeholder="TypeScript" />
            </Field>
            <Field label="Proficiency">
              <Select value={s.level} onChange={(e) => u({ level: e.target.value })}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l || "Not specified"}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      />
    </div>
  );
}

export function ProjectsEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="projects"
      make={() => ({ id: newId(), name: "", description: "", url: "", technologies: "", startDate: "", endDate: "" })}
      title={(p) => p.name}
      emptyTitle="No projects added yet."
      emptyHint="Side projects, open source and notable work products all count."
      addLabel="Add project"
      renderForm={(p, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Project name" required>
            <Input value={p.name} onChange={(e) => u({ name: e.target.value })} />
          </Field>
          <Field label="URL">
            <Input value={p.url} onChange={(e) => u({ url: e.target.value })} placeholder="github.com/you/project" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Technologies">
              <Input value={p.technologies} onChange={(e) => u({ technologies: e.target.value })} placeholder="React, Node.js, PostgreSQL" />
            </Field>
          </div>
          <DateInputs start={p.startDate} end={p.endDate} onChange={u} />
          <DescriptionField value={p.description} onChange={(description) => u({ description })} resumeId={resumeId} context={{ field: "project description" }} />
        </div>
      )}
    />
  );
}

export function CertificationsEditor() {
  return (
    <ListEditor
      listKey="certifications"
      make={() => ({ id: newId(), name: "", issuer: "", date: "", url: "" })}
      title={(c) => [c.name, c.issuer].filter(Boolean).join(" · ")}
      emptyTitle="No certifications yet."
      emptyHint="Add professional certifications and licenses."
      addLabel="Add certification"
      renderForm={(c, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Certification" required>
            <Input value={c.name} onChange={(e) => u({ name: e.target.value })} />
          </Field>
          <Field label="Issuer">
            <Input value={c.issuer} onChange={(e) => u({ issuer: e.target.value })} />
          </Field>
          <Field label="Date">
            <Input value={c.date} onChange={(e) => u({ date: e.target.value })} placeholder="2023" />
          </Field>
          <Field label="URL">
            <Input value={c.url} onChange={(e) => u({ url: e.target.value })} />
          </Field>
        </div>
      )}
    />
  );
}

const PROF = ["", "Elementary", "Limited working", "Intermediate", "Professional working", "Fluent", "Native"];
export function LanguagesEditor() {
  return (
    <ListEditor
      listKey="languages"
      make={() => ({ id: newId(), language: "", proficiency: "" })}
      title={(l) => [l.language, l.proficiency].filter(Boolean).join(" — ")}
      emptyTitle="No languages yet."
      emptyHint="Add languages you can work in."
      addLabel="Add language"
      renderForm={(l, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Language" required>
            <Input value={l.language} onChange={(e) => u({ language: e.target.value })} />
          </Field>
          <Field label="Proficiency">
            <Select value={l.proficiency} onChange={(e) => u({ proficiency: e.target.value })}>
              {PROF.map((p) => (
                <option key={p} value={p}>
                  {p || "Not specified"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    />
  );
}

export function AwardsEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="awards"
      make={() => ({ id: newId(), title: "", issuer: "", date: "", description: "" })}
      title={(a) => a.title}
      emptyTitle="No awards yet."
      emptyHint="Recognition, scholarships, competitions."
      addLabel="Add award"
      renderForm={(a, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Award title" required>
            <Input value={a.title} onChange={(e) => u({ title: e.target.value })} />
          </Field>
          <Field label="Issuer">
            <Input value={a.issuer} onChange={(e) => u({ issuer: e.target.value })} />
          </Field>
          <Field label="Date">
            <Input value={a.date} onChange={(e) => u({ date: e.target.value })} />
          </Field>
          <div />
          <DescriptionField value={a.description} onChange={(description) => u({ description })} resumeId={resumeId} context={{ field: "award description" }} />
        </div>
      )}
    />
  );
}

export function VolunteerEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="volunteer"
      make={() => ({ id: newId(), organization: "", role: "", startDate: "", endDate: "", description: "" })}
      title={(v) => [v.role, v.organization].filter(Boolean).join(" · ")}
      emptyTitle="No volunteer experience yet."
      emptyHint="Community work shows initiative and values."
      addLabel="Add volunteer experience"
      renderForm={(v, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Organization" required>
            <Input value={v.organization} onChange={(e) => u({ organization: e.target.value })} />
          </Field>
          <Field label="Role">
            <Input value={v.role} onChange={(e) => u({ role: e.target.value })} />
          </Field>
          <DateInputs start={v.startDate} end={v.endDate} onChange={u} />
          <DescriptionField value={v.description} onChange={(description) => u({ description })} resumeId={resumeId} context={{ field: "volunteer description" }} />
        </div>
      )}
    />
  );
}

export function CustomSectionsEditor({ resumeId }: { resumeId: string }) {
  return (
    <ListEditor
      listKey="custom"
      make={() => ({ id: newId(), title: "", content: "" })}
      title={(c) => c.title}
      emptyTitle="No custom sections yet."
      emptyHint="Publications, research, interests, leadership — anything that doesn't fit elsewhere."
      addLabel="Add custom section"
      renderForm={(c, u) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Section title" required>
              <Input value={c.title} onChange={(e) => u({ title: e.target.value })} placeholder="Publications" />
            </Field>
          </div>
          <DescriptionField value={c.content} onChange={(content) => u({ content })} resumeId={resumeId} context={{ field: c.title || "custom section" }} placeholder="One item per line." />
        </div>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Design
// ---------------------------------------------------------------------------
const PRESET_COLORS = ["#1e3a5f", "#111827", "#0f766e", "#7c3aed", "#9f1239", "#b45309", "#1d4ed8", "#374151"];
const FONTS: { id: ResumeDocument["settings"]["fontFamily"]; label: string }[] = [
  { id: "inter", label: "Inter (sans)" },
  { id: "helvetica", label: "Helvetica (sans)" },
  { id: "lato", label: "Lato (sans)" },
  { id: "georgia", label: "Georgia (serif)" },
  { id: "garamond", label: "Garamond (serif)" },
  { id: "roboto-mono", label: "Roboto Mono" },
];

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-gray-300 p-0.5 dark:border-gray-700">
        {options.map((o) => (
          <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={cn("rounded px-3 py-1 text-xs font-medium", value === o.value ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DesignPanel() {
  const settings = useEditorStore((s) => s.doc!.settings);
  const apply = useEditorStore((s) => s.apply);
  const set = (patch: Partial<ResumeDocument["settings"]>) => apply((d) => ({ ...d, settings: { ...d.settings, ...patch } }), ["settings"]);
  return (
    <div className="space-y-5">
      <div>
        <Label>Accent color</Label>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} aria-label={`Color ${c}`} aria-pressed={settings.primaryColor === c} onClick={() => set({ primaryColor: c })} className={cn("h-7 w-7 rounded-full border-2", settings.primaryColor === c ? "border-gray-900 dark:border-white" : "border-transparent")} style={{ background: c }} />
          ))}
          <label className="ml-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <input type="color" value={settings.primaryColor} onChange={(e) => set({ primaryColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-gray-300 bg-transparent" aria-label="Custom color" />
            Custom
          </label>
        </div>
      </div>
      <Field label="Font family" htmlFor="font">
        <Select id="font" value={settings.fontFamily} onChange={(e) => set({ fontFamily: e.target.value as ResumeDocument["settings"]["fontFamily"] })}>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      <Segmented label="Font size" value={settings.fontSize} onChange={(fontSize) => set({ fontSize })} options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} />
      <Segmented label="Spacing" value={settings.spacing} onChange={(spacing) => set({ spacing })} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]} />
      <Segmented label="Page size" value={settings.pageSize} onChange={(pageSize) => set({ pageSize })} options={[{ value: "A4", label: "A4" }, { value: "Letter", label: "US Letter" }]} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={settings.showPhoto} onChange={(e) => set({ showPhoto: e.target.checked })} className="rounded" /> Show profile photo
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section order
// ---------------------------------------------------------------------------
function OrderRow({ id, label, onUp, onDown, canUp, canDown }: { id: string; label: string; onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
      <button className="cursor-grab touch-none text-gray-400" aria-label={`Drag ${label}`} {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1">{label}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onUp} disabled={!canUp} aria-label={`Move ${label} up`}>
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDown} disabled={!canDown} aria-label={`Move ${label} down`}>
        <ChevronDown className="h-4 w-4" />
      </Button>
    </li>
  );
}

export function SectionOrderPanel() {
  const order = normalizeSectionOrder(useEditorStore((s) => s.doc!.settings.sectionOrder));
  const apply = useEditorStore((s) => s.apply);
  const setOrder = (sectionOrder: SectionKey[]) => apply((d) => ({ ...d, settings: { ...d.settings, sectionOrder } }), ["settings"]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  return (
    <div>
      <p className="mb-3 text-xs text-gray-500">Drag or use the arrows to change the order sections appear on your resume. Empty sections are hidden automatically.</p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          if (!e.over || e.active.id === e.over.id) return;
          setOrder(arrayMove(order, order.indexOf(e.active.id as SectionKey), order.indexOf(e.over.id as SectionKey)));
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {order.map((k, i) => (
              <OrderRow key={k} id={k} label={SECTION_LABELS[k]} canUp={i > 0} canDown={i < order.length - 1} onUp={() => setOrder(arrayMove(order, i, i - 1))} onDown={() => setOrder(arrayMove(order, i, i + 1))} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <Button variant="ghost" size="sm" className="mt-3" onClick={() => setOrder([...SECTION_KEYS])}>
        <X className="h-3.5 w-3.5" /> Reset to default
      </Button>
    </div>
  );
}
