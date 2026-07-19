# Waypoint University — Knowledge & Relationship Model

**Schema:** `1.1.0`

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
| `capture` | Provenance for quick capture |
| `meta` | Extensible bag |
| `createdAt` / `updatedAt` / `lastOpenedAt` | ISO timestamps |

### Kinds

topic · concept · article · paper · research-note · book · course · video · podcast · website · document · manual · project · idea · question · experiment · observation · definition · reference · path · capture · media · person · place · code · checklist · task

**Source kinds:** book · paper · article · document · manual · video · podcast · website · course  

Every kind can link to every other kind. Folders are optional — **links are primary**.

---

## Edge (relationship)

| Field | Notes |
|-------|-------|
| `id` | `wue_…` |
| `fromId` / `toId` | Node ids |
| `type` | Relation vocabulary id |
| `note` | Optional |
| `createdAt` | ISO |

### Relationship vocabulary (thinking language)

| Id | Label | Group |
|----|-------|-------|
| `relates-to` | Related concepts | related |
| `learn-before` | Prerequisites | structure |
| `continue-with` | Continue with | structure |
| `builds-upon` / `built-upon-by` | Builds upon | structure |
| `contradicts` / `contradicted-by` | Contradicts | tension |
| `has-example` / `example-of` | Examples | evidence |
| `used-in` / `uses` | Applications | application |
| `referenced-by` / `references` | Referenced by | citation |
| `questions` / `answered-by` | Questions about / Potential answers | inquiry |
| `future-research` / `researched-from` | Future research | inquiry |
| `studied-with` | Frequently studied together | related |
| `part-of` / `contains` | Part of | structure |
| `defines` / `defined-by` | Defines | structure |
| `observes` / `observed-in` | Observes | evidence |
| `implements` / `implemented-by` | Implements | application |
| `mentions` / `mentioned-in` | Mentions | citation |
| `evidence-for` / `has-evidence` | Evidence | evidence |

Link picker shows the outbound-friendly subset (`LINK_PICKER`).

---

## Research stages

Capture idea → Collect sources → Summarize → Extract concepts → Link → Identify questions → Record conclusions → Suggest further research  

Optional — never forced.

---

## Questions

First-class nodes (`kind: question`) with status `open` | `investigating` | `answered` | `parked`, confidence 0–5, evidence, resolution. Connect via `questions` / `answered-by` / `evidence-for`.

---

## Sources

Source kinds carry citation metadata and reading status (`unread` | `reading` | `finished` | `reference`). Architecture allows future fetch/OCR automation without requiring it now.

---

## Projects

`projects[]` on any node + Projects panel = living maps (all knowledge, questions, sources per lane).
