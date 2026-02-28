# Pull Request: NarrVoca Narrative Reader Expansion

**Branch:** `feature/narrvoca-expansion` → `main`
**Course:** CSCI 6333 — Database Systems, UTRGV Spring 2026
**Team:** Ruben Aleman (@BUDDY26), Silvia Osuna (@mozzarellastix), Andrea Garza (@andreag02)

---

## Summary

This PR adds the complete **NarrVoca Narrative Reader** on top of the existing Vocora platform — a full-stack adaptive language learning system built around structured, branching short stories. The work spans 6 phases: database schema extension, backend API layer, frontend reader UI, LLM grading integration, production hardening, and UI polish.

**96/96 tests passing. No breaking changes. Zero regressions to existing Vocora features.**

---

## What Was Built — Phase by Phase

### Phase 1 — SQL Migration
*New tables, indexes, and seed data applied to Supabase.*

Adds **11 new PostgreSQL tables** to the existing 5-table Vocora schema, along with 6 performance indexes and a complete seed story.

**New tables:**

| Table | Type | Purpose |
|---|---|---|
| `stories` | Strong entity | Master story record (title, language, difficulty) |
| `story_nodes` | Strong entity | Scene-level decomposition of a story |
| `node_text` | Multivalued | Multilingual text content per node (en + target lang) |
| `branching_logic` | Entity w/ attrs | Adaptive branching rules (score threshold or default) |
| `vocabulary` | Strong entity | Shared vocabulary dictionary |
| `grammar_points` | Strong entity | Grammar rules linked to nodes |
| `node_vocabulary` | M:N associative | Maps vocab words to nodes (`is_target` flag) |
| `node_grammar` | M:N associative | Maps grammar points to nodes |
| `user_node_progress` | M:N associative | Per-user node completion status and best score |
| `user_vocab_mastery` | M:N associative | Per-user vocab mastery score + SRS `next_review_at` |
| `interaction_log` | Log table | Every user free-text response with LLM score |

**New files:**
- `supabase/migrations/001_narrvoca_extension.sql`
- `supabase/migrations/001_narrvoca_extension_rollback.sql`
- `supabase/migrations/002_seed_sample_story.sql` — seed story: *"En el Mercado"* (Spanish, beginner)
- `supabase/migrations/002_seed_sample_story_rollback.sql`
- `supabase/migrations/002_seed_verify.sql`

---

### Phase 2 — Backend API Layer
*TypeScript interfaces, query helpers, branching resolver, and 3 API routes.*

Establishes the entire backend for the narrative system. All routes follow the existing Pages Router convention at `src/pages/api/narrvoca/`.

**New files:**

| File | Purpose |
|---|---|
| `lib/narrvoca/types.ts` | TypeScript interfaces for all 11 tables + `FullStory` aggregate |
| `lib/narrvoca/queries.ts` | 7 typed Supabase query helpers (stories, nodes, text, vocab, branching) |
| `lib/narrvoca/branching.ts` | Pure `applyBranchingRules()` fn + `resolveBranch()` DB resolver |
| `src/pages/api/narrvoca/log-interaction.ts` | `POST` — inserts a row into `interaction_log` |
| `src/pages/api/narrvoca/update-progress.ts` | `POST` — upserts `user_node_progress` (status + best score) |
| `src/pages/api/narrvoca/update-mastery.ts` | `POST` — upserts `user_vocab_mastery` + calculates SRS interval |
| `jest.config.js` | Jest config with `next/jest` + `@/` alias resolver |
| `test/unit/narrvoca/branching.test.ts` | 12 tests |
| `test/unit/narrvoca/queries.test.ts` | 15 tests |
| `test/unit/narrvoca/api/log-interaction.test.ts` | 5 tests |
| `test/unit/narrvoca/api/update-progress.test.ts` | 5 tests |
| `test/unit/narrvoca/api/update-mastery.test.ts` | 9 tests |

**Test count after phase:** 39/39

---

### Phase 3 — Frontend Narrative Reader UI
*Full interactive reader page + hook, and complete NarrVoca rebrand.*

Adds the narrative reader at `/dashboard/narrative` with three views: story list, scene reader, and completion screen. Simultaneously rebrands all user-visible strings from "Vocora" to "NarrVoca" and replaces two deprecated OpenAI model IDs.

**New files:**

| File | Purpose |
|---|---|
| `app/(auth)/dashboard/narrative/page.tsx` | Narrative reader page — story list, node reader, completion screen |
| `hooks/narrvoca/useNarrativeReader.ts` | Central hook — auth guard, story/node state, API calls, branching |
| `test/unit/narrvoca/useNarrativeReader.test.tsx` | 18 tests |

