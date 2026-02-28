# NarrVoca — Progress Log

**Course:** CSCI 6333 — Database Systems
**Team:** Ruben Aleman, Silvia Osuna, Andrea Garza
**AI Assistant:** Claude Code (claude-sonnet-4-6)
**Log Started:** 2026-02-27

---

## Session 1 — 2026-02-27

### What Was Accomplished

**Codebase Audit (complete)**
- Read all files in `/docs`: DB design PDF, prompt log PDF, ER diagram, schema diagram
- Read and understood full codebase: all routes, hooks, API routes, lib, lang, components
- Documented tech stack, project structure, and all 16 tables in this log

**Phase 1 — SQL Migration (COMPLETE ✓)**

| File | Status |
|---|---|
| `supabase/migrations/001_narrvoca_extension.sql` | Written, approved, applied to Supabase |
| `supabase/migrations/001_narrvoca_extension_rollback.sql` | Written |
| `supabase/migrations/002_seed_sample_story.sql` | Written, approved, applied to Supabase |
| `supabase/migrations/002_seed_sample_story_rollback.sql` | Written |
| `supabase/migrations/002_seed_verify.sql` | Written, run — all counts verified |

**Migration details:**
- All 11 new NarrVoca tables created with `IF NOT EXISTS`, all FKs use `ON DELETE RESTRICT`
- 6 performance indexes added (story_nodes, node_text, branching_logic, progress, mastery, interaction_log)
- Seed story: "En el Mercado" (Spanish, beginner, daily life)
  - 4 nodes (Node 3 is checkpoint), 18 node_text rows (en + es)
  - 8 vocabulary words, 2 grammar points
  - 4 branching rules: Node1→2 (default), Node2→3 (default), Node3→4 (pass ≥0.7), Node3→2 (fail)
  - 10 node_vocabulary rows, 2 node_grammar rows
- Verified in Supabase Table Editor with `002_seed_verify.sql`

**Phase 2 — COMPLETE ✓**
- All files written, all 39 tests passing

---

## Session 2 — 2026-02-28

### What Was Accomplished

**Phase 2 — Backend API Layer (COMPLETE ✓)**

| File | Status |
|---|---|
| `jest.config.js` | Created — `next/jest` + `moduleNameMapper` for `@/` alias |
| `lib/narrvoca/types.ts` | Created — interfaces for all 11 tables + `FullStory` |
| `lib/narrvoca/branching.ts` | Created — `applyBranchingRules` (pure fn) + `resolveBranch` (DB) |
| `lib/narrvoca/queries.ts` | Created — 6 query helpers with Supabase client |
| `src/pages/api/narrvoca/log-interaction.ts` | Created — POST, 201/400/405/500 |
| `src/pages/api/narrvoca/update-progress.ts` | Created — POST upsert with `onConflict` |
| `src/pages/api/narrvoca/update-mastery.ts` | Created — POST upsert + SRS interval logic |
| `test/unit/narrvoca/branching.test.ts` | Created — 12 tests, all passing |
| `test/unit/narrvoca/queries.test.ts` | Created — 13 tests, all passing |
| `test/unit/narrvoca/api/log-interaction.test.ts` | Created — 5 tests, all passing |
| `test/unit/narrvoca/api/update-progress.test.ts` | Created — 5 tests, all passing |
| `test/unit/narrvoca/api/update-mastery.test.ts` | Created — 9 tests, all passing |

**Test results:** 5 suites, **39/39 tests passing**

**Notes / gotchas:**
- `jest.config.js` (not `.ts`) — avoids needing `ts-node`; use CommonJS `require('next/jest')`
- Must add explicit `moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' }` — `next/jest` alone did not resolve the alias in this project
- `branching.test.ts` must `jest.mock('@/lib/supabase')` even though it only tests the pure fn — the module import chain triggers `lib/supabase.ts` which fails without env vars
- Branch: `feature/narrvoca-expansion`

---

## Session 3 — 2026-02-28

### What Was Accomplished

**Phase 3 — Frontend UI (COMPLETE ✓)**

| File | Status |
|---|---|
| `app/(auth)/dashboard/narrative/page.tsx` | Created — full narrative reader page |
| `hooks/narrvoca/useNarrativeReader.ts` | Created — hook driving all reader state |
| `test/unit/narrvoca/useNarrativeReader.test.tsx` | Created — 18 tests, all passing |
| `jest.config.js` | Updated — added `*.test.tsx` to testMatch |
| `@testing-library/react`, `jest-environment-jsdom` | Installed for React hook testing |

