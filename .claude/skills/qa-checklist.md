# Skill: qa-checklist

A pre-commit / pre-PR quality gate for NarrVoca. Run through every item before marking any task complete. Do not skip items because a change "seems small."

---

## Run This Checklist

Work through each section in order. For each item: PASS, FAIL (with detail), or N/A (with reason).

---

### 1. Tests

```bash
npm test
```

- [ ] All tests pass
- [ ] Suite count has not decreased (baseline: 25 suites)
- [ ] Test count has not decreased (baseline: 340 tests)
- [ ] If new routes or lib functions were added, new tests were added too

Fail condition: any test failure, any unexplained suite disappearance.

---

### 2. TypeScript

```bash
npx tsc --noEmit
```

- [ ] Zero type errors
- [ ] No `@ts-ignore` or `as any` added without a documented reason

Note: `next.config.mjs` suppresses TS errors on `next build` — this check must be done explicitly via `tsc --noEmit`.

---

### 3. Auth guards

For every new or modified file in `src/pages/api/narrvoca/`:

- [ ] `Authorization: Bearer <token>` extracted from `req.headers.authorization`
- [ ] `supabase.auth.getUser(token)` called before any DB operation
- [ ] `401` returned if `user` is null
- [ ] No DB reads or writes occur before the auth check

---

### 4. Environment variables

- [ ] No new server-only env vars referenced in client-side code
- [ ] If a new env var was added, `.env.local.example` has been updated with the key (empty value)
- [ ] If a new env var was added, README.md env table has been updated

---

### 5. Migration hygiene

For any new file in `supabase/migrations/`:

- [ ] Matching `_rollback.sql` exists
- [ ] DDL uses `IF NOT EXISTS` / `IF EXISTS` guards
- [ ] FKs use `ON DELETE RESTRICT` (or deviation is documented)
- [ ] CLAUDE.md migration status table updated
- [ ] Migration has NOT been auto-applied — user was asked first

---

### 6. Router placement

- [ ] No new files added under `app/api/`
- [ ] All new API handlers follow Pages Router pattern (`(req: NextApiRequest, res: NextApiResponse)`)

---

### 7. Protected areas

- [ ] `components/ui/` files untouched
- [ ] `app/(auth)/story-generator/` and `hooks/story-generator/` untouched
- [ ] `app/(auth)/actions/auth.ts` untouched (unless auth work was explicitly requested)
- [ ] `app/auth/callback/page.tsx` untouched (unless OAuth work was explicitly requested)

---

### 8. Locked constants

Verify these values are unchanged:

- [ ] Branching pass threshold: `0.7`
- [ ] SRS intervals: <0.3→1d, <0.6→3d, <0.8→7d, ≥0.8→14d
- [ ] Embedding model: `text-embedding-3-small`
- [ ] Grading model: `gpt-4o-mini`

---

### 9. Dependency injection (lib/ functions)

For any new function in `lib/narrvoca/`:

- [ ] `supabase` and `openai` (if needed) are received as parameters
- [ ] No direct import-and-call of `supabase` singleton inside the function body

---

### 10. Documentation

- [ ] If a new API route was added: `docs/api-reference.md` updated
- [ ] If a new lib function or hook was added: `docs/architecture.md` layer map updated
- [ ] If a migration was applied: `CLAUDE.md` migration status updated
- [ ] If a new env var was added: both `.env.local.example` and README updated

---

### 11. Commit hygiene

- [ ] Only the files relevant to the task are staged
- [ ] No `.env`, `.env.local`, or secret files staged
- [ ] Commit message describes the "why", not just the "what"

---

## Summary Output

```
## QA Checklist — [date] — [task description]

1. Tests:       PASS / FAIL
2. TypeScript:  PASS / FAIL
3. Auth guards: PASS / N/A
4. Env vars:    PASS / N/A
5. Migrations:  PASS / N/A
6. Router:      PASS / PASS
7. Protected:   PASS / PASS
8. Constants:   PASS / PASS
9. DI pattern:  PASS / N/A
10. Docs:       PASS / N/A
11. Commit:     PASS / FAIL

Overall: READY TO COMMIT / BLOCKED (items N, N)
```
