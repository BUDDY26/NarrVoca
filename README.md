# NarrVoca

**Narrative-driven vocabulary acquisition for Spanish and Mandarin learners.**

NarrVoca is a full-stack language-learning web application that extends the original Vocora platform with an adaptive **Narrative Reader** — branching, multilingual short stories that grade written responses in real time with GPT-4o-mini, track vocabulary mastery via spaced repetition, and automatically sync learned words into the user's Vocora word list.

> **Course:** CSCI 6333 — Database Systems, University of Houston, Spring 2026
> **Team:** Ruben Aleman (@BUDDY26), Silvia Osuna (@mozzarellastix), Andrea Garza
> **Deployed:** [vocora.vercel.app](https://vocora.vercel.app)

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
| Testing | Jest (unit, 85 tests) + Cypress (E2E) |
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
│   │   └── types.ts                   ← TypeScript interfaces
│   └── supabase.ts                    ← Supabase client
├── src/pages/api/
│   ├── narrvoca/
│   │   ├── grade-response.ts          ← LLM grading
│   │   ├── log-interaction.ts         ← Interaction logging
│   │   ├── sync-vocab.ts              ← Vocab bridge to vocab_words
│   │   ├── update-mastery.ts          ← SRS mastery upsert
│   │   └── update-progress.ts         ← Node progress upsert
│   └── generate-story.ts              ← Vocora story generation
├── supabase/migrations/
│   ├── 001_narrvoca_extension.sql     ← 11 new tables + 6 indexes
│   ├── 002_seed_sample_story.sql      ← "En el Mercado" seed story
│   └── ...rollback + verify SQL
├── test/unit/narrvoca/                ← 85 Jest unit tests
└── docs/                              ← ER diagram, schema, reports, API docs
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project with migrations applied
- OpenAI API key
- Google Generative AI (Gemini) API key

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
```

### Install and Run

```bash
npm install
npm run dev
# Open http://localhost:3000
```

### Apply Database Migrations

Run these in order in the Supabase SQL editor:

```
supabase/migrations/001_narrvoca_extension.sql   ← creates 11 tables + indexes
supabase/migrations/002_seed_sample_story.sql    ← seeds "En el Mercado"
supabase/migrations/002_seed_verify.sql          ← verify row counts
```

---

## Testing

```bash
npm test
```

**8 suites · 85 tests · 85 passing**

| Suite | Tests | Coverage |
|---|---|---|
| `branching.test.ts` | 12 | Pure branching logic + DB resolver |
| `queries.test.ts` | 15 | All Supabase query helpers |
| `api/grade-response.test.ts` | 8 | LLM grading route |
| `api/log-interaction.test.ts` | 6 | Interaction log route |
| `api/update-progress.test.ts` | 6 | Node progress route |
| `api/update-mastery.test.ts` | 10 | SRS mastery route |
| `api/sync-vocab.test.ts` | 8 | Vocab bridge route |
| `useNarrativeReader.test.tsx` | 20 | Full hook integration |

---

## API Reference

Full documentation at [`docs/api-reference.md`](docs/api-reference.md).

### NarrVoca Routes — all require `Authorization: Bearer <supabase-jwt>`

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/narrvoca/grade-response` | POST | `{ node_id, user_input, target_language }` | `{ accuracy_score, feedback }` |
| `/api/narrvoca/log-interaction` | POST | `{ uid, node_id, user_input, accuracy_score, llm_feedback? }` | `{ interaction_id }` |
| `/api/narrvoca/update-progress` | POST | `{ uid, node_id, status, accuracy_score? }` | progress row |
| `/api/narrvoca/update-mastery` | POST | `{ uid, vocab_id, mastery_score }` | mastery row |
| `/api/narrvoca/sync-vocab` | POST | `{ uid, node_id, target_language }` | `{ added[], skipped[] }` |

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
| [`docs/progress-log.md`](docs/progress-log.md) | Full development session log |
| [`docs/architecture.md`](docs/architecture.md) | System architecture overview |
| [`docs/api-reference.md`](docs/api-reference.md) | Complete API route reference |
| [`docs/NarrVoca_DB_Design_A.pdf`](docs/NarrVoca_DB_Design_A.pdf) | Database design document |
| [`docs/NarrVoca_Figure1_ER_Diagram.png`](docs/NarrVoca_Figure1_ER_Diagram.png) | ER diagram |
| [`docs/NarrVoca_Figure2_Schema_Diagram.png`](docs/NarrVoca_Figure2_Schema_Diagram.png) | Schema diagram |
| [`docs/NarrVoca_PromptLog_PartA.pdf`](docs/NarrVoca_PromptLog_PartA.pdf) | AI prompt engineering log |

---

## License

Academic project — CSCI 6333, University of Houston, Spring 2026.
