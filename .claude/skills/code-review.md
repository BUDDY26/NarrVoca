# Skill: code-review

Review staged or specified changes for correctness, security, and consistency with NarrVoca conventions. Do not modify any code. Output a structured review report.

---

## Invocation

If the user specifies files or a diff, review those. Otherwise review all staged changes via `git diff --cached` and unstaged changes via `git diff`.

---

## Review Checklist

### Auth guard (API routes only)
Every handler in `src/pages/api/narrvoca/` must:
- Extract `Authorization: Bearer <token>` from `req.headers.authorization`
- Call `supabase.auth.getUser(token)` and return `401` if `user` is null
- Perform no DB operations before the auth check passes

Flag any route missing this guard. Flag any route that reads `req.body` before verifying auth.

### Router placement
- API handlers belong in `src/pages/api/` — Pages Router pattern with `(req, res)` signature
- Page components belong in `app/` — App Router pattern
- Flag any new file in `app/api/` or any RSC being used as an API handler

### Dependency injection (lib/ functions)
New functions in `lib/narrvoca/` must accept `supabase` and `openai` as parameters — no module-level singleton calls inside library functions. Flag any function that imports and calls `supabase` directly at the top level of a lib file rather than receiving it as a parameter.

### Environment variable access
- Server-only keys (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) must never appear in client-side code (`'use client'` components, hooks, or files under `app/` that are not Server Components).
- `NEXT_PUBLIC_` variables are intentionally public — no flag needed.
- Flag any non-public env var referenced in a client-side file.

### Locked constants
These values must not change without explicit instruction:
- Branching pass threshold: `0.7`
- SRS intervals: <0.3→1d, <0.6→3d, <0.8→7d, ≥0.8→14d
- Embedding model: `text-embedding-3-small` (1536 dims)
- Grading model: `gpt-4o-mini`

Flag any change to these values.

### Migration safety
- New SQL in `supabase/migrations/` must have a matching `_rollback.sql`
- DDL must use `IF NOT EXISTS` / `IF EXISTS` guards
- FKs should use `ON DELETE RESTRICT` unless there is a documented reason otherwise
- Flag any migration without a rollback file

### Test coverage
- New API routes should have a corresponding test suite in `test/unit/narrvoca/api/`
- New lib functions should have tests in `test/unit/narrvoca/`
- New hooks should have tests in `test/unit/narrvoca/`
- Flag any new public function or route with no corresponding test file

### components/ui/ guard
Flag any hand-edits to files under `components/ui/` — these are shadcn/ui primitives and should never be modified manually.

### story-generator guard
Flag any changes to `app/(auth)/story-generator/`, `hooks/story-generator/`, or related components — this is the legacy Vocora feature, preserved as-is.

---

## Output Format

```
## Code Review — [date]

### Auth guards
[PASS / FLAG: description]

### Router placement
[PASS / FLAG: description]

### Dependency injection
[PASS / FLAG: description]

### Environment variable access
[PASS / FLAG: description]

### Locked constants
[PASS / FLAG: description]

### Migration safety
[PASS / FLAG: description]

### Test coverage
[PASS / FLAG: description]

### Protected area guards
[PASS / FLAG: description]

### Summary
[Overall: PASS / NEEDS ATTENTION]
[List of flags, if any]
```
