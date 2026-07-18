# Notes

**Workspace kind:** `note` (`rw_*`)  
**UI:** `workspace.html#notes`

---

## Purpose

Private, local-first notes integrated with the shared knowledge graph.

Supports:

- Markdown (lite renderer)
- Links to intelligence via `subjectIds`
- Tags
- Checklists (`checklist[]` and/or Markdown `- [ ]`)
- Citations (via related `source-entry` / investigation `citationIds`)
- Cross-references (`relatedInvestigationIds`, `cross-reference` kind)
- Version history (`versions[]` — prior bodies retained on save)
- Search (workspace unified search indexes note title/body/tags)

---

## Bidirectional linking

| Direction | How |
|-----------|-----|
| Note → intelligence | `subjectIds` |
| Intelligence → notes | `Research.notesForSubject(id)` / search by subject |
| Note → investigation | `relatedInvestigationIds` |

Saving through `updateNote()` appends the previous body to `versions` and records an activity event.

---

## Privacy

Notes default to `private: true` and stay in `localStorage`. No remote sync in V1.
