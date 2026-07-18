# Reading Queue

**Workspace kind:** `queue-item` (`rw_*`)  
**UI:** `workspace.html#queue`

---

## Purpose

A structured reading list for cybersecurity literacy — not an alert inbox.

Each item may include:

| Field | Meaning |
|-------|---------|
| `estimateMinutes` | Time budget |
| `priority` | `low` · `normal` · `high` |
| `readingStatus` | `unread` · `reading` · `done` · `deferred` |
| `difficulty` | `intro` · `intermediate` · `advanced` |
| `subjectIds` | Linked intelligence |
| `relatedInvestigationIds` | Linked notebooks |
| `body` | Personal notes / intent |
| `sourceClass` / citations | Via related source entries |

Filters: status, difficulty (topic tags via search).

Completing an item records a `reading-completed` activity for the personal timeline.

---

## Helpers

`Research.addQueueItem(title, opts)` · `Research.setReadingStatus(id, status)`
