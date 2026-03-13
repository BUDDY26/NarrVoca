# Skill: documentation

Guidelines for creating and updating documentation in NarrVoca. Do not modify application code when performing documentation tasks.

---

## Existing Documentation Structure

```
docs/
├── architecture.md          ← System architecture, data flow diagrams, layer map
├── api-reference.md         ← All API routes with method, body, response
├── progress-log.md          ← Session-by-session development log
├── tooling.md               ← CI, scripts, Claude Code automation
├── pull-request-description.md ← Template/record for PRs
├── NarrVoca_DB_Design_A.pdf ← Original DB design document (do not regenerate)
├── NarrVoca_Figure1_ER_Diagram.png
├── NarrVoca_Figure2_Schema_Diagram.png
├── NarrVoca_PromptLog_PartA.pdf
└── Final Report.pdf
```

---

## Which Document To Update

| Trigger | Update |
|---|---|
| New API route added | `docs/api-reference.md` |
| New table or migration applied | `docs/architecture.md` (layer map, ER relationships) |
| New lib function or hook | `docs/architecture.md` (layer map) |
| New session of significant work | `docs/progress-log.md` |
| New tooling or CI change | `docs/tooling.md` |
| New env var required | `.env.local.example` + README.md env table |
| Major architectural decision made | `docs/architecture.md` + `CLAUDE.md` |
| Migration status changes | `CLAUDE.md` (migration status table) |

---

## API Reference Format

When documenting a new NarrVoca API route, use this format:

```markdown
### `POST /api/narrvoca/<route-name>`

**Auth:** `Authorization: Bearer <supabase-jwt>` required.

**Body:**
| Field | Type | Description |
|---|---|---|
| `field_name` | `type` | Description |

**Response:**
| Field | Type | Description |
|---|---|---|
| `field_name` | `type` | Description |

**Errors:**
| Status | Condition |
|---|---|
| 401 | Missing or invalid token |
| 400 | Missing required fields |
| 500 | DB or AI service error |
```

---

## Architecture.md Format

- Use ASCII flow diagrams (the existing style uses `─`, `│`, `▼`, `├─`, `└─`).
- Keep the layer map table current — add new rows for new lib files.
- Add new FK relationships to the "Key Relationships" section when new migrations are applied.

---

## Progress Log Format

Each session entry:

```markdown
## Session N — YYYY-MM-DD

### What Was Accomplished
- Bullet list of completed work, grouped by phase or feature

### Files Changed
| File | Change |
|---|---|
| `path/to/file.ts` | Short description |

### Tests
N suites · N tests · N passing

### Next Steps (if session is paused)
- What remains
```

---

## README.md

The README contains:
- Feature table (add rows for major new features)
- Tech stack table (update if new AI services or libraries are added)
- DB schema tables (update if new migrations are applied)
- API reference summary table (keep in sync with `docs/api-reference.md`)
- Test count (update when suites/count changes significantly)

The README is the public-facing document — keep it accurate but do not add implementation details that belong in `docs/architecture.md`.

---

## CLAUDE.md

Update `CLAUDE.md` when:
- A migration status changes (applied / pending)
- A new locked constant is introduced
- A new protected file or area is identified
- A new pattern becomes a convention (e.g., a new mock pattern in tests)

Keep `CLAUDE.md` concise — it is loaded into every session context. Do not add prose explanations; prefer tables and bullet points.

---

## What Not To Do

- Do not modify PDF files — they are submitted course deliverables.
- Do not rename existing doc files — they are referenced in README.md.
- Do not create a new doc file if an existing one is the right home for the content.
- Do not duplicate content between `docs/architecture.md` and `docs/api-reference.md`.
