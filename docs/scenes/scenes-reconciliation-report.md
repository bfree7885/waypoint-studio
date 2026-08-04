# Scenes — First Complete Reconciliation Report

**Date:** 2026-08-03  
**Repository:** `bfree7885/waypoint-studio` (`/home/bryan/Projects/waypoint-studio`)  
**Branch:** `docs/scenes-reconciliation-2026-08-03` (docs-only)  
**Base:** `origin/main` @ `59c09debbe8d9c7d36acf74607bd4ebfa55359fc`  
**Scope:** Integration / analysis only — **no feature invention, no merge to main, no deploy**  
**Companion:** [`scenes-owner-review.md`](./scenes-owner-review.md)

---

## 1. Executive verdict

Scenes already has strong live craft tools (Photo Coach, Photo Library, Hidden Landscapes) on production, plus several **unmerged** foundation branches that together describe a coherent product — but they disagree on the **product door**, **Remember placement**, and **whether Scene Library exists yet**.

This report picks **one canonical architecture** and **one user journey**, maps every reviewed branch onto that shape, and recommends a merge order that reconciles conflicts without inventing new product surfaces.

---

## 2. Production snapshot (2026-08-03)

| Item | Value |
|------|--------|
| `origin/main` tip | `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` |
| Live site build meta | `waypoint-build` / `wds-build.js?v=` **`59c09de`** on https://waypointstudio.org/ |
| Pages last-modified (home) | 2026-07-26 (GitHub Pages) |
| Global Scenes nav | `apps/scenes/` |
| Clarity route `/scenes/` | Redirects to **`/apps/photo-coach/`** (not the hub) |
| `/apps/scenes/remember/` | **404** on live (Remember not merged) |
| Scene Library routes | **Absent** on live |

Live probes (HTTP 200 unless noted): `/apps/scenes/`, `/scenes/`, `/apps/photo-coach/`, `/apps/waypoint-scenes/`, `/apps/photo-library/`; Remember hub **404**.

**Production honesty gap:** hub journey still promotes Create / Scene Builder / Profile under “Later” while Living Scenes remains preview-only; `/scenes/` skips the hub and jumps to Coach. Turnaround Sprint 5 fixed that honesty **on a branch only** (not on main).

---

## 3. Branch map (reviewed)

### 3.1 Required review set

| Branch | Tip SHA | Ahead of main | Behind main | Relationship |
|--------|---------|---------------|-------------|--------------|
| `origin/main` (production) | `59c09de` | — | — | Live SoT |
| `feature/scenes-sprint1-four-pillar-foundation` | `e8258e1` | 3 | 36 | Forked from older main `63fc457` |
| `feature/scenes-sprint3-scene-library` | `89129f4` | 5 | 36 | **Contains Sprint 1** |
| `feature/scenes-remember-pillar-foundation` | `ec5a03f` | 4 | 0 | Forked from **current** main; **does not** contain Sprint 1/3 |
| `turnaround/sprint-05-scenes-surface-cleanup` | `8e4d54e` | 370* | 0 | Based on current main; *mostly live-engine publish commits* |

\* Meaningful Scenes work on turnaround is a short non-publish chain ending at `5934b52` (`fix(turnaround): align Scenes surface with available tools only`), plus earlier turnaround fixes (`7f2681b`, `3901080`, `6db767a`). Do **not** merge the publish-noise tip wholesale.

### 3.2 Related unmerged work (listed, not invented)

| Branch / artifact | Tip / note | Role |
|-------------------|------------|------|
| `feature/scenes-photo-coach-2-architecture` | `9ae7891` (contains Sprint 3) | Learn architecture: 11-section review model + provider contract |
| `feature/rc4-platform-sprint1-unified-experience` | `0b019db` (contains Sprint 3) | Platform chrome / tokens / density; not Scenes IA |
| `feature/scenes-sprint4-scene-native-photo-coach` (local) | Tip = Sprint 3; **real work in stash** `stash@{3}` | Scene-native Coach handoff (uncommitted) |
| `feature/scenes-portfolio-foundation` | Portfolio purpose foundation | SELECT/BUILD adjacent |
| `feature/scenes-portfolio-assistant` | Explainable candidate assistant | SELECT adjacent |
| `feature/scenes-portfolio-coach` | Comparative portfolio coaching | SELECT adjacent |
| `feature/scenes-auto-portfolio-builder` | Auto portfolio builder | BUILD adjacent |
| `feature/scenes-portfolio-health` / `…-website-output` | Later portfolio outputs | BUILD adjacent |
| Learn “unified pillar” branch | **Never created** | Remember owner review explicitly parked this |
| Sprint 2 `feature/scenes-sprint2-photo-coach-experience` | **Does not exist** | Sprint 3 noted this; branched from Sprint 1 instead |

