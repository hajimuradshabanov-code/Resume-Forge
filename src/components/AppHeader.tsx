"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, LayoutDashboard, Search, Bell } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, MenuItem, api } from "@/components/ui";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold tracking-tight ${className}`} aria-label="ResumeForge home">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900">
        <svg viewBox="0 0 32 32" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M9 8h10.5a4.5 4.5 0 0 1 0 9H13v7H9V8zm4 3v3h6a1.5 1.5 0 0 0 0-3h-6zm6.2 6.5L24 24h-4.4l-4-6.5h3.6z" /></svg>
      </span>
      ResumeForge
    </Link>
  );
}

export function AppHeader({ user, search, onSearch, notifications }: { user: { name: string; email: string; image: string | null }; search?: string; onSearch?: (v: string) => void; notifications?: string[] }) {
  const router = useRouter();
  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          <Link href="/dashboard" className="rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">Dashboard</Link>
          <Link href="/templates" className="rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">Templates</Link>
          <Link href="/settings" className="rounded-md px-3 py-1.5 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">Settings</Link>
        </nav>
        <div className="flex-1" />
        {onSearch && (
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search resumes…" aria-label="Search resumes" className="h-9 w-56 rounded-md border border-gray-300 bg-white pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900" />
          </label>
        )}
        <Dropdown
          trigger={
            <button className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {notifications && notifications.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />}
            </button>
          }
        >
          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">Notifications</div>
          {notifications && notifications.length ? notifications.map((n, i) => <div key={i} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200">{n}</div>) : <div className="px-3 py-2 text-sm text-gray-500">You&apos;re all caught up.</div>}
        </Dropdown>
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Account menu">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">{initials || "U"}</span>
              )}
            </button>
          }
        >
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <div className="truncate text-sm font-medium">{user.name}</div>
            <div className="truncate text-xs text-gray-500">{user.email}</div>
          </div>
          <MenuItem icon={LayoutDashboard} onClick={() => router.push("/dashboard")}>Dashboard</MenuItem>
          <MenuItem icon={Settings} onClick={() => router.push("/settings")}>Settings</MenuItem>
          <MenuItem icon={LogOut} onClick={logout}>Log out</MenuItem>
        </Dropdown>
      </div>
    </header>
  );
}
