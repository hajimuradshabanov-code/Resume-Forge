import Link from "next/link";
import { ArrowRight, Sparkles, LayoutTemplate, Eye, FileDown, PenLine, ScanSearch, Check, Lock, Database, KeyRound } from "lucide-react";
import { Logo } from "@/components/AppHeader";
import { getCurrentUser } from "@/server/auth";
import { LandingTemplates } from "@/features/templates/LandingTemplates";

const FEATURES = [
  { icon: Sparkles, title: "AI writing that respects the truth", desc: "Improve, shorten, expand or make text ATS-friendly. The assistant rewrites wording — it never invents employers, dates or metrics." },
  { icon: LayoutTemplate, title: "Eight professional templates", desc: "Modern, Minimal, Executive, Classic, Creative, Technical, Elegant and ATS Focused — each a distinct layout, all driven by the same data." },
  { icon: Eye, title: "Live A4 / Letter preview", desc: "See exactly what recruiters will see, including real page breaks, as you type." },
  { icon: FileDown, title: "PDF, print and JSON export", desc: "Download a correctly paginated PDF named after you, print directly, or export versioned JSON you own." },
  { icon: PenLine, title: "Structured editor with autosave", desc: "Drag to reorder entries and sections. Every change is debounced and persisted to the database — with retry and offline recovery." },
  { icon: ScanSearch, title: "ATS and completeness checks", desc: "Transparent, heuristic scoring with concrete suggestions. No black-box guarantees." },
];