Stashes preserved (untouched by this sprint): dashboard tile-catalog WIP, SVG placeholders, RC4 audit doc, Sprint 4 scene-native.

---

## 4. Dependency graph

```text
origin/main @ 59c09de  ===========================  LIVE / PRODUCTION
        │
        ├─ turnaround/sprint-05… (honesty hub; CSS vendor; demote legacy)
        │     meaningful: … → 5934b52   [+ publish noise on tip]
        │
        └─ feature/scenes-remember-pillar-foundation @ ec5a03f
              Remember under /apps/scenes/remember/
              (independent of Sprint 1/3 — will conflict on nav/hub language)

older main @ 63fc457
        │
        └─ Sprint 1 @ e8258e1
              │  hub → /apps/waypoint-scenes/
              │  Coach SoT → /apps/photo-coach/
              │  CREATE / REMEMBER stubs / EXPLORE overview
              │
              └─ Sprint 3 @ 89129f4
                    │  Scene Library + Shoot Review Workspace
                    │  ingest API + Scene/Photo model
                    │
                    ├─ Photo Coach 2.0 @ 9ae7891
                    ├─ RC4 platform @ 0b019db
                    └─ (stash) Sprint 4 scene-native Coach
```

**Critical integration fact:** Remember and Sprint 1/3 are **sibling lines**, not a stack. Merging both without a reconciliation pass will produce two Remember homes and two Scenes doors.

---

## 5. What each branch actually delivered

### 5.1 Production (`main`)

- Hub: `/apps/scenes/` journey (“Review today’s shoot”, import, choose best, Learn articles, Explore HL).
- Live tools: Photo Coach, Photo Library, Hidden Landscapes.
- Legacy studio still reachable: `/apps/waypoint-scenes/` (Coach JS library + early Living Scene studio).
- `/scenes/` → Photo Coach (bypasses hub).
- No Scene Library product; no Remember product; Portfolio routes absent.

### 5.2 Sprint 1 — four-pillar foundation

- Declares `/apps/photo-coach/` sole consumer Coach SoT; removes embedded Coach host from `waypoint-scenes`.
- Moves product door to **`/apps/waypoint-scenes/`** with LEARN / CREATE / REMEMBER / EXPLORE pillars.
- Redirects `/apps/scenes/` and `/scenes/` → waypoint-scenes.
- Softens grade/assignment consumer language; CREATE at `waypoint-scenes/create/`; REMEMBER stub at `waypoint-scenes/remember/`.

### 5.3 Sprint 3 — Scene Library

- Durable **Scene + Photo** model, local index, search/sort, folder/drag ingest, Importer payload contract (`WaypointSceneIngest`).
- Routes under `waypoint-scenes`: `library/`, `scene/?id=`, plus foundation `portfolio/`, `export/`, `remember/`, `create/`.
- Photo Coach gains honest `?sceneId=` banner only (not yet Scene-native load).
- Landing CTA: **Open Scene Library**.

### 5.4 Remember pillar foundation

- Canonical hub **`/apps/scenes/remember/`** + type placeholders + `RememberDocument` + print stubs.
- Legacy redirect: `waypoint-scenes/remember/` → scenes Remember.
- Intentionally **not** based on Sprint 3 Scene model (scene-awareness deferred).

### 5.5 Turnaround Sprint 5 — surface cleanup

- Keeps **`/apps/scenes/`** as canonical live hub.
- Demotes Living Scenes / Scene Builder / Profile; labels `waypoint-scenes` legacy; names Portfolio + Outdoor Journals as absent.
- Vendors Photo Coach CSS into `apps/photo-coach/css/` (decouple from monolith CSS path).
- Documents internal four-pillar vision without claiming it as live capability.

### 5.6 Photo Coach 2.0 (related)

- Architecture under `apps/waypoint-scenes/js/photo-coach-2/` + `apps/photo-coach/review-v2/`.
- Eleven-section education review + provider plug-in contract; **not** wired into live Shoot Review yet.

### 5.7 RC4 (related)

- Studio chrome / design-token / Dashboard density unification on top of Sprint 3.
- Platform concern; should not redefine Scenes IA. Coordinate with parallel dashboard agents — do not fight their files in a Scenes merge.

---

## 6. Canonical architecture (one SoT)

### 6.1 Product shape

