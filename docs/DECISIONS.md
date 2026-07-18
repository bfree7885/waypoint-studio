# SignalTerrain — Architecture Decisions

**Status:** Living decision log  
**Scope:** SignalTerrain (and Signal Intelligence contracts it consumes)  
**Format:** Short ADRs — context, decision, consequences  

Roadmap: [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md) · Architecture: [SIGNALTERRAIN-ARCHITECTURE.md](SIGNALTERRAIN-ARCHITECTURE.md)

---

## ADR-001 — SignalTerrain is the UI home; not a second Studio product

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Cyber awareness could become its own Studio nav app.  

**Decision:** Cyber (and future RF/Infrastructure/Research tools) live **under SignalTerrain**. Signal Intelligence remains the shared awareness engine.  

**Consequences:** One product IA; nav entries are SignalTerrain features; no “Cyber Studio” fork.

---

## ADR-002 — Educational and defensive only

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Security tools often drift into scanning, offense, or SOC workflows.  

**Decision:** Permanent non-goals include SIEM, EDR, vulnerability scanning, exploit payloads, and offensive tooling. Workspace is a field notebook, not a SOC.  

**Consequences:** Features that conflict must be redesigned or rejected.

---

## ADR-003 — One shared research store for RF and Cyber

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Notes/bookmarks/collections could be duplicated per domain.  

**Decision:** Single `st_research_workspace_v01` via `WDS.signalTerrainResearch` for bookmarks, notes, collections, queue, investigations, watchlists, activity.  

**Consequences:** No isolated note systems; domain is a field, not a separate database.

---

## ADR-004 — Link intelligence by id; do not fork entity models

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Knowledge, brief, advisor, and workspace each need CVE/campaign/product data.  

**Decision:** Canonical `cy_*` graph + `subjectIds` / `memberIds` references from knowledge and research items.  

**Consequences:** Surfaces stay synchronized; enrichment happens in one graph package.

---

## ADR-005 — Transparent priority; no black-box scores

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Users need to trust “why this is urgent.”  

**Decision:** Priority engine exposes labeled factors and contributions; briefs and advisor must show explainability (known/likely/possible/unknown).  

**Consequences:** Hidden ML ranking and opaque urgency are forbidden.

---

## ADR-006 — Local-first personal state; layout chrome may use a separate key

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Dashboard layout prefs are not content.  

**Decision:** Personal **content** stays in the research store. Panel order/visibility may use `st_cyber_workspace_layout_v01` only. Catalog all keys in `STORAGE_KEYS`.  

**Consequences:** Privacy reviews stay tractable; no second content silo.

---

## ADR-007 — Mock ingestion before live connectors

**Date:** 2026-07  
**Status:** Accepted  

**Context:** Need provenance, cache, and health contracts before network trust.  

**Decision:** Ship mock connectors + normalization/provenance schemas first; Milestone 2 adds narrow cited live sources with graceful failure.  

**Consequences:** No fake “live threat” theatre; audit trail designed early.

---

## ADR-008 — Graph entities are immutable after `createGraph`

**Date:** 2026-07-18  
**Status:** Accepted  

**Context:** Reassigning `graph.entities` desynced indexes.  

**Decision:** Read-only `entities` getter + `listEntities()`; rebuild via `createGraph(bundle)` when data changes.  

**Consequences:** Safer multi-surface consumption.

---

## ADR-009 — Milestone-driven engineering

**Date:** 2026-07-18  
**Status:** Accepted  

**Context:** Ad-hoc feature sprints risk architecture drift.  

**Decision:** Select work from [SIGNALTERRAIN-ROADMAP.md](SIGNALTERRAIN-ROADMAP.md) milestones; each milestone ends with the release checklist and living-doc updates.  

**Consequences:** Predictable sequencing; “next feature” proposals must map to a milestone.

---

## ADR-010 — MPA + shared IIFE services for now

**Date:** 2026-07  
**Status:** Accepted (revisitable at Milestone 8–10)  

**Context:** Framework rewrites consume calendar without fixing data boundaries.  

**Decision:** Keep multi-page HTML + `WDS.*` IIFEs until interaction/sync complexity demands modules/SPA. Prefer shared util and view-model extraction first.  

**Consequences:** Lower rewrite risk; script load order must stay documented.
