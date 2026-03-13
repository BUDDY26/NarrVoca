# Skill: entry-protocol

Perform a structured repository entry scan at the start of a new session or when re-orienting after a long break. Do not modify any code. Output a structured report only.

---

## Steps

### 1. Git state
- Run `git status` and `git log --oneline -10`.
- Note current branch, any uncommitted changes, and the shape of recent commits.
- Flag anything unexpected (untracked migration files, staged changes, detached HEAD).

### 2. Test suite health
- Run `npm test -- --passWithNoTests 2>&1 | tail -20` to confirm suite count and pass/fail.
- Report: suites, tests, pass count. Flag any failures immediately.
- Expected baseline: 25 suites · 340 tests · 340 passing.

### 3. Router split integrity check
- Confirm API routes exist only under `src/pages/api/` — not under `app/api/`.
- Confirm `app/(auth)/dashboard/narrative/page.tsx` exists (primary reader page).
- Confirm `app/(auth)/story-generator/` is untouched (legacy Vocora feature — hands-off).

### 4. Migration status check
- List all files under `supabase/migrations/`.
- Cross-reference against the known applied/pending table in CLAUDE.md.
- Flag any migration files that are present but not reflected in CLAUDE.md.
- Note: `004_match_embeddings_fn.sql` is a known pending migration — it is intentional, not a bug.

### 5. Environment template check
- Confirm `.env.local.example` is present and reflects all keys in use.
- Do NOT read or output the contents of `.env`, `.env.local`, or any real secret file.

### 6. Protected files presence check
Confirm these files exist (do not read contents unless the task requires it):
- `lib/supabase.ts`
- `lib/narrvoca/types.ts`
- `lib/narrvoca/queries.ts`
- `hooks/narrvoca/useNarrativeReader.ts`
- `src/pages/api/narrvoca/smart-grade.ts`

### 7. Summary report
Output the following sections:
- **Git state**: branch, clean/dirty, last commit
- **Test suite**: pass/fail counts
- **Open tasks from MEMORY.md**: list any items marked as not yet applied or not yet done
- **Flags**: anything unexpected found in steps 1–6
- **Ready to proceed**: yes/no, and why if no

---

## What Not To Do
- Do not run the dev server.
- Do not run migration scripts.
- Do not run embedding or seed scripts.
- Do not modify any file.
