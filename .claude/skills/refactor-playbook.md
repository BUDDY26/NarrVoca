# Skill: refactor-playbook

A structured approach for any refactoring task in NarrVoca. Refactoring means improving internal structure without changing observable behavior. Follow these steps in order.

---

## Before Starting

1. **Confirm scope** — get explicit agreement on which files are in scope. Do not touch files outside that scope.
2. **Run tests** — `npm test` must be green before any change. If tests are failing, stop and report; do not proceed with refactoring on top of broken tests.
3. **Note the baseline** — record suite/test counts from the passing run.

---

## Invariants — Never Break These

These must remain unchanged after any refactoring:

| Invariant | Location |
|---|---|
| Branching pass threshold = `0.7` | `lib/narrvoca/branching.ts`, API routes |
| SRS intervals (1/3/7/14 days) | `src/pages/api/narrvoca/update-mastery.ts` |
| Embedding model = `text-embedding-3-small` (1536 dims) | `lib/narrvoca/rag.ts`, `scripts/generate-embeddings.ts` |
| Grading model = `gpt-4o-mini` | `src/pages/api/narrvoca/smart-grade.ts`, `grade-response.ts` |
| Auth guard pattern on all narrvoca API routes | `src/pages/api/narrvoca/` |
| API routes remain under `src/pages/api/` (Pages Router) | — |
| `lib/narrvoca/` functions accept supabase/openai via DI | — |

---

## Refactoring Patterns for This Codebase

### Extracting a helper from a route handler
1. Write the helper in `lib/narrvoca/` with supabase/openai as parameters (DI pattern).
2. Import and call it from the route handler — the handler stays in `src/pages/api/narrvoca/`.
3. Write a unit test for the helper in `test/unit/narrvoca/`.
4. Run `npm test` — all 340+ tests must still pass.

### Consolidating duplicate Supabase query logic
1. Move the query to `lib/narrvoca/queries.ts` as a typed function.
2. Replace call sites with the new helper.
3. Update tests in `test/unit/narrvoca/queries.test.ts`.

### Splitting a large hook
`useNarrativeReader.ts` is the central state machine — split with extreme caution.
- Never split auth/accessToken logic from the main hook.
- Never move API fetch calls out of the hook into components.
- If splitting, keep the public hook API identical (same returned fields).

### Updating a shared type
Changes to `lib/narrvoca/types.ts` propagate broadly. After changing an interface:
1. Run `npx tsc --noEmit` to surface all type errors.
2. Fix all call sites before committing.
3. Run `npm test`.

---

## After Each Change

- Run `npm test` — must match or exceed baseline pass count.
- Run `npx tsc --noEmit` — no new type errors.
- Do not commit if either check fails.

---

## What Not To Do

- Do not rename exported functions without updating all import sites.
- Do not change the shape of objects returned from `lib/narrvoca/queries.ts` without updating all consumers and tests.
- Do not consolidate the two router systems (App Router + Pages Router) — the hybrid is intentional.
- Do not touch `components/ui/` during a refactor.
- Do not refactor `app/(auth)/story-generator/` — legacy, hands-off.
- Do not suppress TypeScript errors with `as any` or `@ts-ignore` as a refactoring shortcut.
