# NarrVoca

**Narrative-driven vocabulary acquisition for Spanish and Mandarin learners.**

NarrVoca is a full-stack language-learning web application that extends the original Vocora platform with an adaptive **Narrative Reader** — branching, multilingual short stories that grade written responses in real time with GPT-4o-mini, track vocabulary mastery via spaced repetition, and automatically sync learned words into the user's Vocora word list.

> **Developer:** Ruben Aleman (@BUDDY26)
> **Deployed:** [narrvoca.com](https://narrvoca.com)

### How It Works

When a user submits a response at a story node, the request flows to `grade-response` (basic) or `smart-grade` (RAG-enhanced). `smart-grade` retrieves the most relevant story context via pgvector embedding search, applies per-node rubric criteria from `grading_rubrics`, and calls GPT-4o-mini to return an accuracy score, narrative feedback, and per-criterion rubric breakdown. Each response is persisted to `interaction_log`; node progress is upserted to `user_node_progress`; and per-word mastery scores are written to `user_vocab_mastery` with a computed `next_review_at` date. Passing a checkpoint (score ≥ 0.7) triggers `sync-vocab`, which writes the node's target vocabulary into the user's Vocora `vocab_words` table. The tutor chat system persists multi-turn conversations in `tutor_sessions` and uses RAG retrieval to answer learner questions in context of the active story. All API routes require a Supabase JWT.

---

## Features

| Feature | Description |
|---|---|
| **Narrative Reader** | Branching story scenes with bilingual text (target language + English) |
| **Adaptive Branching** | Checkpoint nodes gate progression — users retry on score < 0.7 |
| **LLM Grading** | GPT-4o-mini grades free-text responses and returns a 0–1 score + feedback |
| **Spaced Repetition** | Per-word mastery scores drive a `next_review_at` SRS schedule |
| **Vocab Bridge** | Target words from completed nodes auto-sync into the user's Vocora word list |
| **Server-side Auth** | All NarrVoca API routes validate `Authorization: Bearer <token>` via Supabase |
| **Story Generator** | Original Vocora feature — AI-generated stories from a curated word list |
| **Hover Definitions** | Click any story word for an AI-powered, cached definition |
| **Writing Practice** | LLM-powered feedback on free-text writing exercises |
| **Multilingual UI** | Full EN / ES / ZH interface translation |
| **Smart Grading** | RAG-enhanced grading via `smart-grade` — retrieves story context via pgvector and scores against per-node rubric criteria |
| **Grading Rubrics** | Configurable per-criterion grading weights and example answers per checkpoint node |
| **Tutor Chat** | RAG-powered conversational tutor per story with persistent multi-turn session history |
| **Vocab Review** | SRS-scheduled due-word queue enriched with RAG-retrieved contextual examples from the story corpus |
| **Expanded Dashboard** | Quiz, reading, speaking, writing, progress, saved, and wordlist pages |

---

## What NarrVoca Adds to Vocora

NarrVoca extends the original Vocora platform (Next.js + Supabase + AI) by introducing a structured relational database layer for narrative learning:

- **Story decomposition** — stories → nodes → multilingual scene text
- **Grammar mapping** — grammar rules linked to individual nodes
- **Vocabulary targets** — `is_target` flag marks key learning words per node
- **User progress tracking** — per-node status (not started / in progress / completed)
- **Interaction logging** — every free-text response is recorded with its LLM score
- **Spaced repetition** — mastery scores and review dates per vocab word
- **Vocab bridge** — NarrVoca-learned words automatically appear in the Vocora story-generator word picker

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router + Pages Router hybrid) + TypeScript |
| Styling | Tailwind CSS + Radix UI (shadcn/ui) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + Google OAuth) |
| AI — Grading / Stories | OpenAI `gpt-4o-mini` |
| AI — Definitions / Audio | OpenAI (TTS, completions) |
| AI — Writing / Chat | Google Generative AI (Gemini) |
| AI — Images | Fireworks AI |
| Testing | Jest (unit, 257 tests) + Cypress (E2E) |
| Deployment | Vercel |

---
## Database Schema

NarrVoca adds **11 tables** on top of Vocora's original 5.

### Original Vocora Tables (5)

