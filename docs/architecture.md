# NarrVoca — System Architecture

## Overview

NarrVoca is built on top of the Vocora platform using a **Next.js 14 hybrid router** (App Router for pages, Pages Router for API routes), with Supabase as the PostgreSQL database and auth provider, and OpenAI for LLM grading.

```
Browser
  │
  ├── App Router pages (app/)          ← React Server Components + Client hooks
  │     └── /dashboard/narrative       ← NarrVoca reader
  │
  ├── Pages Router API routes (src/pages/api/)
  │     └── /api/narrvoca/*            ← All NarrVoca backend routes
  │
  ├── Supabase Client (lib/supabase.ts)
  │     ├── Auth — getSession / getUser
  │     └── DB  — query builder (all tables)
  │
  └── OpenAI SDK (grade-response route only)
```

---

## Layer Map

| Layer | Files | Responsibility |
|---|---|---|
| Page | `app/(auth)/dashboard/narrative/page.tsx` | Renders story list, node reader, completion screen |
| Hook | `hooks/narrvoca/useNarrativeReader.ts` | All reader state, API calls, navigation |
| Query helpers | `lib/narrvoca/queries.ts` | Typed Supabase fetches (no business logic) |
| Branching | `lib/narrvoca/branching.ts` | Rule evaluation + DB resolver |
| Types | `lib/narrvoca/types.ts` | TypeScript interfaces for all 11 tables |
| API routes | `src/pages/api/narrvoca/` | HTTP handlers — auth guard + DB write |
| Migrations | `supabase/migrations/` | Schema DDL + seed data |

---

## Data Flow — Checkpoint Submission

```
User types response → clicks "Submit response"
         │
         ▼
useNarrativeReader.handleSubmit()
         │
         ├─ POST /api/narrvoca/grade-response
         │       └─ node_text (prompt context) → OpenAI gpt-4o-mini
         │       └─ returns { accuracy_score: 0.0–1.0, feedback: string }
         │
         ├─ setFeedback(llm_feedback)          ← shown in UI immediately
         │
         ├─ POST /api/narrvoca/log-interaction
         │       └─ INSERT interaction_log row
         │
         ├─ POST /api/narrvoca/update-progress
         │       └─ UPSERT user_node_progress (status='completed', best_score)
         │
         ├─ getNodeVocab(node_id)              ← lib/narrvoca/queries.ts
         │       └─ SELECT node_vocabulary WHERE node_id=?
         │
         ├─ POST /api/narrvoca/update-mastery  ← one call per vocab word
         │       └─ UPSERT user_vocab_mastery (mastery_score, next_review_at)
         │
         ├─ POST /api/narrvoca/sync-vocab
         │       └─ NarrVoca vocabulary.term → INSERT vocab_words (Vocora table)
         │       └─ Target words now appear in dashboard word list
         │
         └─ resolveBranch(node_id, accuracy_score)
                 └─ SELECT branching_logic WHERE node_id=?
                 └─ score_threshold: advance if score >= condition_value (0.7)
                 └─ default: always advance
                 └─ null → story complete
```

---

## Authentication Flow

All NarrVoca API routes use server-side auth validation:

```
Client (hook) → includes Authorization: Bearer <access_token> on every fetch
API route     → supabase.auth.getUser(token) → returns user or null
               → null: return 401
               → user: proceed with DB operations
```

The `access_token` is obtained from `supabase.auth.getSession()` on component mount and stored in the hook's `accessToken` state.

---

## Branching Logic

```
resolveBranch(nodeId, score?)
    │
    └─ SELECT * FROM branching_logic WHERE node_id = ?
            │
            ├─ Filter: condition_type = 'score_threshold'
            │         AND score >= parseFloat(condition_value)
            │         → return next_node_id  (pass path)
            │
            └─ Fallback: condition_type = 'default'
                        → return next_node_id  (default path)

    null returned → advanceToNode sets isComplete = true
```

Pass threshold is `0.7`. A score below threshold keeps the user on the same node (the default rule for that node points back to it or to an earlier node).

---

## Vocab Bridge

```
NarrVoca: vocabulary table           Vocora: vocab_words table
─────────────────────────────        ─────────────────────────────
vocab_id  bigint (PK)                id       int (PK)
term      text                  →    word     text
language_code  text ('es','zh') →    language text
translation_en text                  uid      uuid
                                     list_id  int (optional)

Connection: sync-vocab API route
  1. SELECT vocab_id FROM node_vocabulary WHERE node_id=? AND is_target=true
  2. SELECT term FROM vocabulary WHERE vocab_id IN (...)
  3. SELECT word FROM vocab_words WHERE uid=? AND language=?
  4. INSERT INTO vocab_words (words not already present)
```

After a checkpoint is completed, the user's target vocabulary appears in the Vocora story-generator word picker without any manual action.

---

## Database ER Diagram

See [`NarrVoca_Figure1_ER_Diagram.png`](NarrVoca_Figure1_ER_Diagram.png) for the full entity-relationship diagram.

### Key Relationships

```
stories ─── (1:N) ──► story_nodes
story_nodes ─── (1:N) ──► node_text
story_nodes ─── (1:N) ──► branching_logic
story_nodes ─── (M:N) ──► vocabulary       [via node_vocabulary]
story_nodes ─── (M:N) ──► grammar_points   [via node_grammar]

users ─── (M:N) ──► story_nodes            [via user_node_progress]
users ─── (M:N) ──► vocabulary             [via user_vocab_mastery]
users ─── (1:N) ──► interaction_log
```

---

## Spaced Repetition

The `user_vocab_mastery` table stores:

```sql
uid             uuid       -- user
vocab_id        bigint     -- vocabulary word
mastery_score   numeric    -- 0.0–1.0, updated on each checkpoint
next_review_at  timestamptz -- when to show this word again
updated_at      timestamptz
```

Review intervals (set in `update-mastery` API route):

| Score | Interval |
|---|---|
| < 0.3 | 1 day |
| 0.3 – 0.59 | 3 days |
| 0.6 – 0.79 | 7 days |
| ≥ 0.8 | 14 days |

---

## Performance Indexes

Six indexes were added in `001_narrvoca_extension.sql`:

| Index | Table | Column(s) |
|---|---|---|
| `idx_story_nodes_story_id` | `story_nodes` | `story_id` |
| `idx_node_text_node_id` | `node_text` | `node_id` |
| `idx_branching_logic_node_id` | `branching_logic` | `node_id` |
| `idx_user_node_progress_uid` | `user_node_progress` | `uid` |
| `idx_user_vocab_mastery_uid` | `user_vocab_mastery` | `uid` |
| `idx_interaction_log_uid_node` | `interaction_log` | `(uid, node_id)` |
