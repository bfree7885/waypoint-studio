# Waypoint University — Knowledge & Relationship Model

**Schema:** `1.3.0`

---

## Node (knowledge object)

| Field | Notes |
|-------|-------|
| `id` | `wu_…` |
| `kind` | See kinds below |
| `title` | Required for UX |
| `body` | Markdown |
| `summary` | Optional one-line |
| `tags[]` | Free tags |
| `categories[]` | Optional facets |
| `projects[]` | Project lane ids (“Projects using this”) |
| `pathId` | Optional convenience pointer |
| `status` | `active` / `draft` / `archived` |
| `pinned` / `bookmarked` | Surfaces |
| `sourceUrl` | External reference |
| `mediaIds[]` | → media store |
| `review` | `{ enabled, dueAt, intervalDays }` — future SRS |
| `question` | `{ status, confidence, evidence, resolution, sources[] }` |
| `source` | `{ citation, authors, year, readingStatus, confidence }` |
| `research` | `{ stage, nextAction, conclusions }` |
| `queue` | `{ reading, researchInbox, focusToday }` |
| `learning` | `{ stageManual, confidence, openCount, searchHits, lastStudiedAt }` |
| `annotations[]` | `{ id, type, text, quote, linkedNodeId, createdAt }` |
| `session` | Research session payload |
| `field` | Field note context / place |
| `reliability` | Personal source assessment |
| `thinking` | Thinking-tool foundation payload |
| `capture` | Provenance for quick capture |
| `meta` | Extensible bag |
| `createdAt` / `updatedAt` / `lastOpenedAt` | ISO timestamps |

### Understanding stages

`discovered` · `exploring` · `practicing` · `applying` · `connecting` · `teaching` · `mastering`

Inferred from use; `learning.stageManual` overrides. Never grades.

### Annotation kinds

`highlight` · `margin` · `definition` · `question` · `concept` · `future`

### Kinds

topic · concept · article · paper · research-note · book · course · video · podcast · website · document · manual · project · idea · question · experiment · observation · definition · reference · path · capture · media · person · place · code · checklist · task · session · field-note · hypothesis · decision · argument · concept-map

**Source kinds:** book · paper · article · document · manual · video · podcast · website · course

### Meta (store)

| Key | Purpose |
|-----|---------|
| `learningGoals` | Long-term goals shaping next steps |
| `recentViews` | Recently opened node ids |
| `lastWriteAt` | Fingerprint input for insight cache |

---

## Edge (relationship)

Unchanged from Block 2 — related, structure, application, evidence, citation, inquiry, tension groups. Link picker uses `LINK_PICKER`.

---

## Research stages

Capture idea → Collect sources → Summarize → Extract concepts → Link → Identify questions → Record conclusions → Suggest further research

Optional — never forced.

---

## Questions / sources / projects

Questions remain first-class. Sources carry citation + reading status. `projects[]` + Projects panel = living intelligence hubs (Block 3).