| Table | PK | Purpose |
|---|---|---|
| `cached_definitions` | `word` | AI-generated definition cache |
| `user_preferences` | `uid` | Display language + practice language per user |
| `user_stories` | `id` | Saved AI-generated stories |
| `vocab_lists` | `list_id` | User vocabulary collections |
| `vocab_words` | `id` | Individual vocabulary words |

### NarrVoca Extension Tables (11)

| Table | PK | Type | Purpose |
|---|---|---|---|
| `stories` | `story_id` | Strong entity | Master story record |
| `story_nodes` | `node_id` | Strong entity | Scene-level decomposition |
| `node_text` | `node_text_id` | Multivalued | Multilingual text per node |
| `branching_logic` | `branch_id` | Entity w/ attributes | Adaptive branching rules |
| `vocabulary` | `vocab_id` | Strong entity | Shared vocabulary dictionary |
| `grammar_points` | `grammar_id` | Strong entity | Grammar rules |
| `node_vocabulary` | `(node_id, vocab_id)` | M:N associative | Node ↔ vocab link |
| `node_grammar` | `(node_id, grammar_id)` | M:N associative | Node ↔ grammar link |
| `user_node_progress` | `(uid, node_id)` | M:N associative | Per-user node progress |
| `user_vocab_mastery` | `(uid, vocab_id)` | M:N associative | Per-user vocab mastery + SRS |
| `interaction_log` | `interaction_id` | Log table | Every user response logged |

See [`docs/NarrVoca_DB_Design_A.pdf`](docs/NarrVoca_DB_Design_A.pdf) and [`docs/architecture.md`](docs/architecture.md).

---

## Project Structure

```
NarrVoca/
├── app/
│   ├── (auth)/
│   │   ├── dashboard/
│   │   │   ├── narrative/page.tsx     ← NarrVoca reader page
│   │   │   └── page.tsx               ← Main dashboard
│   │   └── story-generator/           ← Original Vocora story feature
│   └── layout.tsx
├── components/dashboard/              ← Navbar variants + UI components
├── hooks/
│   ├── narrvoca/useNarrativeReader.ts ← All reader state + API calls
│   ├── story-generator/               ← Vocora story hooks
│   └── wordlist/useVocabWords.ts      ← Vocora vocab hooks
├── lib/
│   ├── narrvoca/
│   │   ├── branching.ts               ← Branch rule resolver
│   │   ├── queries.ts                 ← Supabase query helpers
│   │   ├── types.ts                   ← TypeScript interfaces
│   │   ├── rag.ts                     ← RAG retrieval + pgvector chunk search
│   │   ├── embed.ts                   ← Embedding generation utilities
│   │   └── query-cache.ts             ← In-memory query cache
│   └── supabase.ts                    ← Supabase client
├── src/pages/api/
│   ├── narrvoca/
│   │   ├── grade-response.ts          ← Basic LLM grading
│   │   ├── smart-grade.ts             ← RAG-enhanced grading with rubrics
│   │   ├── grading-rubrics.ts         ← Rubric CRUD per checkpoint node
│   │   ├── log-interaction.ts         ← Interaction logging
│   │   ├── tutor-chat.ts              ← RAG-powered tutor chat
│   │   ├── tutor-sessions.ts          ← Session get/create
│   │   ├── vocab-review.ts            ← SRS due-word queue with RAG context
│   │   ├── sync-vocab.ts              ← Vocab bridge to vocab_words
│   │   ├── update-mastery.ts          ← SRS mastery upsert
│   │   ├── update-progress.ts         ← Node progress upsert
│   │   ├── embed-content.ts           ← Single-record embedding
│   │   ├── cache-rag-chunks.ts        ← RAG chunk caching
│   │   └── log-rag-query.ts           ← RAG query logging
│   └── generate-story.ts              ← Vocora story generation
├── scripts/
│   ├── generate-embeddings.ts         ← Batch RAG embedding generator
│   └── seed-rubrics.ts                ← Grading rubric seeder
├── supabase/migrations/
│   ├── 001–002                        ← Core schema + seed (11 tables)
│   ├── 003–004                        ← RAG layer (embedding_store + pgvector)
│   ├── 005                            ← Profiles table + auth trigger
│   └── 006–010                        ← Constraints + column additions
├── test/unit/narrvoca/                ← 257 Jest unit tests
│   ├── api/                           ← API route tests
│   └── rag/                           ← RAG layer tests (7 suites)
└── docs/                              ← ER diagram, schema, reports, API docs
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project with all 10 migrations applied
- OpenAI API key (`OPENAI_API_KEY`)
- Gemini API key (`GEMINI_API_KEY`)
- Fireworks AI API key (`FIREWORKS_API_KEY`)

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SHARED_USER_ID=your-shared-demo-user-uuid
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:3000/success
NEXT_PUBLIC_MERRIAM_API_KEY_COLLEGIATE=your-merriam-key
NEXT_PUBLIC_MERRIAM_API_KEY_LEARNERS=your-merriam-key
FIREWORKS_API_KEY=your-fireworks-key
GEMINI_API_KEY=your-gemini-key
```

