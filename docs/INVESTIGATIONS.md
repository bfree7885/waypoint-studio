# Investigations

**Workspace kind:** `investigation` (`rw_*`)  
**UI:** `workspace.html#investigations`

---

## Purpose

An investigation is a **topic notebook** — Browser Security, Linux Hardening, Patch Tuesday, Ransomware Trends, and similar literacy projects.

Not a ticket, not an incident case file, not an IR workflow.

---

## Model

Stored in the shared research workspace:

| Field | Role |
|-------|------|
| `title` / `body` | Markdown notebook |
| `investigationStatus` | `open` · `paused` · `completed` · `archived` |
| `tasks[]` | Checklist items |
| `subjectIds[]` | Links to `cy_*` (and other) intelligence |
| `citationIds[]` | Links to `source-entry` research items |
| `relatedInvestigationIds[]` | Cross-investigation links |
| `attachmentRefs[]` | Future-ready local refs (empty in V1) |

Templates: `intelligence/cyber/workspace/investigation-templates.json`.

---

## Graph integration

Investigations **reference** shared entities; they do not copy CVE/campaign records. Opening related intelligence uses Explorer entity links.

Notes can point back via `relatedInvestigationIds` or shared `subjectIds`.

---

## Activity

Creating or updating investigations records `activity` items for the personal timeline.
