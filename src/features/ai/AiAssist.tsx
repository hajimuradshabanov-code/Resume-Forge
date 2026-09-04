"use client";

import * as React from "react";
import { Sparkles, Wand2, Minimize2, Maximize2, Briefcase, ScanSearch, List } from "lucide-react";
import { toast } from "sonner";
import { Button, Dropdown, MenuItem, Modal, api, cn } from "@/components/ui";
import type { AiAction } from "@/lib/validation";

const ACTIONS: { key: AiAction; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "improve", label: "Improve", icon: Wand2 },
  { key: "shorten", label: "Shorten", icon: Minimize2 },
  { key: "expand", label: "Expand", icon: Maximize2 },
  { key: "professional", label: "More professional", icon: Briefcase },
  { key: "ats", label: "ATS-friendly", icon: ScanSearch },
  { key: "bullets", label: "Generate bullets", icon: List },
];

type Ctx = { field?: string; headline?: string; position?: string; company?: string };

export function AiAssist({ resumeId, text, context, onAccept, actions, size = "sm" }: { resumeId: string; text: string; context?: Ctx; onAccept: (t: string) => void; actions?: AiAction[]; size?: "sm" | "md" }) {
  const [open, setOpen] = React.useState(false);
  const [action, setAction] = React.useState<AiAction>("improve");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const list = actions ? ACTIONS.filter((a) => actions.includes(a.key)) : ACTIONS;

  const run = React.useCallback(
    async (a: AiAction) => {
      if (text.trim().length < 3) {
        toast.info("Write a few words first so the assistant has something to work with.");
        return;
      }
      setAction(a);
      setOpen(true);
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const { result } = await api<{ result: string }>(`/api/resumes/${resumeId}/ai`, { method: "POST", json: { action: a, text, context } });
        setResult(result);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [resumeId, text, context],
  );

  const label = ACTIONS.find((a) => a.key === action)?.label ?? "AI";

  return (
    <>
      <Dropdown
        align="right"
        trigger={
          <Button type="button" variant="outline" size={size} className={cn("gap-1.5", size === "sm" && "h-7 px-2 text-xs")}>
            <Sparkles className="h-3.5 w-3.5 text-violet-600" /> AI
          </Button>
        }
      >
        {list.map((a) => (
          <MenuItem key={a.key} icon={a.icon} onClick={() => run(a.key)}>
            {a.label}
          </MenuItem>
        ))}
      </Dropdown>

      <Modal open={open} onClose={() => setOpen(false)} title={`AI · ${label}`} description="The assistant improves wording only. It never invents employers, dates, metrics or achievements." size="lg">
        {loading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-gray-600" role="status">
            <Sparkles className="h-5 w-5 animate-pulse text-violet-600" /> Analyzing…
          </div>
        ) : error ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-medium">AI request failed</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Original</div>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">{text}</div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-violet-600">Suggestion</div>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-violet-200 bg-violet-50/50 p-3 text-sm dark:border-violet-900/50 dark:bg-violet-900/10">{result}</div>
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => run(action)} disabled={loading}>
            Try again
          </Button>
          <Button
            onClick={() => {
              if (result) {
                onAccept(result);
                toast.success("Suggestion applied");
              }
              setOpen(false);
            }}
            disabled={!result || loading}
          >
            Use this
          </Button>
        </div>
      </Modal>
    </>
  );
}