**Modified files (rebrand + model fixes):**
- `app/layout.tsx` — updated `<title>` and meta description
- `components/Navbar.tsx`, `Footer.tsx` — NarrVoca branding
- `components/dashboard/navbar.tsx`, `navbar2.tsx`, `navbar3.tsx`
- 9 `lang/` i18n files — EN / ES / ZH strings updated
- `src/pages/api/generate-story.ts`, `chat-box.ts` — `o1-mini` → `gpt-4o-mini`, `gpt-3.5-turbo` → `gpt-4o-mini`

**Test count after phase:** 57/57

---

### Phase 4 — LLM Grading + Auth Integration
*Real GPT-4o-mini grading, server-side auth on all API routes, vocab mastery wiring.*

Replaces the `accuracy_score = 0.8` placeholder with a full grading pipeline. Adds `Authorization: Bearer` header validation to all three existing narrvoca routes and the new grade route. Wires per-word mastery updates after every checkpoint submission. Adds the Narrative Reader button to the main dashboard.

**New files:**

| File | Purpose |
|---|---|
| `src/pages/api/narrvoca/grade-response.ts` | `POST` — fetches node prompt context, calls OpenAI, returns `{ accuracy_score, feedback }` |
| `test/unit/narrvoca/api/grade-response.test.ts` | 8 tests |

**Modified files:**
- `hooks/narrvoca/useNarrativeReader.ts` — real grading flow, `accessToken` state, `feedback` state, mastery updates per word
- `app/(auth)/dashboard/narrative/page.tsx` — displays LLM feedback in purple italic card
- `lib/narrvoca/queries.ts` — added `getNodeVocab(nodeId)` helper
- `src/pages/api/narrvoca/log-interaction.ts` — auth guard added
- `src/pages/api/narrvoca/update-progress.ts` — auth guard added
- `src/pages/api/narrvoca/update-mastery.ts` — auth guard added
- `app/(auth)/dashboard/page.tsx` — "Narrative Reader" tab button added

**Test count after phase:** 75/75

---

### Phase 5 — Production Readiness
*Vocab bridge, security cleanup, full documentation.*

Adds the vocab bridge so NarrVoca-learned words automatically appear in the Vocora story-generator word picker. Removes all debug `console.log` calls (including one that logged email + password). Rewrites the README and adds architecture + API reference docs.

**New files:**

| File | Purpose |
|---|---|
| `src/pages/api/narrvoca/sync-vocab.ts` | `POST` — syncs `is_target` vocab from completed node into `vocab_words` (Vocora table) |
| `test/unit/narrvoca/api/sync-vocab.test.ts` | 8 tests |
| `docs/architecture.md` | System architecture, data flows, ER relationships, SRS schedule |
| `docs/api-reference.md` | All NarrVoca + Vocora API routes + query helper signatures |

**Modified files:**
- `README.md` — full professional rewrite with schema, API, setup, testing sections
- `hooks/narrvoca/useNarrativeReader.ts` — sync-vocab call added to `handleSubmit`
- `hooks/story-generator/useHoverDefinitions.ts` — 8 `[DEBUG]` console.logs removed
- `app/(auth)/actions/auth.ts` — removed `console.log("Sign in attempt:", {email, password})`
- `app/(auth)/login/page.tsx`, `signup/page.tsx` — auth success logs removed
- `app/(auth)/dashboard/writing/page.tsx`, `hooks/useSetLanguageFromURL.ts` — preference logs removed
- `.gitignore` — added `.DS_Store`, `.venv/`, `*.pem`; removed 3 tracked `.DS_Store` files

**Test count after phase:** 85/85

---

### Phase 6 — UI Polish and Production Finish
*Info pages, favicon, mascot in all navbars, Formspree contact form.*

Adds four missing public pages (About, Privacy, Terms, Contact), fixes footer links, wires the favicon, and adds the NarrVoca mascot icon to all four navbar components.

**New files:**

| File | Purpose |
|---|---|
| `app/about/page.tsx` | Team, mission, academic context (UTRGV / CSCI 6333) |
| `app/privacy/page.tsx` | Privacy policy for language learning data |
| `app/terms/page.tsx` | Terms of service |
| `app/contact/page.tsx` | Formspree contact form (endpoint `meeldwpg`) + GitHub team links |
| `test/unit/narrvoca/phase6-ui.test.tsx` | 11 tests — footer hrefs, page exports, mascot render |

**Modified files:**
- `components/Footer.tsx` — all 4 footer links now point to real routes (`/about`, `/privacy`, `/terms`, `/contact`)
- `app/layout.tsx` — favicon metadata: `icons`, `apple`, `openGraph.images` → `VocoraMascot.svg`
- `components/Navbar.tsx` — 24px mascot icon in purple bubble
- `components/dashboard/navbar.tsx`, `navbar2.tsx`, `navbar3.tsx` — mascot icon added

**Test count after phase:** 96/96

---

## Test Results

```
Test Suites: 9 passed, 9 total
Tests:       96 passed, 96 total
Snapshots:   0 total
Time:        ~8s
```

