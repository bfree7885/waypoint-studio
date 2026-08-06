# Waypoint Studio — RC1 Project Audit

**Date:** 2026-08-05 (UTC 2026-08-06)
**Branch audited:** `feature/outdoor-intelligence-engine` @ `a99789c`
**Working-tree note:** Waypoint Daily composer exists uncommitted in the workspace at audit time; ratings below treat it as **in-flight**, not shipped.
**Method:** Code and docs review of primary surfaces, shared platform layers, CI, automation inventory, and prior RC1 debt registers. No production deploy in this block.
**Authority:** `docs/PRODUCT_STANDARDS.md`, `docs/ENGINEERING-PLAYBOOK.md`, Rebuild Home IA (`docs/rebuild-2026/`).

---

## Recommendation

| Gate | Verdict |
| --- | --- |
| **RC1 (closed beta / invite)** | **Ready with Conditions** |
| **Public Version 1.0** | **Hold** |

Conditions and blockers are listed in §10 and in [`waypoint-studio-rc1-owner-review.md`](./waypoint-studio-rc1-owner-review.md).

---

## 1. Product map (what RC1 actually is)

Primary nav (`design-system/js/platform/wds-app-nav-config.js` v2.2.0-home-rc1):

**Home · Scenes · Sheds · Articles · About**

Supporting (reachable, not primary): ForageCast, Fieldry, Landscape Interpretation.
Incubator / quiet: SignalTerrain, Steepleaf, Savant. Volunteer is live but demoted from primary chrome.

The seven-room aspirational model (Learn / Create / Remember / Explore as first-class rooms) in `docs/ECOSYSTEM-BLUEPRINT.md` is **not** the shipped IA. RC1 must be judged against the Rebuild three-product map plus Articles and About.

---

## 2. Surface-by-surface review

### 2.1 Dashboard / Home — **Shipped (Rebuild)**

| | |
| --- | --- |
| Entry | `/` and `/apps/dashboard/` share `apps/dashboard/js/home-boot.js` |
| Stack | Rebuild shell: Today Outside → workspace widgets → deepeners (timeline, featured photo, Scenes/Sheds intros) |
| Strengths | Progressive shell; OIP hydrate after safe place; honest trust chips; Customize; no Outdoor OS mount on root |
| Gaps | `wds.js` still loads **167** modules including V2/V3/Outdoor OS leftovers on the Home critical path (HD-1); Waypoint Daily is WIP above the fold in the dirty tree |
| Tests | `test-home-rc1.mjs`, `test-dashboard-rebuild-phase{1,2,3}.mjs` (**not in CI**); stale `test-dashboard-today-outside.mjs` still asserts Outdoor OS (**is in CI**) |

### 2.2 Articles — **Shipped**

| | |
| --- | --- |
| Entry | `/articles/`, `data/articles/articles.json`, `/feeds/waypoint-*.xml` |
| Strengths | Curated RSS pipeline; 12h refresh; copyright/attribution policy; Dashboard Field Notes ranking via shared recommendation engine; production review documented |
| Gaps | Feed-metadata summaries (by design); category pages historically thinner than hub; hub copy still mixed “Dashboard/Home” |
| Tests | `test-articles-rss.mjs` (CI); production review `docs/articles/articles-production-review.md` |

### 2.3 Scenes — **Partial → craft core shipped**

| | |
| --- | --- |
| Entry | `apps/scenes/`; Photo Coach / Photo Library; Hidden Landscapes experimental |
| Strengths | Flagship craft landing; local photo tools; related reading + observation timeline mounts |
| Gaps | Living Scenes / Scene Builder previews; Create/Share unfinished as product claims; `/scenes/` redirect points at coach not landing; HD-6 unsprinted suite; HD-7 nested-interactive a11y |
| Tests | Photo coach/library/profile/HL suites (mostly not CI-gated as a Scenes product gate) |

### 2.4 Learn — **Partial pillar, not a product**

Education is cross-cutting (Articles, WEF, per-app `learn.html`, dashboard learn modules). There is **no** primary-nav Learn room. Treat as capability, not RC1 deliverable.

### 2.5 Create — **Placeholder / direction**

Product-framework direction for Scenes and article category scaffolding. Living Scenes lacks controls. Do not market Create as shipped.

### 2.6 Remember — **No product; partial capability**

Closest: Fieldry life list, Photo Library/coach profile, Observation Timeline. No `/remember` route. Photo attach still missing in Fieldry/Sheds (HD-4).

### 2.7 Explore — **Retired as homepage pattern**

ForageCast (direction Explore) remains a supporting app. Rebuild docs retire Explore-era multi-app homepage. Not primary nav.

### 2.8 Sheds — **Shipped (map-first)**