**One product: Scenes** — local-first photography craft for outdoor looking.

| Layer | Canonical home | Notes |
|-------|----------------|-------|
| Product shell / journey home | `/apps/scenes/` | Matches production + turnaround + Remember |
| Media catalog | `/apps/photo-library/` | IndexedDB originals + collections |
| Shoot / Scene catalog | Scene Library (Sprint 3 implementation) | Canonical URL: **`/apps/scenes/library/`** (redirect or relocate from `waypoint-scenes/library/`) |
| Learn | `/apps/photo-coach/` | Sole Coach host; Coach 2.0 is next Learn schema |
| Create | Living Scenes studio | Implementation today: `waypoint-scenes/create/`; shell link from hub |
| Remember | `/apps/scenes/remember/` | Remember foundation SoT |
| Explore | `/apps/hidden-landscapes/` (+ Animal Vision family) | Keep experimental labeling |
| Engine / shared JS | `apps/waypoint-scenes/js/` | Library for Coach + Scene model until a later package split |
| Legacy combined studio UI | `/apps/waypoint-scenes/` index | **Not** the product door; keep labeled legacy/preview |

**Rejected as product door:** making `/apps/waypoint-scenes/` the global Scenes home (Sprint 1 choice). Keep Sprint 1’s Coach SoT, language cleanup, and CREATE path; **invert** the door back to `/apps/scenes/`.

### 6.2 Shared data model

| Model | Owner module | Role |
|-------|--------------|------|
| **Scene + Photo** | Sprint 3 `scene-models` / `scene-store` (`waypoint-scene-library-index-v1`) | Durable shoot identity everything plugs into |
| **Photo Library media** | `apps/photo-library/` IndexedDB | Original blobs + library index |
| **Coach sessions / shoots** | existing Coach keys | Promote into Scene via `ingestFromExistingShoot`; eventually Scene-native |
| **RememberDocument** | `apps/scenes/remember/js/remember-model.js` | Journals/calendars/books; `photoRefs` (+ later `sceneId`) |
| **Coach 2 ReviewDocument** | `photo-coach-2/schema.js` | Education review sections; write status back onto Scene |

Importer never owns Scenes UI. It calls **`WaypointSceneIngest.ingestFromImporterPayload`** only.

### 6.3 Shared navigation (recommended)

Single Scenes feature nav (hub + local + platform registry aligned):

1. Today → `/apps/scenes/`
2. Photo Library → `/apps/photo-library/`
3. Scene Library → `/apps/scenes/library/` (→ implementation)
4. Learn / Review a shoot → `/apps/photo-coach/`
5. Create → Living Scenes (`…/create/`)
6. Remember → `/apps/scenes/remember/`
7. Explore → `/apps/hidden-landscapes/`

Global primary **Scenes** link → **`apps/scenes/`** (not Coach, not waypoint-scenes).  
Clarity **`/scenes/`** → **`/apps/scenes/`** (stop Coach bypass).

### 6.4 Shared services

| Service | Canonical |
|---------|-----------|
| Scene ingest | `WaypointSceneIngest` (Sprint 3) |
| Scene query/UI | `scene-engine` + library/detail UIs |
| Coaching analysis | `apps/waypoint-scenes/js/photo-coach*.js` consumed by `/apps/photo-coach/` |
| Coach 2 composer/providers | `photo-coach-2/*` (wire later) |
| Remember model/print | `apps/scenes/remember/js/*` |
| Engine facades | `apps/scenes/js/engines/*` (thin; do not fork business logic) |

---

## 7. Canonical user journey

```text
Importer  →  Photo Library  →  Scene Library  →  Learn  →  Create  →  Remember  →  Explore
   │              │                 │              │         │           │            │
 desktop       catalog          durable         Coach     Living     Outdoor      Hidden
 Waypoint      originals        Scene +         review    Scenes     Journals     Landscapes
 Importer      + collections    Photo model     (no grades) studio    / print      (experimental)
```

| Step | User intent | Canonical route | Availability today |
|------|-------------|-----------------|--------------------|
| Importer | Bring card / folder in | Desktop Importer → ingest contract | Bridge stub / contract on Sprint 3; E2E incomplete |
| Photo Library | Keep originals locally | `/apps/photo-library/` | **Live on main** |
| Scene Library | Every shoot becomes a Scene | `/apps/scenes/library/` | **On Sprint 3 only** |
| Learn | Understand photographs | `/apps/photo-coach/` | **Live**; Coach 2.0 architecture unmerged |
| Create | Atmosphere / living still | CREATE studio | Preview on main; studio on Sprint 1/3 path |
| Remember | Keep / print lasting records | `/apps/scenes/remember/` | **Foundation branch only** |
| Explore | Other ways of seeing | `/apps/hidden-landscapes/` | **Live (experimental)** |

