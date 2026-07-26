# Turnaround Roadmap — Waypoint Studio (2026-07)

**Based on:** production SHA `59c09de`, audit evidence under `docs/audits/evidence/2026-07/`, score **63/100**.

## Strategy recommendation

**Continue, but consolidate.** Spreading engineering across Dashboard expansion, Scenes portfolio, Living Scenes, Sheds heatmaps, and Importer polish in parallel produced an unfinished public surface area.

### Sequence (evidence-based)

1. **Repair production foundation** (links language, headers, dead weight, operator exposure).
2. **Finish Dashboard** (ship the already-implemented 32-tile catalog branch after gate).
3. **Stabilize Importer** (eject + Scenes handoff).
4. **Build Scenes around import→review→portfolio** (not Living Scenes first).
5. **Sheds decision point** — maintenance only until then.

### Stop / hide / pause

| Item | Action |
| --- | --- |
| Living Scenes as product path | Keep preview but remove from “primary create” claims until real |
| Outdoor Journals messaging | Do not advertise until a route exists |
| Portfolio suite | Do not link from production nav until merged |
| Legacy Scene Builder promotion | Demote; extract CSS deps then archive monolith later |
| Sheds feature expansion | Pause new features; fix map reliability only |
| Incubator apps | Keep reachable; never equal primary nav |
| Multiple Dashboard eras in loader | Stop shipping; archive in repo |

### Principles

- One canonical implementation per product.
- No visible placeholders / Coming Soon catalog entries.
- Live-site verification after every deploy (`build-info` SHA).
- Functional depth before category breadth (Dashboard exception: catalog branch already built — ship it).
- Fewer active feature branches; merge or delete.
- Explicit completion gates below.

---

## Sprint roadmap (10 sprints)

### Phase A — Stabilize

#### Sprint A1 — Production foundation hotfix
- **Objective:** Remove public embarrassment and operator exposure without product expansion.
- **Includes:** P1-008, P1-007 (triage), P2-003, P2-006, P2-007, P2-013 (nav framing), P3-006/007 as time allows.
- **Scope:** Support copy; favicon; security headers via Pages/`_headers` or meta strategy; status/debug exclusion or gate; Sheds map smoke triage; nav maturity labels.
- **Excludes:** Dashboard catalog merge; Scenes portfolio; Importer features.
- **Deps:** None.
- **Acceptance:** Support has no “Coming later”; favicon 200; status/debug not publicly listed/fetchable or gated; headers present on HTML; Sheds map either reliably tiles or shows honest basemap error.
- **Tests:** Link crawl; header probe; Sheds browser smoke.
- **Gate:** Owner reviews screenshots of Support, Home, Sheds map.

#### Sprint A2 — Canonical loader & Scenes surface cleanup
- **Objective:** One Dashboard code path shipped; stop promoting legacy Scenes.
- **Includes:** P1-002, P2-004, P2-005, P2-008, P2-014, P3-004.
- **Scope:** Trim `wds.js` Home path to Rebuild + required services; extract Photo Coach CSS from monolith; demote waypoint-scenes links; unify cache-bust; fix stale docs pointers.
- **Excludes:** Deleting historical dashboard folders from git (archive OK).
- **Acceptance:** Network waterfall shows no OS/V2/V3 script fetches on `/`; Coach independent of monolith CSS import; docs name Rebuild canonical.
- **Gate:** Bundle size delta documented; Home smoke green.

---

### Phase B — Complete Dashboard

#### Sprint B1 — Ship functional tile catalog
- **Objective:** Production Dashboard becomes a real multi-category workspace.
- **Includes:** P1-001 (merge `feature/dashboard-functional-tile-catalog` after gate).
- **Scope:** Merge 32-tile catalog, category customize, defaults, tests, owner review, deploy, live verify.
- **Excludes:** New external APIs; eBird/aurora/etc.
- **Deps:** A1 recommended first (not hard-blocking).
- **Acceptance:** Live catalog ≥24 tiles, 9 categories, no Coming Soon; mobile full-width held; production SHA matches merge.
- **Gate:** Clean-browser verify `/` and `/apps/dashboard/`.