### Install and Run

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Apply Database Migrations

Run all migrations in order in the Supabase SQL editor. Rollback files are provided for each migration.

**Phase 1 — Core schema**
```
supabase/migrations/001_narrvoca_extension.sql   ← 11 NarrVoca tables + indexes
supabase/migrations/002_seed_sample_story.sql    ← seeds "En el Mercado" story
supabase/migrations/002_seed_verify.sql          ← verify seed row counts
```

**Phase 2 — RAG layer**
```
supabase/migrations/003_rag_layer4.sql           ← embedding_store + pgvector extension
supabase/migrations/004_match_embeddings_fn.sql  ← match_embeddings cosine similarity function
```

**Phase 3 — Profiles**
```
supabase/migrations/005_profiles.sql             ← profiles table + auth.users trigger
```

**Phase 4 — Constraints & column additions**
```
supabase/migrations/006_checkpoint_grades_attempt_unique.sql  ← unique (uid, node_id, attempt_number)
supabase/migrations/007_tutor_sessions_unique.sql             ← unique (uid, story_id)
supabase/migrations/008_grading_rubrics_unique.sql            ← unique (node_id, criterion)
supabase/migrations/009_user_node_progress_updated_at.sql     ← adds updated_at column
supabase/migrations/010_user_vocab_mastery_last_reviewed.sql  ← adds last_reviewed_at column
```

---

## Testing

```bash
npm test
```

**17 suites · 257 tests · 257 passing**

| Suite | Tests | Coverage |
|---|---|---|
| `branching.test.ts` | 10 | Pure branching logic + DB resolver |
| `queries.test.ts` | 13 | All Supabase query helpers |
| `api/grade-response.test.ts` | 9 | LLM grading route |
| `api/log-interaction.test.ts` | 6 | Interaction log route |
| `api/update-progress.test.ts` | 6 | Node progress route |
| `api/update-mastery.test.ts` | 9 | SRS mastery route |
| `api/sync-vocab.test.ts` | 9 | Vocab bridge route |
| `useNarrativeReader.test.tsx` | 40 | Full hook integration |
| `phase6-ui.test.tsx` | 11 | UI rendering + interaction |
| `useTutorChat.test.tsx` | 12 | Tutor chat hook |
| `rag/embed-single.test.ts` | 14 | Single-record embedding |
| `rag/generate-embeddings.test.ts` | 27 | Batch embedding generator |
| `rag/migration-004.test.ts` | 12 | match_embeddings function |
| `rag/migration-layer4.test.ts` | 38 | RAG layer 4 tables |
| `rag/query-cache.test.ts` | 15 | In-memory query cache |
| `rag/retrieve-chunks.test.ts` | 17 | Chunk retrieval + ranking |
| `rag/sample-queries.test.ts` | 9 | End-to-end RAG query |

---

## API Reference

Full documentation at [`docs/api-reference.md`](docs/api-reference.md).

### NarrVoca Routes — all require `Authorization: Bearer <supabase-jwt>`

