# Waypoint University — Work Block 2 Changelog

**Status:** Uncommitted — owner review  
**Do not commit / do not push until requested**

---

## Product

- Home redesigned as an **active learning dashboard** (continue, gaps, hubs, questions, new links, queues, today’s focus).
- **Interactive neighborhood graph** with depth, relationship-group filters, click-to-recenter, double-click to open.
- **Knowledge health** opportunities (unconnected, review, duplicates, broken links, thin definitions, stale research, unanswered questions).
- **Research workflow** board by stage; **Sources** desk with citation/reading fields.
- **Questions** carry status, confidence, evidence, resolution.
- **Projects** open as living maps (all / questions / sources).
- **Search** adds related results, follow-ups, and recently viewed.

## Engine / schema

- Schema **1.1.0** — expanded relations, source kinds, question/research/queue models.
- `wu-graph.js`, `wu-health.js` modules.
- Store: richer node normalize + `recentViews` meta.

## Explicitly still deferred

- Spaced repetition UI, AI tutoring, flashcards, quizzes, public sharing.
- Whole-corpus force graph; media blob backup.

## Honest V1.0 gap

Block 2 makes University feel like a **private research environment**. V1.0 still wants media/backup completeness, merge tooling, scale hardening, and optional review — see roadmap.