**Page views implemented:**
- **Story list** — cards with difficulty badge, language badge, framer-motion hover animation
- **Node reader** — animated slide-in per scene, progress bar, bilingual text (target + EN translation), checkpoint `<Textarea>` + Submit / non-checkpoint Continue button
- **Completion screen** — checkmark icon, story title, "Choose another story" reset

**Hook (`useNarrativeReader`) responsibilities:**
- Auth guard on mount via `supabase.auth.getSession()` → redirect to `/login` if no session
- Loads story list; `selectStory(id)` fetches `FullStory` and resets node state
- `handleContinue()` → `update-progress` POST + `resolveBranch` navigation
- `handleSubmit()` → `log-interaction` POST + `update-progress` POST + `resolveBranch` (accuracy_score = 0.8 placeholder for Phase 4)
- `advanceToNode()` → sets `isComplete` if next node not found or `null`

**Rebrand: Vocora → NarrVoca**
- All 5 navbar/footer components updated
- `app/layout.tsx` title + description updated
- 9 lang files updated (`Dashboard.ts`, `welcome.ts`, `chatbox.ts`, `login.ts`, `signup.ts`, `wordLists.ts`, `underConstruction.ts`, `app-page.ts`)
- Home page tagline updated in EN, ES, ZH to reflect narrative story-based learning
- `VocoraMascot` component name preserved (internal code identifier, not user-visible)
- Deprecated models replaced: `o1-mini-2024-09-12` → `gpt-4o-mini`, `gpt-3.5-turbo` → `gpt-4o-mini`

**Test results:** 6 suites, **57/57 tests passing**

**Notes / gotchas:**
- `jest.config.js` `testMatch` must include `*.test.tsx` (not just `*.test.ts`) for React hook tests
- `act()` console warnings in hook tests are expected React 18 behaviour — not failures
- Set `mockResolveBranch` AFTER calling helper functions that internally set the mock (stale mock override bug)
- `@jest-environment jsdom` docblock required on `.tsx` test files; node tests are unaffected
- Branch: `feature/narrvoca-expansion`

---

---

## Session 4 — 2026-02-28

### What Was Accomplished

**`.gitignore` / Security (pre-Phase 4)**
- Added `.DS_Store`, `.venv/`, `*.pem` to `.gitignore`
- Removed 3 tracked `.DS_Store` files from git index (`git rm --cached`)
- Confirmed `.env*` already covered all env file patterns

**Phase 4 — Integration (COMPLETE ✓)**

| File | Status |
|---|---|
| `src/pages/api/narrvoca/grade-response.ts` | Created — POST, fetches prompt context from `node_text`, calls `gpt-4o-mini` with `response_format: json_object`, returns `{ accuracy_score, feedback }` |
| `test/unit/narrvoca/api/grade-response.test.ts` | Created — 8 tests, all passing |
| `lib/narrvoca/queries.ts` | Added `getNodeVocab(nodeId)` helper |
| `test/unit/narrvoca/queries.test.ts` | Added 2 tests for `getNodeVocab` |
| `hooks/narrvoca/useNarrativeReader.ts` | Replaced `accuracy_score = 0.8` placeholder with real grading flow; added `accessToken` state; sends `Authorization: Bearer` header on all narrvoca API calls; calls `getNodeVocab` + `update-mastery` per word after checkpoint submit; exposes `feedback` state |
| `app/(auth)/dashboard/narrative/page.tsx` | Displays LLM feedback in a purple-tinted italic card after checkpoint submission; clears when user continues |
| `src/pages/api/narrvoca/log-interaction.ts` | Added `getAuthUser` — validates `Authorization` header via `supabase.auth.getUser`; returns 401 if no session |
| `src/pages/api/narrvoca/update-progress.ts` | Same auth guard added |
| `src/pages/api/narrvoca/update-mastery.ts` | Same auth guard added |
| `app/(auth)/dashboard/page.tsx` | Added "Narrative Reader" tab button (uses `router.push('/dashboard/narrative')`); added `BookOpen` to lucide imports |

**Test results:** 7 suites, **75/75 tests passing**