This journey **extends** the four-pillar craft loop (Learn → Create → Remember → Explore) with the two catalog steps the product now requires (Photo Library + Scene Library). It does not invent Portfolio/Select/Build as required journey steps — those remain optional companions after Scene Library lands.

---

## 8. Obsolete routes, duplicate UI, overlapping components

### 8.1 Recommend remove or demote (docs recommendation; not applied in this sprint)

| Item | Issue | Recommendation |
|------|-------|----------------|
| `/scenes/` → Photo Coach | Duplicate door; skips hub | Redirect to `/apps/scenes/` |
| Global Scenes → Coach (historical) | Already fixed on main → `apps/scenes/`; Sprint 1 reverts to waypoint-scenes | Keep main/turnaround door; do not re-apply Sprint 1 nav home |
| `/apps/waypoint-scenes/` as hub | Conflicts with production + Remember | Legacy studio only |
| `/apps/scenes/` → waypoint-scenes redirect (Sprint 1) | Destroys production hub | Do not take this redirect |
| Dual Remember homes | `apps/scenes/remember/` vs `waypoint-scenes/remember/` stub | Canonical scenes path; alias redirect only |
| Dual Living Scenes | `apps/scenes/living-scenes/` preview vs `waypoint-scenes/create/` | One CREATE target; preview pages redirect or label |
| Dual Scene Builder naming | `scene-builder/` vs Living Scenes CREATE | Prefer CREATE / Living Scenes; demote Scene Builder label |
| Embedded Coach on waypoint-scenes | Removed in Sprint 1; still a risk if old tips ship | Never reintroduce |
| Portfolio public links without product | 404 risk | Keep absent until SELECT/BUILD merge |
| Coach CSS dual path | Monolith vs vendored (turnaround) | Prefer `apps/photo-coach/css/` after turnaround lands |

### 8.2 Overlapping components to consolidate (later implementation)

- Coach analysis JS living under `waypoint-scenes` while shell is `photo-coach` — OK short-term; document as shared library.
- `apps/scenes/js/engines/*` stubs vs real modules in tool apps — keep engines as facades only.
- Sprint 3 `waypoint-scenes/remember/` foundation vs Remember pillar pages — merge Remember pillar UI; Scene-aware wiring after Sprint 3.
- Multiple persistence schemas (Coach shoots, library, Scene index, Remember docs) — unify via Scene id refs, not a rewrite.

### 8.3 Duplicate navigation — recommendation only

Do **not** ship both:

- Sprint 1 pillar nav (Scenes door = waypoint-scenes), and
- Production/turnaround nav (Scenes door = apps/scenes), and
- Remember-only nav patches on main without Scene Library.

**Canonical nav map (target):**

```text
Platform Scenes → /apps/scenes/
  ├─ Photo Library
  ├─ Scene Library
  ├─ Photo Coach (Learn)
  ├─ Living Scenes (Create)
  ├─ Outdoor Journals (Remember)
  └─ Hidden Landscapes (Explore)
```

Code changes for nav dedupe were **not** applied on this docs branch (would require choosing among unmerged feature tips and would fight parallel dashboard work). Apply on the first integration branch that rebases Sprint 1/3 onto main with the hub inversion above.

---

## 9. Recommended merge order

> Goal: land honesty + catalogs + pillars without a big-bang rewrite.  
> Rebase/replay onto current `main`; resolve hub conflicts toward `/apps/scenes/`.

| Order | Merge / integrate | Why |
|------:|-------------------|-----|
| 0 | **This docs branch** (already) | Shared map for owners/agents |
| 1 | **Turnaround Sprint 5 Scenes commits only** (`5934b52` chain, **exclude** live-engine publish tip) | Honesty gate + Coach CSS vendor on current main |
| 2 | **Sprint 1** (rebase) with **hub inversion** | Coach SoT, grade language, CREATE path — keep `/apps/scenes/` door |
| 3 | **Sprint 3 Scene Library** | Durable Scene model unlocks the journey |
| 4 | **Remember foundation** (rebase onto post–Sprint 3) | Keep `/apps/scenes/remember/`; add `sceneId` / photoRefs to Scene |
| 5 | **Photo Coach 2.0 architecture** | Learn schema ready before Scene-native wiring |
| 6 | **Sprint 4 scene-native** (recover stash → branch) | Coach reads/writes Scene; stop re-upload |
| 7 | **RC4 platform** (careful; after or beside dashboard consolidation) | Chrome/tokens only; no IA fork |
| 8 | **Portfolio suite** (foundation → assistant → coach → auto-builder) | Only after Scene Library is the selection substrate |

