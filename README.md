# ResumeForge

**Build a resume that gets noticed.**

ResumeForge is a full-stack resume/CV builder: a structured editor with autosave, eight distinct professional templates, a page-accurate live preview, real PDF/print/JSON export, PDF/DOCX/JSON import with review, server-side AI writing assistance, ATS and completeness analysis, account settings, and a billing-ready data model — all backed by PostgreSQL.

---

## Features

| Area | What works |
| --- | --- |
| Auth | Register, login, logout, DB-backed revocable sessions (httpOnly cookie, hashed token), password change (revokes other sessions), account deletion (password + `DELETE` confirmation), rate limiting, same-origin check on mutations |
| Resumes | Create (scratch / template / import / demo), rename, duplicate (transactional deep copy with fresh ids), delete (cascade), search, filter, sort |
| Editor | Personal info (with photo upload validated by magic bytes and resized client-side), summary with character count and undo/redo, experience, education, skills (quick add), projects, certifications, languages, awards, volunteer, custom sections; drag-and-drop **and** keyboard/arrow reordering of entries and of sections; design panel (accent color, font, size, spacing, page size, photo toggle) |
| Autosave | Debounced (1.1 s) partial PATCH of only changed keys → transaction → PostgreSQL. Status: Saving / Saved / Unsaved / Error + Retry / Offline. Exponential-backoff retry, `online` event resync, `beforeunload` guard, localStorage backup restored on reload |
| Templates | Modern, Minimal, Executive, Classic, Creative (sidebar), Technical (right sidebar, monospace), Elegant, ATS Focused — one data-driven renderer, distinct layouts |
| Preview | A4 / US Letter sheets with real page breaks computed from measured blocks (no entry or heading is split), zoom in/out/fit, page navigation, print stylesheet |
| Export | Multi-page PDF (`FirstName_LastName_Resume.pdf`) generated from the same rendered sheets as the preview; browser print; versioned JSON |
| Import | PDF (unpdf), DOCX (mammoth), JSON (Zod-validated). Heuristic section parser → review dialog → explicit confirm. Never overwrites without confirmation |
| AI | Improve / Shorten / Expand / Professional / ATS / Generate bullets via server route → provider abstraction (OpenAI-compatible or Anthropic). Side-by-side suggestion with Use / Try again / Cancel. Strict no-fabrication system prompt. Clear 503 if not configured |
| Analysis | Completeness score with actionable suggestions; ATS score with severity-ranked issues and explanations |
| Settings | Profile (name, photo), account (password, sessions, logout), appearance (light/dark/system), preferences (default template / page size), privacy explanation, danger zone |
| Security | Server-side ownership on every query (`WHERE id = ? AND user_id = ?` → 404, never leaks existence), Zod validation on every endpoint, bcrypt (cost 12), secure cookies, upload size/type/magic-byte checks, no secrets in client bundle, safe error messages |

## Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/login|register|forgot-password
│   ├── dashboard/  resume/[id]/  resume/[id]/preview/  settings/  templates/  onboarding/
│   ├── api/
│   │   ├── auth/{register,login,logout}
│   │   ├── resumes/            GET list · POST create
│   │   ├── resumes/[id]        GET · PATCH (partial document) · DELETE
│   │   ├── resumes/[id]/{duplicate,export,ai}
│   │   ├── resumes/import      multipart → parsed document (no write)
│   │   ├── account/{,password,sessions}
│   │   └── ai/status · health
│   ├── layout.tsx · page.tsx (landing) · error.tsx · not-found.tsx · sitemap.ts
├── components/               # ui primitives (Button, Modal, Dropdown…), AppHeader
├── features/
│   ├── editor/               # Zustand store (autosave/undo), EditorShell, SectionForms, PreviewView
│   ├── templates/            # ResumeDocument (8 templates), PagedResume (pagination), galleries
│   ├── export/               # PDF generation (html2canvas-pro + jsPDF), PdfExporter
│   ├── ai/                   # AiAssist UI
│   ├── resumes/              # ImportDialog
│   ├── dashboard/ auth/ settings/
├── server/                   # server-only: auth (sessions, hashing), resumes repository, ai provider, import parser
├── lib/                      # validation (Zod), resume-utils (completeness, ATS, helpers), api helpers, demo data
├── db/                       # schema.ts, index.ts, migrations/, scripts/seed.ts
└── proxy.ts                  # route protection (Next 16 proxy/middleware)
tests/  unit · integration · e2e
```

### Data model (PostgreSQL via Drizzle)

`users`, `sessions`, `resumes`, `resume_profiles`, `experiences`, `education`, `skills`, `projects`, `certifications`, `languages`, `awards`, `volunteer_experience`, `custom_sections`, `resume_settings` (incl. `section_order` jsonb), `subscriptions`, `usage`.

All child tables reference `resumes.id ON DELETE CASCADE`; `resumes.user_id → users.id ON DELETE CASCADE`. Indexed on `(resume_id, sort_order)` and `(user_id, updated_at)`. Unique on `users.email`, `sessions.token_hash`, one profile/settings row per resume.

### Persistence model

The editor holds a typed `ResumeDocument`. Autosave sends only dirty top-level keys; the server validates with Zod and, in one transaction, updates the resume row and **replaces** the affected child tables preserving client-generated UUIDs and array order as `sort_order`. This keeps ordering, ids and referential integrity consistent without per-row endpoints.

### Authentication

Custom, dependency-light session auth: 32-byte random token in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie; only the SHA-256 hash is stored in `sessions` with expiry, user agent and IP. `getCurrentUser()` joins session→user and is React-`cache`d per request. `proxy.ts` redirects unauthenticated navigation; every API route calls `requireUser()` and every query filters by `user_id`.

### PDF generation

The preview paginates the document by measuring `[data-block]` elements and choosing cut positions that never split a block. Each resulting sheet (exact A4/Letter pixel size) is rasterised at 2× with `html2canvas-pro` and placed on a correctly sized page with `jsPDF`. Preview, print and PDF therefore come from **one** render path. For vector text output, the Print button uses a dedicated print stylesheet (`@page` size matches the document).

### AI

`src/server/ai.ts` exposes `runAiAction(action, text, context)` behind an `AiProvider` interface. Providers: OpenAI-compatible (`AI_BASE_URL`, works with OpenAI, Groq, Together, Azure, local LLMs) and Anthropic. The API key never leaves the server. The system prompt forbids inventing employers, dates, metrics, etc. Usage is recorded in `usage`. Rate limited per user.

## Tech stack

Next.js 16 (App Router, React 19, TypeScript), Tailwind CSS 4, PostgreSQL, Drizzle ORM, Zod, React Hook Form, Zustand, dnd-kit, Lucide, sonner, next-themes, bcryptjs, jsPDF + html2canvas-pro, unpdf, mammoth, Vitest, Playwright.

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### Install & run

```bash
npm install
cp .env.example .env          # set DATABASE_URL (and AI_API_KEY if you want the assistant)

