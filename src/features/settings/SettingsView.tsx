"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Monitor, Moon, Sun, LogOut, Trash2, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button, Field, Input, Select, Modal, api, cn } from "@/components/ui";
import { changePasswordSchema } from "@/lib/validation";
import { TEMPLATE_META } from "@/lib/resume-utils";
import { TEMPLATE_IDS } from "@/lib/validation";

type User = { id: string; name: string; email: string; image: string | null; theme: string; defaultTemplateId: string; defaultPageSize: string; createdAt: string };
type Session = { id: string; userAgent: string | null; ipAddress: string | null; lastActiveAt: string; createdAt: string; isCurrent: boolean };
type PwValues = z.infer<typeof changePasswordSchema>;

const SECTIONS = ["Profile", "Account", "Appearance", "Preferences", "Privacy", "Danger Zone"] as const;

export function SettingsView({ user: initial, sessions: initialSessions }: { user: User; sessions: Session[] }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = React.useState(initial);
  const [name, setName] = React.useState(initial.name);
  const [sessions, setSessions] = React.useState(initialSessions);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [delPw, setDelPw] = React.useState("");
  const [delConfirm, setDelConfirm] = React.useState("");
  const pw = useForm<PwValues>({ resolver: zodResolver(changePasswordSchema) });

  const patch = async (data: Record<string, unknown>, key: string, msg = "Saved") => {
    setSaving(key);
    try {
      const { user: u } = await api<{ user: User }>("/api/account", { method: "PATCH", json: data });
      setUser((prev) => ({ ...prev, ...u }));
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return toast.error("Use a PNG/JPEG/WebP under 5 MB.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = Math.min(1, 256 / Math.max(img.width, img.height));
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      patch({ image: c.toDataURL("image/jpeg", 0.85) }, "photo", "Photo updated");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const changePassword = async (v: PwValues) => {
    try {
      const r = await api<{ revokedSessions: number }>("/api/account/password", { method: "POST", json: v });
      toast.success(`Password changed. ${r.revokedSessions} other session(s) signed out.`);
      pw.reset();
      setSessions((s) => s.filter((x) => x.isCurrent));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const revokeOthers = async () => {
    try {
      const r = await api<{ revoked: number }>("/api/account/sessions", { method: "DELETE" });
      setSessions((s) => s.filter((x) => x.isCurrent));
      toast.success(`${r.revoked} session(s) signed out`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const deleteAccount = async () => {
    setSaving("delete");
    try {
      await api("/api/account", { method: "DELETE", json: { password: delPw, confirmation: delConfirm } });
      toast.success("Account deleted");
      router.push("/");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(null);
    }
  };

  const Card = ({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-20 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="text-base font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <div className="mt-6 grid gap-8 lg:grid-cols-[180px_1fr]">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <ul className="sticky top-20 space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s}><a href={`#${s.toLowerCase().replace(" ", "-")}`} className={cn("block rounded-md px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800", s === "Danger Zone" && "text-red-600")}>{s}</a></li>
              ))}
            </ul>
          </nav>
          <div className="space-y-6">
            <Card id="profile" title="Profile" desc="How you appear across ResumeForge.">
              <div className="flex items-center gap-4">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-white dark:bg-white dark:text-gray-900">{user.name.slice(0, 1).toUpperCase()}</span>
                )}
                <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  {saving === "photo" ? "Uploading…" : "Change photo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {user.image && <Button variant="ghost" size="sm" onClick={() => patch({ image: null }, "photo", "Photo removed")}>Remove</Button>}
              </div>
              <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); patch({ name: name.trim() }, "name", "Profile updated"); }}>
                <Field label="Name" htmlFor="name" required><Input id="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={80} /></Field>
                <Field label="Email" htmlFor="email" hint="Email changes require verification and are not yet available."><Input id="email" value={user.email} disabled /></Field>
                <div className="sm:col-span-2"><Button type="submit" loading={saving === "name"} disabled={name.trim() === user.name || name.trim().length < 2}>Save changes</Button></div>
              </form>
            </Card>

            <Card id="account" title="Account" desc="Password and active sessions.">
              <form onSubmit={pw.handleSubmit(changePassword)} className="grid gap-4 sm:grid-cols-3" noValidate>
                <Field label="Current password" htmlFor="cur" error={pw.formState.errors.currentPassword?.message}><Input id="cur" type="password" autoComplete="current-password" {...pw.register("currentPassword")} /></Field>
                <Field label="New password" htmlFor="new" error={pw.formState.errors.newPassword?.message}><Input id="new" type="password" autoComplete="new-password" {...pw.register("newPassword")} /></Field>
                <Field label="Confirm new password" htmlFor="conf" error={pw.formState.errors.confirmPassword?.message}><Input id="conf" type="password" autoComplete="new-password" {...pw.register("confirmPassword")} /></Field>
                <div className="sm:col-span-3"><Button type="submit" variant="outline" loading={pw.formState.isSubmitting}>Change password</Button></div>
              </form>
              <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Sessions</h3>
                  {sessions.length > 1 && <Button variant="ghost" size="sm" onClick={revokeOthers}>Sign out other sessions</Button>}
                </div>
                <ul className="mt-3 divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="truncate">{(s.userAgent ?? "Unknown device").slice(0, 80)}</div>
                        <div className="text-xs text-gray-500">{s.ipAddress ?? "—"} · active {new Date(s.lastActiveAt).toLocaleString()}</div>
                      </div>
                      {s.isCurrent && <span className="ml-3 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">This device</span>}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-4" onClick={logout}><LogOut className="h-4 w-4" /> Log out</Button>
              </div>
            </Card>

            <Card id="appearance" title="Appearance">
              <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 sm:max-w-md">
                {([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "System", Monitor]] as const).map(([v, l, Icon]) => (
                  <button key={v} role="radio" aria-checked={theme === v} onClick={() => { setTheme(v); patch({ theme: v }, "theme", "Theme updated"); }} className={cn("flex flex-col items-center gap-2 rounded-lg border p-4 text-sm", theme === v ? "border-gray-900 dark:border-white" : "border-gray-200 hover:border-gray-400 dark:border-gray-700")}>
                    <Icon className="h-5 w-5" /> {l}
                  </button>
                ))}
              </div>
            </Card>

            <Card id="preferences" title="Preferences" desc="Defaults applied to new resumes.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Default template" htmlFor="tpl">
                  <Select id="tpl" value={user.defaultTemplateId} onChange={(e) => patch({ defaultTemplateId: e.target.value }, "tpl", "Default template saved")}>
                    {TEMPLATE_IDS.map((t) => <option key={t} value={t}>{TEMPLATE_META[t].name}</option>)}
                  </Select>
                </Field>
                <Field label="Default page size" htmlFor="ps">
                  <Select id="ps" value={user.defaultPageSize} onChange={(e) => patch({ defaultPageSize: e.target.value }, "ps", "Default page size saved")}>
                    <option value="A4">A4</option>
                    <option value="Letter">US Letter</option>
                  </Select>
                </Field>
              </div>
            </Card>

            <Card id="privacy" title="Privacy" desc="How your data is handled.">
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Your resumes are private. There are no public resume URLs; only you can access them after signing in.</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Passwords are hashed with bcrypt. Sessions are stored server-side and can be revoked at any time.</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> When you use the AI assistant, only the text you select is sent to the configured AI provider — never your full account.</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Uploaded files for import are processed in memory and not stored.</li>
                <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> Deleting your account permanently removes all resumes, sessions and usage records.</li>
              </ul>
              <p className="mt-4 text-xs text-gray-500">Member since {new Date(user.createdAt).toLocaleDateString()}. Export any resume as JSON from the editor menu at any time.</p>
            </Card>

            <section id="danger-zone" className="scroll-mt-20 rounded-lg border border-red-200 bg-white p-6 dark:border-red-900/50 dark:bg-gray-900">
              <h2 className="text-base font-semibold text-red-600">Danger Zone</h2>
              <p className="mt-1 text-sm text-gray-500">Permanently delete your account and all resumes. This cannot be undone.</p>
              <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete account</Button>
            </section>
          </div>
        </div>
      </main>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete your account?" description="All resumes, sessions and data will be permanently erased." size="sm">
        <div className="space-y-3">
          <Field label="Your password" htmlFor="dpw"><Input id="dpw" type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" /></Field>
          <Field label='Type "DELETE" to confirm' htmlFor="dconf"><Input id="dconf" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="danger" disabled={delConfirm !== "DELETE" || !delPw} loading={saving === "delete"} onClick={deleteAccount}>{saving === "delete" ? "Deleting…" : "Delete my account"}</Button>
        </div>
      </Modal>
    </div>
  );
}