**Do not merge** turnaround tip `8e4d54e` as-is (publish noise).  
**Do not merge** Sprint 1/3 before deciding the hub inversion — otherwise production nav flips to waypoint-scenes.

---

## 10. Migration plan (phased)

### Phase A — Honesty on main (Turnaround Scenes commits)

- Hub bands: Available / Experimental / Future.
- Demote legacy studio promotion.
- Vendor Coach CSS.
- Tests: `automation/test-scenes-surface-cleanup.mjs`.

### Phase B — Door + Learn integrity (Sprint 1 replay)

- Keep `/apps/scenes/` as shell.
- Apply Coach SoT + consumer language cleanup.
- Point CREATE to Living Scenes studio; EXPLORE to Hidden Landscapes.
- Change `/scenes/` → `/apps/scenes/`.
- Drop Sprint 1 redirects that orphan the production hub.

### Phase C — Scene Library (Sprint 3)

- Ship Scene model + library + detail workspace.
- Expose canonical `/apps/scenes/library/` (redirect from `waypoint-scenes/library/` acceptable v1).
- Wire hub journey: Photo Library → Scene Library → Learn.
- Keep Portfolio/Export foundations behind honest labels.

### Phase D — Remember (rebase)

- Retain Remember pages under `/apps/scenes/remember/`.
- Replace Sprint 1/3 Remember stubs with Remember pillar UI.
- Attach documents to Scene/photo refs.

### Phase E — Learn depth

- Coach 2.0 provider/schema behind review-v2, then replace legacy critique UI.
- Scene-native Coach (Sprint 4 stash).
- Importer → ingest E2E when Importer is ready (contract already locked).

### Phase F — Create / Explore polish

- Single CREATE entry; retire confusing Scene Builder CTA.
- Keep Explore experimental honesty.

### Phase G — Optional SELECT/BUILD

- Portfolio branches only after Scene Library is the substrate.

---

## 11. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hub fork (`apps/scenes` vs `waypoint-scenes`) | **High** | Canonical shell = `apps/scenes`; waypoint-scenes = engines + studio impl |
| Remember vs Sprint 3 independent bases | **High** | Rebase Remember after Sprint 3; one Remember URL |
| Sprint 1/3 36 commits behind main | **High** | Rebase/replay; expect nav + homepage + dashboard conflicts — isolate Scenes paths |
| Turnaround tip polluted with publish commits | **High** | Cherry-pick Scenes commits only |
| Dual persistence / no Scene id on Coach yet | Medium | Sprint 4; avoid second library |
| Coach 2.0 not wired to live UI | Medium | Architecture merge ≠ UX cutover |
| RC4 + dashboard parallel agents | Medium | Scenes merges avoid Dashboard/platform ownership fights |
| Portfolio branches advertise absent tools | Medium | Keep out of nav until Phase G |
| Demo analysis vs “AI coach” expectation | Medium | Honesty copy; Coach 2 evidence citations |
| Stash-only Sprint 4 | Medium | Recover stash to a branch before it ages |
| Live `/scenes/` Coach bypass | Low/Med | Fix with Phase B redirect |

---

## 12. Test anchors (per branch)

| Branch | Notable automation |
|--------|--------------------|
| main / audit era | Photo Coach shoot review, profile, HL, library suites |
| Sprint 1 | `test-scenes-sprint1-foundation.mjs` (53) |
| Sprint 3 | `test-scenes-sprint3-scene-library.mjs` (96) |
| Remember | `test-scenes-remember-pillar.mjs` |
| Turnaround | `test-scenes-surface-cleanup.mjs` |
| Coach 2.0 | `test-photo-coach-2-architecture.mjs` |

Re-run the relevant suite after each merge phase; full platform CI before any production deploy (out of scope here).

---

## 13. Explicit non-goals of this reconciliation

- No merge to `main`
- No deploy to waypointstudio.org
- No new product features
- No Dashboard / platform consolidation edits
- No stash dropping; no fighting parallel agents’ WIP

---

## 14. Confirmation

| Action | Status |
|--------|--------|
| Analysis complete | Yes |
| Docs committed on `docs/scenes-reconciliation-2026-08-03` | Yes (this file + owner review) |
| Application code rewritten | **No** |
| Merged to main | **No** |
| Deployed | **No** |
