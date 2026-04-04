# Release Procedure

> **Trigger:** "Run the release procedure" or "Prepare a release"
> Steps through pre-release checks and produces a release-ready state.
> Do not tag or push until every step passes.

---

## Step 1 — Run QA

Run the QA checklist skill in full. Do not proceed if any of the following are open:

- Uncovered source files
- Failing tests
- Unfilled `{{PLACEHOLDER}}` tokens in any file
- Structure validation failures

---

## Step 2 — Verify Documentation

| Check | Pass? |
|-------|-------|
| `README.md` is accurate and complete | |
| `docs/architecture.md` reflects current implementation | |
| `docs/runbooks/operations.md` setup steps are verified | |
| At least one ADR documents a key design decision | |
| `CLAUDE.md` Sections 1–9 and 12 are filled in (no placeholders) | |

If any item fails, stop and fix it before continuing.

---

## Step 3 — Review Commit History

Review the commit history via the repository hosting platform (GitHub, GitLab, etc.) or IDE git panel.

Check that:

- Commit messages are descriptive (not "fix", "wip", "temp")
- No accidental commits of `.env`, secrets, or binary artifacts
- No debug code or commented-out blocks remain in `src/`

---

## Step 4 — Final Validation

```bash
bash scripts/validate-structure.sh --strict
```

All items must pass. Warnings are not acceptable for a tagged release.

---

## Step 5 — Tag the Release

Once all steps above pass, ask the user to tag the release manually via the CLI or hosting platform using:

- Tag name: `v{{VERSION}}` (e.g. `v1.0.0`)
- Message: `Release v{{VERSION}}: {{RELEASE_NOTE}}`

> **Do not tag or push** until the user explicitly confirms all steps above have passed.

---

## Release Report Output Format

```
## Release Report: [project name] — [date]

### QA
[Pass / list of blockers]

### Documentation
[Pass / list of gaps]

### Commit History
[Clean / list of issues]

### Structure Validation
[Pass / FAIL with details]

### Status
READY TO TAG | BLOCKED
[One sentence. If blocked, name the first item to fix.]
```
