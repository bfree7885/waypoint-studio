# Watchlists

**Workspace kind:** `watchlist` (`rw_*`)  
**UI:** `workspace.html#watchlists`

---

## Purpose

Reusable watches for products, vendors, technologies, campaigns, industries, OS families, languages, and research topics.

When the current intelligence sample contains a match, the workspace surfaces it with a **plain-language explanation** of why it matched.

This is **not** live detection, alerting, or IDS.

---

## Matching (explainable)

`Research.matchWatchlist(watchlist, entities)` considers:

1. Exact `watchTargetIds` / `subjectIds`
2. `watchKinds` (entity kinds such as `affected-software`, `threat-campaign`)
3. Optional free-text `query` against title/summary/kind

Each hit includes `reasons[]` and an `explanation` sentence suitable for UI display.

---

## Relationship to priority engine

Priority factor language may mention “owner interest.” Watchlists and bookmarks are the concrete local preference objects — not a separate scoring silo.
