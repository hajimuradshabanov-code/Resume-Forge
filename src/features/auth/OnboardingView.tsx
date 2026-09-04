"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, api } from "@/components/ui";
import { Logo } from "@/components/AppHeader";
import { TemplateGallery } from "@/features/templates/TemplateGallery";
import { demoDocument } from "@/lib/demo-resume";
import type { TemplateId } from "@/lib/validation";

const ROLES = ["Software / Engineering", "Design / Product", "Marketing / Sales", "Finance / Operations", "Healthcare / Science", "Student / Early career", "Other"];
const LEVELS = ["Entry level", "Mid level", "Senior", "Lead / Manager", "Executive"];

export function OnboardingView({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [role, setRole] = React.useState("");
  const [level, setLevel] = React.useState("");
  const [template, setTemplate] = React.useState<TemplateId>("modern");
  const [busy, setBusy] = React.useState(false);
  const sample = React.useMemo(() => demoDocument(), []);

  const finish = async (createResume: boolean) => {
    setBusy(true);
    try {
      await api("/api/account", { method: "PATCH", json: { onboardingCompleted: true, defaultTemplateId: template } });
      if (createResume) {
        const { resume } = await api<{ resume: { id: string } }>("/api/resumes", { method: "POST", json: { mode: "template", templateId: template, title: role ? `${role.split(" /")[0]} Resume` : "My Resume" } });
        router.push(`/resume/${resume.id}`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const Chip = ({ v, cur, set }: { v: string; cur: string; set: (v: string) => void }) => (
    <button onClick={() => set(v)} aria-pressed={cur === v} className={`rounded-md border px-3 py-2 text-sm ${cur === v ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900" : "border-gray-300 hover:border-gray-500 dark:border-gray-700"}`}>{v}</button>
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <button onClick={() => finish(false)} className="text-sm text-gray-500 hover:underline">Skip for now</button>
      </div>
      <div className="mb-6 flex gap-1.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className={`h-1 flex-1 rounded ${i <= step ? "bg-gray-900 dark:bg-white" : "bg-gray-200 dark:bg-gray-800"}`} />)}</div>
      {step === 0 && (
        <section className="animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name.split(" ")[0]}. What role are you targeting?</h1>
          <p className="mt-1 text-sm text-gray-500">This only helps us suggest a starting point. You can change everything later.</p>
          <div className="mt-6 flex flex-wrap gap-2">{ROLES.map((r) => <Chip key={r} v={r} cur={role} set={setRole} />)}</div>
          <div className="mt-8 flex justify-end"><Button onClick={() => setStep(1)}>Continue</Button></div>
        </section>
      )}
      {step === 1 && (
        <section className="animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">What is your experience level?</h1>
          <div className="mt-6 flex flex-wrap gap-2">{LEVELS.map((l) => <Chip key={l} v={l} cur={level} set={setLevel} />)}</div>
          <div className="mt-8 flex justify-between"><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button onClick={() => setStep(2)}>Continue</Button></div>
        </section>
      )}
      {step === 2 && (
        <section className="animate-fade-in">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a template</h1>
          <p className="mt-1 text-sm text-gray-500">{level === "Executive" || level === "Lead / Manager" ? "Executive and Classic work well for senior roles." : role.startsWith("Software") ? "Technical and Modern are popular with engineering teams." : "Modern and Minimal are safe, versatile choices."}</p>
          <div className="mt-6"><TemplateGallery doc={sample} selected={template} onSelect={setTemplate} columns={4} thumbWidth={150} /></div>
          <div className="mt-8 flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button onClick={() => finish(true)} loading={busy}>{busy ? "Creating resume…" : "Start building"}</Button></div>
        </section>
      )}
    </main>
  );
}
