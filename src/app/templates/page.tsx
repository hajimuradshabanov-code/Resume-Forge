import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { PublicTemplates } from "@/features/templates/PublicTemplates";
import { Logo } from "@/components/AppHeader";

export const metadata: Metadata = { title: "Resume templates", description: "Eight professional resume templates — Modern, Minimal, Executive, Classic, Creative, Technical, Elegant and ATS Focused." };

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <Link href="/dashboard" className="rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-gray-900">Dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">Sign in</Link>
                <Link href="/register" className="rounded-md bg-gray-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-gray-900">Get started</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">Every template renders the same structured data, so you can switch at any time without losing anything. Accent color, fonts, spacing and page size are all adjustable.</p>
        <div className="mt-8"><PublicTemplates signedIn={!!user} /></div>
      </main>
    </div>
  );
}
