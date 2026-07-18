# SignalTerrain — Architecture Changelog

**Status:** Living log  
**Purpose:** Record architecture-significant changes so roadmap, decisions, and code stay synchronized.

Roadmap: [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md) · Architecture: [SIGNALTERRAIN-ARCHITECTURE.md](SIGNALTERRAIN-ARCHITECTURE.md) · Decisions: [DECISIONS.md](DECISIONS.md)

---

## 2026-07-18 — Master engineering roadmap established

- Added living docs: `SIGNALTERRAIN-ROADMAP.md`, `SIGNALTERRAIN-ARCHITECTURE.md`, `DECISIONS.md`, `CHANGELOG-ARCHITECTURE.md`.
- Adopted milestone-driven sequencing from Foundation → Public Preview (ADR-009).
- Progress annotated against Work Blocks 1–9 (foundation through Operations Workspace).

---

## 2026-07-18 — Cyber Operations Workspace V1 (Milestone 6)

- Research kinds extended: `investigation`, `watchlist`, `activity` (+ investigation/queue/note fields).
- Runtime: `wds-signalterrain-cyber-workspace.js` · UI: `cyber/workspace.html`.
- Layout prefs: `st_cyber_workspace_layout_v01` (chrome only; content remains shared research store).
- Platform systems catalog updated (investigations, watchlists, reading-queue, notes, search → foundation).

---

## 2026-07-18 — Platform hardening (Work Block 8 / Milestone 1 quality)

- Shared `wds-signalterrain-util.js`; graph entity ownership fixed; ingest HTML escape corrected.
- Cyber nav chrome moved toward foundation CSS; peer links aligned.
- Review suite: architecture, debt, scalability, UX, performance, accessibility, hardening.

---

## 2026-07-18 — Defensive Knowledge Platform V0.1 (Milestone 4 start)

- Encyclopedia, playbooks, incident library, learning paths, knowledge map, unified search.
- Knowledge objects reference `cy_*` via `subjectIds` — no forked CVE models.

---

## 2026-07-18 — Adaptive Defense Advisor (Milestone 3 / 7)

- Security profiles, inventory matching, exposure analysis, cyber seasons, daily advisor.
- Simulation remains architecture-only (no fake confidence).

---

## 2026-07-18 — Cyber Terrain Map & Intelligence Explorer (Milestone 5 start)

- Shared graph UI, timeline, coarse privacy-preserving map, research actions.

---

## 2026-07-18 — Daily Cyber Intelligence Briefing Engine (Milestone 7 start)

- Calm, explainable briefs; audience profiles; transparent priority contributions.
- Sample scenario JSON (generation-at-runtime recommended before scale).

---

## 2026-07 — Cyber ingestion pipeline V0.1 (Milestone 1 / prep for 2)

- Connector scaffolds, normalization, provenance, cache, health UI (mock only).

---

## 2026-07 — Cyber Awareness Intelligence Engine foundation (Milestone 1)

- Entity/relationship schemas, priority factors, sample teaching cases, explainability fields.

---

## Earlier 2026-07 — SignalTerrain / Signal Intelligence foundations

- Topic + relationship models, living knowledge graph demos, UIO/summary prototypes, platform systems catalog, workspaces catalog.
- Vision and permanent non-goals established.