#### Sprint B2 — Dashboard reliability hardening
- **Objective:** Fewer false Unavailable tiles; cleaner trust labels.
- **Includes:** P1-006, P2-001, P2-002, P2-009.
- **Scope:** Local sunrise/sunset; alerts empty trust; remove moonrise noise; customize DOM audit.
- **Acceptance:** Light family works on NWS fallback; empty alerts show empty not Waiting.
- **Gate:** Provider-fallback fixture tests + live spot check.

#### Sprint B3 — Dashboard RC polish
- **Objective:** Dashboard release candidate quality.
- **Includes:** Perf check post-trim; a11y pass on customize; Today Outside usefulness pass.
- **Acceptance:** Scorecard Dashboard ≥80; documented RC.
- **Gate:** Owner sign-off “Dashboard RC”.

---

### Phase C — Stabilize Importer

#### Sprint C1 — Import integrity
- **Objective:** Card→library path trustworthy and tested.
- **Includes:** P2-011, P2-012.
- **Scope:** Safe eject UX; Python automated tests for detect/copy/ledger; docs.
- **Excludes:** Cloud sync redesign.
- **Gate:** Test suite green on Linux host.

#### Sprint C2 — Importer → Scenes handoff
- **Objective:** Close the workflow gap.
- **Includes:** P1-005.
- **Scope:** Wire importer bridge to Photo Coach Shoot Review; E2E script.
- **Acceptance:** Import → open shoot → queue visible without manual re-upload.
- **Gate:** Recorded demo + automated test.

---

### Phase D — Real Scenes workflow

#### Sprint D1 — Portfolio production slice
- **Objective:** One portfolio path live from Library/Coach sessions.
- **Includes:** P1-003 (thin slice).
- **Scope:** Merge minimal Portfolio Foundation + Assistant **or** Builder — not all five surfaces at once.
- **Excludes:** Living Scenes animation; Journals.
- **Gate:** Production routes 200; no 404 portfolio links from Scenes hub.

#### Sprint D2 — Journals or Living Scenes decision
- **Objective:** Resolve Remember/Create pillars honestly.
- **Includes:** P1-004, P2-010.
- **Scope:** Pick **one**: Outdoor Journals MVP **or** Living Scenes motion MVP; demote the other explicitly.
- **Gate:** Updated feature matrix + nav copy match reality.

#### Sprint D3 — Scenes a11y + mobile craft pass
- **Objective:** Coach/Library usable keyboard + small phone.
- **Includes:** P3-010 partial.
- **Gate:** Checklist pass documented.

---

### Phase E — Sheds decision

#### Sprint E0 — Sheds audit decision
- **Objective:** Repair vs rebuild vs demote.
- **Includes:** Residual of P1-007; P2-013.
- **Scope:** Written decision with milestone definition (“Today’s Search v1”) or nav demotion.
- **Excludes:** New model features until decision.
- **Gate:** Owner chooses: repair / rebuild / demote.

---

## First sprint to execute

**A1 — Production foundation hotfix.**

Why: lowest risk, removes public unfinished language and operator exposure, improves trust before shipping the large Dashboard catalog merge.

---

## Completion gates (platform-level)

| Gate | Criteria |
| --- | --- |
| G0 Stabilized | A1+A2 done; score ≥66; no P1 from foundation list open |
| G1 Dashboard complete | B1–B3 done; Dashboard score ≥80; catalog live |
| G2 Import loop | C1+C2 done; handoff demo recorded |
| G3 Scenes coherent | D1+D2 done; no 404 portfolio; pillars honest |
| G4 Sheds decided | E0 done; nav matches maturity |