**Notes / gotchas:**
- `jest.mock` factory is hoisted — referencing `const mockX` directly inside the factory object literal hits the TDZ. Wrap it in a lambda (`(...args) => mockX(...args)`) so the reference is deferred until the mock is called
- `advanceToNode` must NOT clear `feedback` — clear it at the top of `handleContinue` and `handleSubmit` instead, so the feedback state persists long enough for tests (and the UI) to observe it after `handleSubmit` resolves
- `act()` warnings in hook tests are expected React 18 behaviour (pre-existing) — not failures
- Branch: `feature/narrvoca-expansion`

---

---

## Session 5 — 2026-02-28

### What Was Accomplished

**Phase 5 — Production Readiness (COMPLETE ✓)**

| Item | File(s) | Status |
|---|---|---|
| Vocab bridge — sync NarrVoca words to Vocora word list | `src/pages/api/narrvoca/sync-vocab.ts` | Created |
| Vocab bridge tests | `test/unit/narrvoca/api/sync-vocab.test.ts` | 8 tests, all passing |
| Hook wired for sync-vocab | `hooks/narrvoca/useNarrativeReader.ts` | Step 5 added to `handleSubmit` |
| Hook test for sync-vocab | `test/unit/narrvoca/useNarrativeReader.test.tsx` | 1 new test |
| Stub deleted | `src/pages/api/practice-words.ts` | Deleted — confirmed unused |
| Debug console.logs removed | `hooks/story-generator/useHoverDefinitions.ts` | 8 `[DEBUG]` logs removed |
| Credential-leaking log removed | `app/(auth)/actions/auth.ts` | `console.log("Sign in attempt:", {email, password})` removed |
| Auth log removed | `app/(auth)/login/page.tsx` | `console.log("Authentication successful.")` removed |
| Signup log removed | `app/(auth)/signup/page.tsx` | `console.log("Sign-up successful.")` removed |
| Preference logs removed | `app/(auth)/dashboard/writing/page.tsx` | 2 console.logs removed |
| Preference logs removed | `hooks/useSetLanguageFromURL.ts` | 2 console.logs removed |
| README.md rewritten | `README.md` | Full professional README with tech stack, schema, API, testing, setup |
| Architecture doc | `docs/architecture.md` | System architecture, data flows, ER relationships |
| API reference doc | `docs/api-reference.md` | All 5 NarrVoca routes + Vocora routes + query helpers |

**Test results:** 8 suites, **85/85 tests passing**

**Vocab bridge design:**
- `POST /api/narrvoca/sync-vocab` — after checkpoint completion, fetches `node_vocabulary WHERE is_target=true`, gets `vocabulary.term` for each word, checks against `vocab_words` for this user+language, inserts only new words
- Result: NarrVoca-learned words appear in the Vocora story-generator word picker automatically
- No new junction table needed — the existing `vocab_words` table serves as the bridge

**Env file note:**
- The `env` file lives at `NarrVoca/env` (one level above the project root)
- Next.js will NOT auto-load it from that location — it must be at `NarrVoca/NarrVoca/.env.local`
- For local dev: copy `NarrVoca/env` to `NarrVoca/NarrVoca/.env.local` before running `npm run dev`
- Vercel deployment: all keys are set via the Vercel dashboard environment variables

**Notes / gotchas:**
- `vocab_words` has no unique constraint on `(uid, word, language)` — the sync route reads existing words and skips duplicates manually rather than relying on DB-level upsert
- All `console.log` calls with credential data or `[DEBUG]` tags are removed; `console.error` and `console.warn` kept for real error reporting
- Branch: `feature/narrvoca-expansion`

---

## Overall Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | SQL migration — 11 tables + seed data | **COMPLETE ✓** |
| Phase 2 | Backend API layer — query helpers, API routes, branching resolver | **COMPLETE ✓** |
| Phase 3 | Frontend UI — narrative reader + NarrVoca rebrand | **COMPLETE ✓** |
| Phase 4 | Integration — real LLM grading, auth guards, vocab mastery wiring | **COMPLETE ✓** |
| Phase 5 | Production readiness — vocab bridge, cleanup, docs, final commit | **COMPLETE ✓** |
| Phase 6 | UI polish — info pages, favicon, mascot navbars, tests | **COMPLETE ✓** |

---

## START HERE — Next Session (ALL PHASES COMPLETE ✓)

All 5 phases are done. The branch `feature/narrvoca-expansion` is pushed and ready for PR to `main`.

### Env Note (IMPORTANT for local dev)
- `NarrVoca/env` exists one level above the project root — Next.js will NOT auto-load it
- Run this once before `npm run dev`:
  ```bash
  cp NarrVoca/env NarrVoca/NarrVoca/.env.local
  ```
