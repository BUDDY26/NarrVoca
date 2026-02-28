# NarrVoca — API Reference

All NarrVoca routes live under `/api/narrvoca/` and follow the existing Pages Router pattern.

**Authentication:** Every NarrVoca route requires a valid Supabase session token in the `Authorization` header:
```
Authorization: Bearer <supabase-access-token>
```
Returns `401 Unauthorized` if the token is missing or invalid.

---

## POST `/api/narrvoca/grade-response`

Grades a user's free-text response using GPT-4o-mini. Fetches the node's prompt text as grading context.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `node_id` | number | Yes | The story node being responded to |
| `user_input` | string | Yes | The user's free-text response |
| `target_language` | string | Yes | `'es'` or `'zh'` |

### Response `200 OK`

```json
{
  "accuracy_score": 0.87,
  "feedback": "Great job! Your verb conjugation was correct. Watch the accent on 'está'."
}
```

| Field | Type | Description |
|---|---|---|
| `accuracy_score` | number | 0.0 – 1.0 (clamped). ≥ 0.7 = pass |
| `feedback` | string | One or two encouraging sentences from the LLM |

### Error Responses

| Code | Condition |
|---|---|
| `400` | Missing `node_id`, `user_input`, or `target_language` |
| `401` | No valid auth token |
| `405` | Non-POST method |
| `500` | DB error or OpenAI error |

---

## POST `/api/narrvoca/log-interaction`

Writes one row to `interaction_log`. Called after every checkpoint submission.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | string | Yes | User UUID |
| `node_id` | number | Yes | The node that was responded to |
| `user_input` | string | Yes | The user's raw text |
| `accuracy_score` | number | Yes | 0.0 – 1.0 score from grading |
| `llm_feedback` | string | No | Feedback text from grading (or `null`) |

### Response `201 Created`

```json
{ "interaction_id": 42 }
```

### Error Responses

| Code | Condition |
|---|---|
| `400` | Missing required fields |
| `401` | No valid auth token |
| `405` | Non-POST method |
| `500` | DB insert error |

---

## POST `/api/narrvoca/update-progress`

Upserts a row in `user_node_progress`. Called on both Continue (non-checkpoint) and Submit (checkpoint).

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | string | Yes | User UUID |
| `node_id` | number | Yes | Node being progressed |
| `status` | string | Yes | `'not_started'`, `'in_progress'`, or `'completed'` |
| `accuracy_score` | number | No | Sets `best_score` if provided |

### Response `200 OK`

```json
{
  "uid": "abc-123",
  "node_id": 3,
  "status": "completed",
  "best_score": 0.87,
  "completed_at": "2026-02-28T12:00:00.000Z"
}
```

### Error Responses

| Code | Condition |
|---|---|
| `400` | Missing `uid`, `node_id`, or `status` |
| `401` | No valid auth token |
| `405` | Non-POST method |
| `500` | DB upsert error |

---

## POST `/api/narrvoca/update-mastery`

Upserts a row in `user_vocab_mastery` and sets the next spaced-repetition review date.

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | string | Yes | User UUID |
| `vocab_id` | number | Yes | Vocabulary word ID |
| `mastery_score` | number | Yes | 0.0 – 1.0 accuracy score |

### Response `200 OK`

```json
{
  "uid": "abc-123",
  "vocab_id": 5,
  "mastery_score": 0.87,
  "next_review_at": "2026-03-14T12:00:00.000Z"
}
```

### SRS Intervals

| Score | Next review |
|---|---|
| < 0.3 | 1 day |
| 0.3 – 0.59 | 3 days |
| 0.6 – 0.79 | 7 days |
| ≥ 0.8 | 14 days |

### Error Responses

| Code | Condition |
|---|---|
| `400` | Missing `uid`, `vocab_id`, or `mastery_score` |
| `401` | No valid auth token |
| `405` | Non-POST method |
| `500` | DB upsert error |

---

## POST `/api/narrvoca/sync-vocab`

Syncs the node's **target vocabulary** (`is_target = true`) into the user's Vocora `vocab_words` table. This bridges the NarrVoca `vocabulary` dictionary with the original Vocora word list so learned words appear in the story-generator word picker.

Words already in the user's list are skipped (no duplicates inserted).

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `uid` | string | Yes | User UUID |
| `node_id` | number | Yes | Node whose target vocab to sync |
| `target_language` | string | Yes | `'es'` or `'zh'` |

### Response `200 OK`

```json
{
  "added": ["mercado", "dinero"],
  "skipped": ["precio"]
}
```

| Field | Type | Description |
|---|---|---|
| `added` | string[] | Words inserted into `vocab_words` |
| `skipped` | string[] | Words already present (not duplicated) |

### Error Responses

| Code | Condition |
|---|---|
| `400` | Missing `uid`, `node_id`, or `target_language` |
| `401` | No valid auth token |
| `405` | Non-POST method |
| `500` | Any DB error |

---

## Vocora Routes (unchanged)

These are the original Vocora API routes. None require auth headers.

| Route | Method | AI Provider | Description |
|---|---|---|---|
| `/api/generate-story` | POST | OpenAI | Generate a story from a word list |
| `/api/generate-definitions` | POST | OpenAI | Get word definition + translation |
| `/api/generate-full-audio` | POST | OpenAI TTS | Text-to-speech for a story |
| `/api/generate-image` | POST | Fireworks AI | Generate an image for a story |
| `/api/chat-box` | POST | Gemini | Support chatbot responses |
| `/api/writing_prac` | POST | Gemini | Writing practice feedback |

---

## Query Helpers (`lib/narrvoca/queries.ts`)

Client-side library functions used by hooks and server components.

| Function | Returns | Description |
|---|---|---|
| `getStories()` | `Story[]` | All stories |
| `getStoryById(id)` | `Story` | Single story |
| `getNodesByStoryId(id)` | `StoryNode[]` | Nodes ordered by `sequence_order` |
| `getNodeText(nodeId)` | `NodeText[]` | All text rows for a node |
| `getBranchingRules(nodeId)` | `BranchingLogic[]` | All branching rules for a node |
| `getNodeVocab(nodeId)` | `NodeVocabulary[]` | Vocabulary links for a node |
| `getFullStory(id)` | `FullStory` | Story + all nodes + all text (3 round-trips) |
