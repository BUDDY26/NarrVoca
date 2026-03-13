# NarrVoca — Claude Code Instructions

## Project Overview

NarrVoca is a hybrid Next.js 14 application implementing narrative-driven language learning.

Core system features:

• Narrative Reader — branching story engine with score-based progression  
• AI grading of responses using OpenAI  
• Spaced-repetition vocabulary mastery system  
• Retrieval-augmented tutor chat using pgvector embeddings  

Architecture highlights:

• **Hybrid routing**
  - `app/` → App Router (UI pages)
  - `src/pages/api/` → Pages Router (all API routes)

• **Supabase**
  - authentication
  - relational database
  - pgvector embeddings

• **AI services**
  - OpenAI → grading + embeddings
  - Gemini → tutor chat
  - Fireworks → image generation

Testing baseline:

25 suites · 340 tests · all must pass before commits.


## Project Identity

**NarrVoca** — narrative-driven vocabulary acquisition (Spanish / Mandarin).
Built on Next.js 14, Supabase, OpenAI. Deployed at narrvoca.com via Vercel.
Course: CSCI 6333 — Database Systems, UTRGV. Developer: Ruben Aleman (@BUDDY26).

NarrVoca 1.0 (Phases 1–6) is complete. NarrVoca 2.0 (RAG layer, V2.1–V2.5) is complete.
**Do not touch story-generator pages or routes** — that is the original Vocora feature, preserved as-is.

---

## Test Command

```bash
npm test
```

25 suites · 340 tests · all must pass before any task is considered done.
Run after every change. Do not commit with failing tests.

---

## Package Manager

**npm only.** `package-lock.json` is the lock file. Do not use bun, pnpm, or yarn.

---

## Architecture — Router Split

This project uses **two routers simultaneously**:

| Router | Location | Purpose |
|---|---|---|
| App Router | `app/` | All pages (RSC + client hooks) |
| Pages Router | `src/pages/api/` | All API routes — never move these |

Never create API routes under `app/api/`. All backend handlers live in `src/pages/api/narrvoca/`.

---

## Key Files

| File | Role |
|---|---|
| `lib/supabase.ts` | Supabase client — do not restructure |
| `lib/narrvoca/types.ts` | All TypeScript interfaces (1.0 + 2.0) |
| `lib/narrvoca/queries.ts` | DB query helpers — typed Supabase fetches, no business logic |
| `lib/narrvoca/branching.ts` | Branch rule resolver |
| `lib/narrvoca/rag.ts` | RAG retrieval — dependency-injection pattern |
| `lib/narrvoca/embed.ts` | Auto-embed on content creation |
| `lib/narrvoca/query-cache.ts` | 5-min TTL in-memory cache singleton |
| `hooks/narrvoca/useNarrativeReader.ts` | Main reader state machine — central to 1.0 |
| `hooks/narrvoca/useTutorChat.ts` | Tutor chat state — V2.3 |
| `app/(auth)/dashboard/narrative/page.tsx` | NarrVoca reader page — primary UI |
| `supabase/migrations/` | DDL only — irreversible, apply manually in Supabase dashboard |

---

## Protected Areas — Ask Before Touching

| Area | Why |
|---|---|
| `app/(auth)/actions/auth.ts` | Server actions — auth flow |
| `app/auth/callback/page.tsx` | OAuth implicit-flow token handling |
| `src/pages/api/narrvoca/` | All routes auth-guarded via Bearer token |
| `lib/supabase.ts` | Auth + DB client |
| `supabase/migrations/` | Applied DDL cannot be rolled back safely without rollback scripts |
| `scripts/generate-embeddings.ts` | Writes to production DB (embeddings) |
| `scripts/seed-rubrics.ts` | Writes to production DB (rubrics) |
| `components/ui/` | shadcn/ui — auto-generated primitives, never hand-edit |
| `.env.local` | Real secrets — never read aloud, never commit |

---

## Environment Variables

Template: `.env.local.example` — copy to `.env.local` for local dev.
Vercel dashboard holds production values. Never commit `.env` or `.env.local`.

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` — grading, embeddings, TTS
- `GEMINI_API_KEY` — writing practice, chatbox
- `FIREWORKS_API_KEY` — image generation
- `SUPABASE_SERVICE_ROLE_KEY` — embedding script only (bypasses RLS)
- `NEXT_PUBLIC_NEXTAUTH_URL` — OAuth redirect base

---

## Auth Pattern — All NarrVoca API Routes

Every route in `src/pages/api/narrvoca/` follows this guard:

```typescript
const authHeader = req.headers.authorization;
const token = authHeader?.split(' ')[1];
const { data: { user } } = await supabase.auth.getUser(token);
if (!user) return res.status(401).json({ error: 'Unauthorized' });
```

The hook sends `Authorization: Bearer <accessToken>` on every fetch.
`accessToken` comes from `supabase.auth.getSession()` on mount.

---

## Database Migrations

Migrations live in `supabase/migrations/` and are applied manually via the Supabase SQL editor.
Each migration has a matching `_rollback.sql`.

| Migration | Status |
|---|---|
| `001_narrvoca_extension.sql` | Applied |
| `002_seed_sample_story.sql` | Applied |
| `003_rag_layer4.sql` | Applied |
| `004_match_embeddings_fn.sql` | **NOT YET APPLIED** |
| `005_profiles.sql` | Status unknown — verify before assuming applied |

Never auto-run migrations. Always confirm with user before applying SQL to Supabase.

---

## Jest Configuration

- Config: `jest.config.js` (CommonJS `require`) — do not convert to `.ts`
- Test root: `test/unit/` only
- Alias: `@/` → project root (via `moduleNameMapper`)
- `.tsx` test files need `@jest-environment jsdom` docblock
- `jest.mock` factory: never reference outer `const` directly — wrap in lambda
- Supabase mock pattern: chain mock with `.then` on each method; call `mockFrom.mockReset()` in `beforeEach`

---

## Coding Conventions

- TypeScript strict — no `any` without justification
- All new lib functions use **dependency injection** (supabase, openai passed as params) — no module-level singletons in library code
- API routes: Pages Router pattern, not App Router route handlers
- Branching pass threshold: `0.7` (do not change)
- SRS intervals: <0.3→1d, <0.6→3d, <0.8→7d, ≥0.8→14d (do not change)
- Embedding model: `text-embedding-3-small` (1536 dims) — do not change
- Grading model: `gpt-4o-mini`
- `next.config.mjs` suppresses TS + ESLint build errors intentionally — do not tighten

---

## What Not To Do

- Do not refactor application code unless explicitly asked
- Do not add features beyond what is requested
- Do not rename files or move directories without explicit instruction
- Do not modify `components/ui/` files
- Do not touch `app/(auth)/story-generator/` or its associated hooks/components
- Do not run migration scripts or DB-writing scripts without explicit user approval
- Do not push to remote or create PRs without explicit user instruction
- Do not add docstrings or comments to code you did not change