const FAQ = [
  { q: "Is my resume public?", a: "No. Resumes are private by default and there are no public URLs. Only you can access your resumes after signing in." },
  { q: "Does the AI make things up?", a: "It is instructed never to invent facts — employers, titles, dates, metrics or achievements. It improves wording and structure of what you wrote. If the AI provider isn't configured, the assistant tells you so instead of pretending." },
  { q: "Can I import my existing resume?", a: "Yes. Upload a PDF, DOCX or a ResumeForge JSON export. We extract the text, detect common sections and let you review everything before anything is saved." },
  { q: "Which file formats can I export?", a: "PDF (multi-page, A4 or US Letter), browser print, and versioned JSON that you can re-import later." },
  { q: "What happens if I lose connection while editing?", a: "Changes are kept locally, the editor shows an offline indicator, and everything syncs automatically when you reconnect. The editor never claims something is saved when it isn't." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const cta = user ? "/dashboard" : "/register";
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-gray-600 dark:text-gray-300 md:flex" aria-label="Main">
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white">Features</a>
            <Link href="/templates" className="hover:text-gray-900 dark:hover:text-white">Templates</Link>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <Link href="/dashboard" className="rounded-md bg-gray-900 px-3.5 py-2 font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">Sign in</Link>
                <Link href="/register" className="rounded-md bg-gray-900 px-3.5 py-2 font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">ResumeForge</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">Build a resume that gets noticed.</h1>
          <p className="mt-5 text-lg text-gray-600 dark:text-gray-300">A structured editor, eight professional templates, a live page-accurate preview and honest AI help — everything saved to your account as you type.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={cta} className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Create my resume <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/templates" className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-5 py-3 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900">Explore templates</Link>
          </div>
        </div>
        <div className="mt-14 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
          <LandingTemplates variant="hero" />
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Lock, t: "Private by default", d: "No public resume links. Server-side ownership checks on every request." },
            { icon: Database, t: "Your data, exportable", d: "Versioned JSON export and import. Nothing is locked in." },
            { icon: KeyRound, t: "Secure accounts", d: "bcrypt password hashing, revocable server-side sessions, rate-limited auth." },
          ].map((i) => (
            <div key={i.t} className="flex gap-3">
              <i.icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-700 dark:text-gray-200" />
              <div>
                <div className="text-sm font-semibold">{i.t}</div>
                <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{i.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Everything you need. Nothing fake.</h2>
        <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-300">Every button does what it says, and every change lands in the database.</p>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <f.icon className="h-5 w-5 text-gray-900 dark:text-white" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-4">
            {["Enter your information", "Choose a template", "Improve your content", "Export your resume"].map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">{i + 1}</span>
                <div className="pt-1 font-medium">{s}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Templates */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Templates with real identity</h2>
            <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-300">Not eight recolors — different layouts, typography and section styling. Switch anytime; your content stays.</p>
          </div>
          <Link href="/templates" className="hidden shrink-0 text-sm font-medium hover:underline sm:inline-flex sm:items-center sm:gap-1">All templates <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10"><LandingTemplates variant="grid" /></div>
      </section>

      {/* AI */}
      <section className="border-y border-gray-200 bg-gray-900 text-white dark:border-gray-800">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">AI assistant</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Better wording. Your facts.</h2>
            <p className="mt-4 text-gray-300">Select any summary or description and ask the assistant to improve, shorten, expand, sound more professional, optimize for ATS, or turn rough notes into bullet points. You review every suggestion side-by-side and decide whether to use it.</p>
            <ul className="mt-6 space-y-2 text-sm text-gray-300">
              {["Runs entirely server-side — your API key never reaches the browser", "Provider-agnostic: OpenAI-compatible or Anthropic", "Hard rule: never fabricate employers, degrees, dates or metrics"].map((l) => (
                <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-400" /> {l}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 text-sm">
            <div className="text-xs uppercase tracking-wide text-gray-400">Original</div>
            <p className="mt-1 text-gray-300">responsible for backend apis and helped the team with deployments</p>
            <div className="mt-4 text-xs uppercase tracking-wide text-violet-300">Suggestion · Improve</div>
            <p className="mt-1">Built and maintained backend APIs and supported the team&apos;s deployment process.</p>
            <p className="mt-3 text-xs text-gray-500">Note: no numbers or technologies were added because none were provided.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Pricing</h2>
        <p className="mt-2 max-w-xl text-gray-600 dark:text-gray-300">Everything is included while ResumeForge is in its launch period. The architecture is billing-ready; paid plans will be announced before anything changes.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
          <div className="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <div className="text-sm font-semibold">Free</div>
            <div className="mt-2 text-3xl font-semibold">$0</div>
            <ul className="mt-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {["Unlimited resumes", "All 8 templates", "PDF, print & JSON export", "Import from PDF / DOCX", "ATS & completeness checks", "AI assistant (when configured)"].map((l) => <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-emerald-600" /> {l}</li>)}
            </ul>
            <Link href={cta} className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900">Get started</Link>
          </div>
          <div className="rounded-xl border border-dashed border-gray-300 p-6 dark:border-gray-700">
            <div className="text-sm font-semibold">Pro <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">Coming later</span></div>
            <div className="mt-2 text-3xl font-semibold text-gray-400">—</div>
            <ul className="mt-5 space-y-2 text-sm text-gray-500">
              {["Advanced AI usage", "Premium export options", "Priority support"].map((l) => <li key={l} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-gray-400" /> {l}</li>)}
            </ul>
            <p className="mt-6 text-xs text-gray-500">No payments are collected today.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-gray-200 dark:divide-gray-800">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{f.q}<span className="text-gray-400 transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">Your next role starts with a better resume.</h2>
        <Link href={cta} className="mt-8 inline-flex items-center gap-2 rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Create my resume <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-500 sm:flex-row sm:px-6">
          <Logo className="text-gray-900 dark:text-white" />
          <nav className="flex gap-6" aria-label="Footer">
            <Link href="/templates" className="hover:underline">Templates</Link>
            <a href="#pricing" className="hover:underline">Pricing</a>
            <a href="#faq" className="hover:underline">FAQ</a>
            <Link href="/login" className="hover:underline">Sign in</Link>
          </nav>
          <p>© {new Date().getFullYear()} ResumeForge</p>
        </div>
      </footer>
    </div>
  );
}