- `.env.local` is in `.gitignore` — safe to keep locally, never committed
- Vercel: all env vars configured in Vercel dashboard (already live)

Phase 4 connects everything: replaces the placeholder accuracy score with real LLM grading, adds proper server-side auth, and wires vocab mastery updates into the reader flow.

### Step-by-step for Phase 4

**Step 1 — Real LLM grading API route**
- File: `src/pages/api/narrvoca/grade-response.ts`
- `POST` body: `{ node_id, user_input, target_language }`
- Fetch the node's prompt text from `node_text` (text_type = 'prompt') as grading context
- Call OpenAI `gpt-4o-mini` with a structured grading prompt
- Return `{ accuracy_score: number, feedback: string }` (score 0.0–1.0)
- Tests first: `test/unit/narrvoca/api/grade-response.test.ts`

**Step 2 — Wire grading into `handleSubmit`**
- In `hooks/narrvoca/useNarrativeReader.ts`, replace the `accuracy_score = 0.8` placeholder
- Call `POST /api/narrvoca/grade-response` before logging the interaction
- Pass real `accuracy_score` and `llm_feedback` to `log-interaction`
- Expose `feedback` state from the hook so the page can display it

**Step 3 — Show feedback in the reader UI**
- After checkpoint submit: display the LLM feedback text below the node content
- Style as an info card (purple-tinted, italic text)
- Only show after submission, clear on node advance

**Step 4 — Vocab mastery updates after checkpoint**
- In `handleSubmit`, after `update-progress`, fetch vocab for the current node via `getBranchingRules` + `node_vocabulary` join (or add `getNodeVocab(nodeId)` query helper)
- For each vocab word: POST to `/api/narrvoca/update-mastery` with the real `accuracy_score`
- Add `getNodeVocab(nodeId)` to `lib/narrvoca/queries.ts` + test

**Step 5 — Server-side auth validation**
- Add auth check to all three narrvoca API routes (`log-interaction`, `update-progress`, `update-mastery`, `grade-response`)
- Use Supabase server client: `createServerClient` from `@supabase/ssr` or validate the `Authorization` header
- Return 401 if no valid session instead of trusting the `uid` from request body

**Step 6 — Add "Narrative" nav link to dashboard**
- Find the main dashboard page (`app/(auth)/dashboard/page.tsx`) nav tab row
- Add a "Narrative Reader" tab/button linking to `/dashboard/narrative`
- Do NOT restructure existing tabs — append only

**Step 7 — Run all tests, update this log, commit, open PR**
```bash
npm test
```
All 57+ tests must stay green before opening the PR from `feature/narrvoca-expansion` → `main`.

---

## Architecture Decisions (locked)

- **New narrative reader** lives at `app/(auth)/dashboard/narrative/page.tsx` — do NOT touch existing `story-generator/` page
- **API routes** follow existing Pages Router pattern under `src/pages/api/narrvoca/`
- **Query helpers** are library functions (`lib/narrvoca/`) called by client-side hooks — not API routes
- **uid** passed from client (from `supabase.auth.getUser()`) in request body for Phase 2; proper server-side auth validation deferred to Phase 4
- **Branching pass threshold:** `0.7` (accuracy_score ≥ 0.7 = pass)
- **Spaced repetition intervals:** score <0.3→1d, <0.6→3d, <0.8→7d, ≥0.8→14d

---

## Tech Stack Reference

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript (App Router + Pages Router hybrid) |
| Styling | Tailwind CSS + Radix UI (shadcn/ui) |
| Backend / DB | Supabase (PostgreSQL) — client at `lib/supabase.ts` |
| AI — Stories | OpenAI (`gpt-4o-mini`) via `src/pages/api/generate-story.ts` |
| AI — Other | Google Generative AI, Fireworks AI |
| Auth | Supabase Auth (UUID `uid`) + NextAuth |
| Testing | Cypress E2E (`test/cypress/`) — Jest unit tests added in Phase 2 |
| Deployment | Vercel (`vocora.vercel.app`) |

---

## Original Vocora Tables (5) — Already in Supabase

| Table | PK | Purpose |
|---|---|---|
| `cached_definitions` | `word` | Cache AI-generated definitions |
| `user_preferences` | `uid` | Per-user display language + practice language |
| `user_stories` | `id` | Flat archive of AI-generated stories |
| `vocab_lists` | `list_id` | User vocabulary collections |
| `vocab_words` | `id` (FK: list_id) | Individual vocab words |

