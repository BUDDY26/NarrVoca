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

**Phase 2 — NOT STARTED**
- Planning complete, architecture decided, ready to begin next session

---

## Overall Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | SQL migration — 11 tables + seed data | **COMPLETE ✓** |
| Phase 2 | Backend API layer — query helpers, API routes, branching resolver | **NOT STARTED** |
| Phase 3 | Frontend UI — narrative reader at `/dashboard/narrative` | **NOT STARTED** |
| Phase 4 | Integration — auth guards, connect Vocora + NarrVoca vocab tables | **NOT STARTED** |

---

## START HERE — Next Session (Phase 2)

### Step-by-step for Phase 2

**Step 1 — Install Jest (run in terminal)**
```bash
npm install --save-dev jest jest-environment-node @types/jest
```

**Step 2 — Create `jest.config.ts`** (project root)
- Use `next/jest` — handles `@/` path aliases and SWC transpilation automatically
- `testEnvironment: 'node'`
- `testMatch: ['**/test/unit/**/*.test.ts']`

**Step 3 — Create `lib/narrvoca/types.ts`**
TypeScript interfaces for all 11 new tables:
`Story`, `StoryNode`, `NodeText`, `BranchingLogic`, `Vocabulary`, `GrammarPoint`,
`NodeVocabulary`, `NodeGrammar`, `UserNodeProgress`, `UserVocabMastery`, `InteractionLog`,
plus composite type `FullStory` (story + nodes + texts)

**Step 4 — Branching resolver (TDD)**
- Test file: `test/unit/narrvoca/branching.test.ts`
- Implementation: `lib/narrvoca/branching.ts`
- Key design: split into `applyBranchingRules(rules, score?)` (pure fn, no mock needed)
  and `resolveBranch(nodeId, score?)` (calls DB)
- Pass threshold constant: `PASS_THRESHOLD = 0.7`

**Step 5 — Query helpers (TDD)**
- Test file: `test/unit/narrvoca/queries.test.ts`
- Implementation: `lib/narrvoca/queries.ts`
- Functions: `getStories()`, `getStoryById(id)`, `getNodesByStoryId(storyId)`,
  `getNodeText(nodeId)`, `getFullStory(storyId)`, `getBranchingRules(nodeId)`
- Mock pattern: `jest.mock('@/lib/supabase', ...)` — make chain thenable via `.then`

**Step 6 — API: log-interaction (TDD)**
- Test: `test/unit/narrvoca/api/log-interaction.test.ts`
- Implementation: `src/pages/api/narrvoca/log-interaction.ts`
- `POST` — body: `{ uid, node_id, user_input, llm_feedback?, accuracy_score }`
- Response 201: `{ interaction_id }`
- Errors: 400 (missing fields), 405 (wrong method), 500 (DB error)

**Step 7 — API: update-progress (TDD)**
- Test: `test/unit/narrvoca/api/update-progress.test.ts`
- Implementation: `src/pages/api/narrvoca/update-progress.ts`
- `POST` — body: `{ uid, node_id, status, accuracy_score? }`
- Upsert logic: `best_score` only updates if new score > existing; `completed_at` set once
- Response 200: `{ uid, node_id, status, best_score, completed_at }`

**Step 8 — API: update-mastery (TDD)**
- Test: `test/unit/narrvoca/api/update-mastery.test.ts`
- Implementation: `src/pages/api/narrvoca/update-mastery.ts`
- `POST` — body: `{ uid, vocab_id, mastery_score }`
- Compute `next_review_at` from score: <0.3→1d, <0.6→3d, <0.8→7d, ≥0.8→14d
- Response 200: `{ uid, vocab_id, mastery_score, next_review_at }`

**Step 9 — Run all tests**
```bash
npm test
```
Expect all tests green before closing Phase 2.

**Step 10 — Update this log and commit**

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
| AI — Stories | OpenAI (`o1-mini-2024-09-12`) via `src/pages/api/generate-story.ts` |
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
app/(auth)/dashboard/narrative/         ← [Phase 3] New narrative reader page
test/unit/narrvoca/                     ← [Phase 2] Jest unit tests
supabase/migrations/                    ← SQL migration + seed files
docs/progress-log.md                    ← This file
```
