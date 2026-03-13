# NarrVoca — Tooling and Automation

This document covers developer tooling, CI setup, and Claude Code configuration for the NarrVoca repository.

---

## Test Suite

```bash
npm test
```

Runs Jest unit tests under `test/unit/`. 25 suites · 340 tests as of 2026-03-13.

| Runner | Config | Coverage |
|---|---|---|
| Jest 30 | `jest.config.js` (CommonJS) | `test/unit/narrvoca/**` |
| Cypress 14 | `cypress.config.ts` (gitignored — local only) | `test/cypress/e2e/` |

The CI pipeline (`.github/workflows/ci.yml`) runs `npm test` only. Cypress E2E is local-only.

---

## CI — GitHub Actions

File: `.github/workflows/ci.yml`

Trigger: every push and pull request to `main`.
Action: install dependencies → run `npm test`.

This is the minimum viable CI gate. It does not lint, build, or deploy — Vercel handles deployment automatically on push to `main` via its own GitHub integration.

---

## Scripts

Scripts that interact with the production database. **Run manually with explicit intent only.**

| Script | Command | Effect |
|---|---|---|
| `scripts/generate-embeddings.ts` | `npx tsx scripts/generate-embeddings.ts` | Generates and upserts vector embeddings into `embedding_store` |
| `scripts/seed-rubrics.ts` | `npx tsx scripts/seed-rubrics.ts` | Seeds grading rubrics for "En el Mercado" (idempotent) |

Both scripts require `SUPABASE_SERVICE_ROLE_KEY` (service role, bypasses RLS) and `OPENAI_API_KEY`.

---

## Claude Code Configuration

### CLAUDE.md

`CLAUDE.md` at the repository root is loaded automatically at the start of every Claude Code session. It contains:
- Architecture summary and router split
- Protected areas
- Coding conventions and locked constants
- Test and package manager requirements

### .claude/ directory

`.claude/` is **gitignored** (see `.gitignore` line: `.claude/`). Contents are local-only.

Current contents:
```
.claude/
└── settings.local.json    ← Bash permission allow-list (local only)
```

Future additions (pending decision):
```
.claude/
├── settings.local.json
├── skills/                ← custom slash commands (if .claude/ is unignored)
└── hooks/                 ← event-triggered shell commands (if .claude/ is unignored)
```

**Decision required:** whether to remove `.claude/` from `.gitignore` to version-control skills and hooks. See the summary at the bottom of this file.

---

## Portfolio Automation Structure — Phase 1 (2026-03-13)

This was the first migration phase. No application code was changed.

### Files Added

| File | Purpose |
|---|---|
| `CLAUDE.md` | Root Claude Code instructions — auto-loaded each session |
| `docs/tooling.md` | This file — tooling and automation reference |
| `.github/workflows/ci.yml` | Minimal CI — runs `npm test` on push/PR to main |

### Files Left Unchanged

All existing application code, tests, migrations, docs, and configuration were left untouched.

---

## .claude/ Tracking Decision

The `.gitignore` entry `# claude code local settings` / `.claude/` means skills and hooks created there are not committed and are not portable. Options:

| Option | Tradeoff |
|---|---|
| Keep `.claude/` gitignored | Skills/hooks are personal and local-only. Simpler for solo use. |
| Remove from `.gitignore` | Skills/hooks are version-controlled and portable. Requires reviewing `settings.local.json` for secrets before committing. |

This decision should be made before creating `.claude/skills/` or `.claude/hooks/`.