| | |
| --- | --- |
| Entry | `apps/shed-hunting/map/`, overview at `apps/shed-hunting/` |
| Strengths | Map-first field UX; private finds; GPS/field flows; related reading + timeline |
| Gaps | Photos not attached; planned seasonal/regs/trail-cam modules; dense mobile HUD |
| Tests | Multiple Sheds suites (`test-sheds-*.mjs`) |

### 2.9 Importer — **Shipped offline; not a web RC1 surface**

Python GUI (`waypoint-importer/`) + Node CLI (`scripts/photo-importer.mjs`). Dual-importer / three-photo-system risk (`docs/IMPORTER-AUDIT.md`). Not in primary nav; no dedicated `automation/test-*importer*` gate.

### 2.10 Outdoor Intelligence — **Shipped shared layer**

| | |
| --- | --- |
| Entry | `WDS.outdoorRecommendations` + OIP under `design-system/js/outdoor-intelligence/` |
| Strengths | Deterministic rules; surface policies (Dashboard/Articles/Scenes/Sheds); local-first context; honest empty states; docs + owner review |
| Gaps | Not a navigable product; quality depends on available weather/place/articles context |
| Tests | `test-outdoor-recommendations.mjs` (**not in CI**) |

### 2.11 Observation Timeline — **Shipped shared read-model**

| | |
| --- | --- |
| Entry | `WDS.platformObservations` v2 + `WDS.observationTimeline.mount()` |
| Strengths | Unified schema; adapters over existing stores; privacy (no coordinate leakage in UI); mounts on Home deepeners, Articles, Scenes, Sheds |
| Gaps | Read-only projection; empty until local records exist; source apps remain systems of record |
| Tests | `test-observation-timeline.mjs` (**not in CI**) |

---

## 3. Architecture

**Strengths**

- Shared design system (`wds.js` / `wds-platform.js`) and Rebuild authority for Home.
- Progressive enhancement: shell first, OIP hydrate second, honest unavailable states.
- Shared recommendation engine and observation timeline reduce per-app ad-hoc ranking/lists.
- Local-first prefs, observations, and photo IndexedDB; no account required for core paths.

**Risks**

- Monolithic Home boot: **167 sequential scripts** still include Outdoor OS / V2 / V3 / Recovery eras.
- Dual loaders (full `wds.js` vs lighter `wds-platform.js`) — Fieldry/Photo Coach pay less; Home pays full tax.
- Doc authority drift: `docs/RC3-CONSTITUTION.md` / older nav plans still list Volunteer as primary; Rebuild says Home · Scenes · Sheds (+ Articles/About chrome).
- `docs/rebuild-2026/README.md` still claims Phase 2 not started while Home RC1 Rebuild has shipped.

---

## 4. Performance

| Signal | Assessment |
| --- | --- |
| Progressive shell | Good — `home-boot.js` mounts Rebuild immediately |
| Lazy widgets | Good — IntersectionObserver + eager above-fold |
| OIP once | Good — widgets consume platform package |
| Critical path | **Poor** — 167 ordered modules; HD-1 cold start remains open |
| Articles / Scenes / Sheds | Separate CSS; acceptable product CSS for surfaces |
| Bundle tooling | No root npm bundle pipeline — intentional static model; FE-5 (route-based load) still future |

---

## 5. Testing

| Area | Local | CI (`.github/workflows/ci.yml`) |
| --- | --- | --- |
| Articles RSS | Pass | Yes |
| Platform foundation / smoke / mobile layout | Present | Yes |
| Home RC1 / Rebuild phases | Pass (1 known pre-existing support assert fail) | **No** |
| Outdoor recommendations / Observation timeline | Pass | **No** |
| Waypoint Daily (WIP) | 26 pass locally | **No** |
| `test-dashboard-today-outside.mjs` | Asserts Outdoor OS — **stale vs product** | **Yes — wrong era** |
| `a11y-smoke.mjs` | Exists | **No** |

Automation corpus is large (~81 `test-*.mjs`) but **release gates do not match Rebuild product truth**.

Coverage gaps for Learn / Create / Remember / Explore-as-products and Importer are expected because those are not primary RC1 products — do not invent suites for rooms that are not shipped.

---

## 6. Documentation

**Strong:** Product standards, engineering playbook (+ Lessons Learned 2026-08-05 for OIE and timeline), Rebuild Home architecture, Articles production review, platform OIE + timeline docs, accessibility playbooks, RC1 debt register.

**Gaps for this RC1 gate**

1. No single current readiness scorecard unifying Jul 19 exec summary, Home Rebuild ship notes, Articles production, and Aug 5 platform layers (this audit closes that gap).
2. Stale Rebuild README / RC3 primary-product conflict.
3. CI matrix not documented as the Rebuild Home gate list.
4. Waypoint Daily owner review not yet produced (WIP).