## New NarrVoca Tables (11) — Created in Phase 1

| Table | PK | Type | Purpose |
|---|---|---|---|
| `stories` | `story_id` | Strong entity | Master story record |
| `story_nodes` | `node_id` | Strong entity | Scene-level decomposition |
| `node_text` | `node_text_id` | Multivalued | Multilingual text per node |
| `branching_logic` | `branch_id` | Entity w/ attrs | Adaptive branch rules |
| `vocabulary` | `vocab_id` | Strong entity | Shared vocab dictionary |
| `grammar_points` | `grammar_id` | Strong entity | Grammar rules |
| `node_vocabulary` | `(node_id, vocab_id)` | M:N associative | Node ↔ vocab link |
| `node_grammar` | `(node_id, grammar_id)` | M:N associative | Node ↔ grammar link |
| `user_node_progress` | `(uid, node_id)` | M:N associative | Per-user node progress |
| `user_vocab_mastery` | `(uid, vocab_id)` | M:N associative | Per-user vocab mastery + SRS |
| `interaction_log` | `interaction_id` | Log table | Every user response logged |

---

## Key File Paths

```
lib/supabase.ts                         ← Supabase client (single export)
lib/narrvoca/types.ts                   ← [Phase 2] TypeScript interfaces
lib/narrvoca/queries.ts                 ← [Phase 2] DB query helpers
lib/narrvoca/branching.ts               ← [Phase 2] Branching logic resolver
src/pages/api/narrvoca/
  log-interaction.ts                    ← [Phase 2] POST: log to interaction_log
  update-progress.ts                    ← [Phase 2] POST: upsert user_node_progress
  update-mastery.ts                     ← [Phase 2] POST: upsert user_vocab_mastery
hooks/narrvoca/useNarrativeReader.ts    ← [Phase 3] Hook driving all reader state
app/(auth)/dashboard/narrative/         ← [Phase 3] Narrative reader page
test/unit/narrvoca/                     ← [Phase 2+3] Jest unit tests (57 passing)
supabase/migrations/                    ← SQL migration + seed files
docs/progress-log.md                    ← This file
```

---

## Session 6 — 2026-02-28

### What Was Accomplished

**Phase 6 — UI Polish and Production Finish (COMPLETE ✓)**

| Item | File(s) | Status |
|---|---|---|
| `/about` page | `app/about/page.tsx` | Created — mission, team, academic context |
| `/privacy` page | `app/privacy/page.tsx` | Created — privacy policy for language learning app |
| `/terms` page | `app/terms/page.tsx` | Created — terms of service |
| `/contact` page | `app/contact/page.tsx` | Created — GitHub team links + email contact |
| Footer link hrefs | `components/Footer.tsx` | Fixed — all 4 links now point to real routes |
| Favicon metadata | `app/layout.tsx` | Added — `icons`, `apple`, `openGraph.images` using `VocoraMascot.svg` |
| Mascot in Navbar (public) | `components/Navbar.tsx` | Added — 24px mascot icon in purple bubble next to "NarrVoca" |
| Mascot in Dashboard navbar | `components/dashboard/navbar.tsx` | Added |
| Mascot in Dashboard navbar2 | `components/dashboard/navbar2.tsx` | Added |
| Mascot in Dashboard navbar3 | `components/dashboard/navbar3.tsx` | Added |
| Phase 6 UI tests | `test/unit/narrvoca/phase6-ui.test.tsx` | 11 tests — Footer hrefs, page exports, mascot render |

**Test results:** 9 suites, **96/96 tests passing** (+11 from Phase 6)

**Page design:**
- All 4 new pages: purple gradient (`from-purple-50 to-white` / dark mode `from-purple-950 to-slate-900`)
- Full `Navbar` and `Footer` included — layout consistent with landing page
- Back-to-home link at top-left (`← Back to Home → /`)
- Purple section headings, card layout for team members (about page)

**Favicon implementation:**
- `public/VocoraMascot.svg` used as `icon`, `apple`, and `og:image` via Next.js `metadata.icons` object
- No separate `favicon.ico` file needed — SVG favicon fully supported in modern browsers

**Mascot implementation:**
- `VocoraMascot` rendered at 24×24px inside a `w-8 h-8 bg-white/20 rounded-full` bubble in all navbars
- Footer already had the mascot (from Phase 3) — verified still present

**Branch:** `feature/narrvoca-expansion`