**AI Grading**

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/narrvoca/grade-response` | POST | `{ node_id, user_input, target_language }` | `{ accuracy_score, feedback }` |
| `/api/narrvoca/smart-grade` | POST | `{ uid, node_id, user_input, target_language, interaction_id? }` | `{ accuracy_score, feedback, grade_id }` |
| `/api/narrvoca/grading-rubrics` | GET | `?node_id` | rubric array |
| `/api/narrvoca/grading-rubrics` | POST | `{ node_id, criterion, weight, example_correct? }` | `{ rubric_id }` |
| `/api/narrvoca/log-interaction` | POST | `{ uid, node_id, user_input, accuracy_score, llm_feedback? }` | `{ interaction_id }` |

**Progress & Mastery**

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/narrvoca/update-progress` | POST | `{ uid, node_id, status, accuracy_score? }` | progress row |
| `/api/narrvoca/update-mastery` | POST | `{ uid, vocab_id, mastery_score }` | mastery row |

**Tutor System**

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/narrvoca/tutor-chat` | POST | `{ uid, story_id, session_id?, question, target_language }` | `{ reply, session_id, messages[] }` |
| `/api/narrvoca/tutor-sessions` | GET | `?session_id` or `?uid&story_id` | session object |
| `/api/narrvoca/tutor-sessions` | POST | `{ uid, story_id }` | `{ session_id }` |

**Vocabulary**

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/narrvoca/vocab-review` | GET | `?uid&target_language` | `{ due_words[] }` |
| `/api/narrvoca/sync-vocab` | POST | `{ uid, node_id, target_language }` | `{ added[], skipped[] }` |

**RAG Infrastructure**

| Route | Method | Body / Query | Returns |
|---|---|---|---|
| `/api/narrvoca/embed-content` | POST | `{ source_type, source_id, content_text, language_code? }` | embedding stored |
| `/api/narrvoca/cache-rag-chunks` | POST | `{ query_id, chunks[] }` | chunks cached |
| `/api/narrvoca/log-rag-query` | POST | `{ uid, query_text, node_id?, source_type_filter?, top_k? }` | `{ query_id }` |

---

## Branching Logic

| `condition_type` | Behaviour |
|---|---|
| `default` | Always advance (non-checkpoint nodes) |
| `score_threshold` | Advance only if `accuracy_score >= condition_value` |

**Pass threshold:** 0.7

### Spaced Repetition Schedule

| Score | Next review |
|---|---|
| < 0.3 | 1 day |
| 0.3 – 0.59 | 3 days |
| 0.6 – 0.79 | 7 days |
| ≥ 0.8 | 14 days |

---

## Documentation

| File | Description |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System architecture overview |
| [`docs/api-reference.md`](docs/api-reference.md) | Complete API route reference |
| [`docs/NarrVoca_DB_Design_A.pdf`](docs/NarrVoca_DB_Design_A.pdf) | Database design document |
| [`docs/NarrVoca_Figure1_ER_Diagram.png`](docs/NarrVoca_Figure1_ER_Diagram.png) | ER diagram |
| [`docs/NarrVoca_Figure2_Schema_Diagram.png`](docs/NarrVoca_Figure2_Schema_Diagram.png) | Schema diagram |

---

## What's New in NarrVoca-Personal

NarrVoca-Personal is an independent extension of the team v1.0 base, developed by Ruben Aleman. New capabilities added in v2.0+:

- **RAG-enhanced grading** — `smart-grade` retrieves relevant story context via pgvector embedding search and scores responses against configurable per-node rubrics, returning an overall score, narrative feedback, and per-criterion rubric breakdown
- **Grading rubrics** — each checkpoint node supports weighted criteria (`criterion`, `weight`, `example_correct`) stored in `grading_rubrics` and applied by the smart grader
- **Tutor chat system** — a RAG-powered conversational tutor (`tutor-chat`, `tutor-sessions`) answers learner questions in context of the active story, with full multi-turn conversation persistence
- **Vocabulary review** — `vocab-review` surfaces SRS-scheduled due words enriched with RAG-retrieved contextual examples from the story corpus
- **Expanded dashboard** — quiz, reading, speaking, writing, progress, saved, and wordlist pages added beyond the team base
- **RAG infrastructure** — embedding store, `match_embeddings` pgvector function, query cache, and logging layer (`embed-content`, `cache-rag-chunks`, `log-rag-query`)

---