---

## 7. Accessibility

**Patterns present:** skip links, trust chips, `aria-busy` loading, skeletons, reduced-motion respect, ≥44px Customize targets.

**Open debt:** CD-3 systemic color-contrast (~102 routes historically); HD-7 nested-interactive in photography apps; `a11y-smoke` not CI-gated.

**RC1 framing:** claim honest loading and keyboard-usable primary journeys; do **not** claim full WCAG AA certification until contrast remediation lands.

---

## 8. Mobile and desktop

| Surface | Assessment |
| --- | --- |
| Home Rebuild | Responsive family grids; mobile full-width tiles; Customize entry |
| Articles | Card layout with mobile CTA rules |
| Scenes | Landing CSS breakpoints; craft tools denser on small screens |
| Sheds | Map HUD dense; thumb-reach remains a known limitation |
| CI | `mobile-layout.mjs` runs in CI |

Desktop instrument density on Home is intentional; mobile must stay one primary column and honest empty states — generally met for Rebuild/Articles.

---

## 9. Technical debt (current priority view)

Still open from `docs/RC1-TECHNICAL-DEBT-REGISTER.md` and this audit:

| Priority | ID / theme |
| --- | --- |
| P0 | CI era drift (Outdoor OS suite gated; Home Rebuild suites not) |
| P0 | Home boot budget / 167-module fan-out (HD-1 / FE-5) |
| P0 | Contrast remediation or stop claiming AA (CD-3) |
| P0 | Post-change live production re-audit (CD-1 / CD-2) |
| P1 | Photography Featured SoT + Scenes suite consistency (HD-6/7) |
| P1 | Fieldry/Sheds photo attach (HD-4) |
| P1 | Authority docs: Rebuild vs RC3 Volunteer primary |
| P2 | Dual photo importers; `.worktrees/` unfinished pillars; stale rebuild README |
| In-flight | Waypoint Daily (uncommitted) — Field Notes/Take consolidation |

---

## 10. Highest-priority work remaining before Version 1.0

1. **Retarget CI** — Quarantine or rewrite `test-dashboard-today-outside.mjs`; add `test-home-rc1`, Rebuild phase suites, `test-outdoor-recommendations`, `test-observation-timeline`, `a11y-smoke` (and Daily once committed) to the release gate.
2. **Split Home critical path** — Stop loading V2/V3/Outdoor OS/Recovery on `/` first paint; ship a Home-scoped loader or deferred era packs.
3. **Contrast pass on primary journeys** — Home, Articles, Scenes landing, Sheds map chrome, About.
4. **Live production verify** — Ordinary URLs, multi-UA smoke, Articles feed health, Field Notes / recommendations, timeline empty/honest states.
5. **Finish or explicitly demote Waypoint Daily** — Either ship Daily as Home front page with owner review, or keep Field Notes/Take in deepeners without dual ownership.
6. **Scenes / photography maturity** — Featured SoT, a11y nested-interactive, consistent suite before “flagship photography” marketing.
7. **Align product authority docs** — One map: Home · Scenes · Sheds · Articles · About; incubator labeled honestly.
8. **Importer consolidation plan** — Single public story for desktop import vs library upload (no silent dual libraries).

---

## 11. What is explicitly out of scope for RC1 “missing features”

Per product standards and debt register non-goals: Volunteer CRM, social rankings, speculative AI land history, enterprise SOC, inventing Learn/Create/Remember/Explore as rooms without shipping them.

---

## 12. Audit evidence snapshot (local)

| Suite | Result at audit time |
| --- | --- |
| `test-articles-rss.mjs` | Pass |
| `test-outdoor-recommendations.mjs` | Pass |
| `test-observation-timeline.mjs` | Pass |
| `test-dashboard-rebuild-phase{1,2,3}.mjs` | Pass (prior block) |
| `test-home-rc1.mjs` | 1 pre-existing fail: support experiences assert |
| `test-dashboard-today-outside.mjs` | Fail — Outdoor OS product assertions (stale) |
| `test-waypoint-daily.mjs` | Pass (26) — WIP module |

---

## Related documents

- Owner review: [`waypoint-studio-rc1-owner-review.md`](./waypoint-studio-rc1-owner-review.md)
- Prior: `docs/RC1-EXECUTIVE-SUMMARY.md`, `docs/RC1-TECHNICAL-DEBT-REGISTER.md`, `docs/RC1-PLATFORM-SCORECARD.md`
- Platform: `docs/platform/outdoor-intelligence-engine.md`, `docs/platform/observation-timeline.md`
- Articles: `docs/articles/articles-production-review.md`
- Home: `docs/rebuild-2026/home-vision-lock-owner-review.md`