npm run db:generate           # generate SQL migrations from src/db/schema.ts (already committed)
npm run db:migrate            # apply migrations            (or: npm run db:push for dev)
npm run db:seed               # demo user + Demo Resume

npm run dev                   # http://localhost:3000
```

Demo credentials after seeding: `demo@resumeforge.dev` / `DemoPassword123!`

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | recommended | Canonical URL for metadata / sitemap |
| `AI_API_KEY` | for AI | Provider key (server only). `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` also detected |
| `AI_PROVIDER` | no | `openai` (default, OpenAI-compatible) or `anthropic` |
| `AI_MODEL` | no | Model id (defaults: `gpt-4o-mini` / `claude-3-5-haiku-latest`) |
| `AI_BASE_URL` | no | OpenAI-compatible base URL |
| `COOKIE_SECURE` | no | Set `false` only to run the production build over plain HTTP |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Reserved; billing not wired |

### Scripts

```bash
npm run dev / build / start
npm run lint · npm run typecheck · npm run typegen
npm run db:generate · db:migrate · db:push · db:seed
npm test                  # unit + integration (needs DATABASE_URL)
npm run test:e2e          # Playwright (needs a running app or lets Playwright start `npm start`)
```

## Testing

- **Unit** (`tests/unit`): Zod schemas, completeness & ATS scoring, ordering helpers, filename safety, pagination break computation, import text parser.
- **Integration** (`tests/integration`): real DB — create/update/reorder/delete with cascade, transactional duplication independence, and cross-user ownership denial for read/update/duplicate/delete.
- **E2E** (`tests/e2e`): register → create → fill profile → add experience → switch template → reload persistence → preview → PDF download with correct filename; user A cannot access user B's resume (page 404 + API 404); unauthenticated redirect and 401.

## Production deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. `npm ci && npm run db:migrate && npm run build && npm start` (any Node host, Docker, Vercel with a managed Postgres, etc.).
3. Serve over HTTPS (cookies are `Secure` in production).
4. Optional: set `AI_API_KEY` (+ `AI_PROVIDER`/`AI_MODEL`) to enable the assistant.
5. Multi-instance deployments should replace the in-memory rate limiter (`src/lib/api.ts`) with a shared store (Redis/Upstash).

## Security notes

- Ownership is enforced in the repository layer for every resume-scoped operation; unknown or foreign ids return 404 uniformly.
- Inputs are validated with Zod; request bodies are size-limited; uploads are limited to 8 MB and type-checked by content signature, processed in memory only.
- Passwords: bcrypt cost 12. Login uses a constant-cost compare even for unknown emails. Auth, AI, import and password endpoints are rate limited.
- Mutating requests from browsers must match the host origin (CSRF defence in addition to `SameSite=Lax`).
- Private routes send `X-Robots-Tag: noindex`; `robots.txt` disallows them. There are no public resume URLs.

## Known limitations

- PDF export is rasterised (image-per-page) for exact fidelity with the preview; use **Print → Save as PDF** for selectable vector text.
- Password reset by email requires an outbound email provider (not configured; the page says so explicitly).
- Import parsing of PDF/DOCX is heuristic — the review step exists precisely so users verify before saving.
- Billing is schema/abstraction-ready (`subscriptions`, `usage`) but no payment provider is connected and nothing is gated.
- Rate limiting is per-process memory.