| Suite | Tests | Coverage |
|---|---|---|
| `branching.test.ts` | 12 | `applyBranchingRules` pure fn + `resolveBranch` DB resolver |
| `queries.test.ts` | 15 | All 7 query helpers |
| `log-interaction.test.ts` | 5 | POST handler — 201/400/401/405/500 |
| `update-progress.test.ts` | 5 | POST handler — upsert + auth guard |
| `update-mastery.test.ts` | 9 | POST handler — SRS intervals + auth guard |
| `grade-response.test.ts` | 8 | OpenAI call + score parsing + error paths |
| `sync-vocab.test.ts` | 8 | Vocab bridge — deduplication logic |
| `useNarrativeReader.test.tsx` | 23 | Hook — auth, story load, submit, branching, sync |
| `phase6-ui.test.tsx` | 11 | Footer hrefs, page exports, mascot render |

---

## New Files Added (complete list)

```
supabase/migrations/
  001_narrvoca_extension.sql
  001_narrvoca_extension_rollback.sql
  002_seed_sample_story.sql
  002_seed_sample_story_rollback.sql
  002_seed_verify.sql

lib/narrvoca/
  types.ts
  queries.ts
  branching.ts

src/pages/api/narrvoca/
  log-interaction.ts
  update-progress.ts
  update-mastery.ts
  grade-response.ts
  sync-vocab.ts

hooks/narrvoca/
  useNarrativeReader.ts

app/(auth)/dashboard/narrative/
  page.tsx

app/
  about/page.tsx
  privacy/page.tsx
  terms/page.tsx
  contact/page.tsx

test/unit/narrvoca/
  branching.test.ts
  queries.test.ts
  useNarrativeReader.test.tsx
  phase6-ui.test.tsx
  api/
    log-interaction.test.ts
    update-progress.test.ts
    update-mastery.test.ts
    grade-response.test.ts
    sync-vocab.test.ts

jest.config.js
docs/architecture.md
docs/api-reference.md
```

---

## Breaking Changes

**None.** All existing Vocora routes, pages, hooks, and database tables are unchanged. The NarrVoca extension adds new routes under `/api/narrvoca/`, new pages under `/dashboard/narrative` and `/about|privacy|terms|contact`, and new tables that coexist with the original 5 Vocora tables. The only modifications to existing files are:

- Branding strings (Vocora → NarrVoca in visible UI text)
- Deprecated OpenAI model IDs updated (`o1-mini-2024-09-12` → `gpt-4o-mini`)
- `console.log` calls removed (including one that leaked credentials)
- Footer links fixed to point to real routes
- Dashboard: "Narrative Reader" tab button added

---

## Environment Variables Required

Copy `NarrVoca/env` to `NarrVoca/NarrVoca/.env.local` before running locally. All variables below are already configured in the Vercel dashboard for the deployed app.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI — used by grade-response, generate-story, generate-definitions, generate-full-audio
OPENAI_API_KEY=

# Google Generative AI — used by chat-box, writing_prac
GOOGLE_GENERATIVE_AI_API_KEY=

# Fireworks AI — used by generate-image
FIREWORKS_API_KEY=

# NextAuth (if configured)
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

> **Note:** The `env` file lives one directory above the project root (`NarrVoca/env`). Next.js will NOT auto-load it from there — it must be at `NarrVoca/NarrVoca/.env.local`.

---

## How to Test Locally

```bash
# 1. Clone and install
git clone <repo-url>
cd NarrVoca/NarrVoca
npm install

# 2. Set up environment
cp ../env .env.local   # copy env file into project root

# 3. Run unit tests (no env vars needed — Supabase is mocked)
npm test

# 4. Start dev server
npm run dev
# → http://localhost:3000

# 5. Test the Narrative Reader
#    a. Sign up or log in at /login
#    b. Go to Dashboard → click "Narrative Reader"
#    c. Select "En el Mercado" (Spanish, beginner)
#    d. Read through scenes; at Node 3 (checkpoint), type a response and submit
#    e. Observe: LLM feedback card appears, score drives branching
#       - Score ≥ 0.7 → advances to Node 4 (completion)
#       - Score < 0.7 → returns to Node 2 (retry)
#    f. After completion: check Dashboard word list — story vocab should be synced

# 6. Run Cypress E2E (optional)
npx cypress open
```

---

## Deployment

The app is deployed on Vercel at [vocora.vercel.app](https://vocora.vercel.app).

All environment variables are configured in the Vercel dashboard. No additional configuration is needed for deployment — pushing `main` triggers an automatic Vercel build.

The Supabase migrations (`001_narrvoca_extension.sql`, `002_seed_sample_story.sql`) have already been applied to the production Supabase project. Merging this PR does **not** re-run migrations automatically.

---

## Reviewers

- Ruben Aleman (@BUDDY26)
- Silvia Osuna (@mozzarellastix)
- Andrea Garza (@andreag02)
