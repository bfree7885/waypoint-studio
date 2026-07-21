# RC3 Consolidation Manifest

**Canonical:** `bfree7885/waypoint-studio` @ `f68c5b2` (`recovery/rc3-consolidation`)  
**Source:** `bfree7885/waypoint-studio-site` @ `508b783` (`rc3`)  
**Strategy:** Option A — preserve deep `/apps/*`; port RC3 law/IA/visual direction selectively.

Action vocabulary:

| Action | Meaning |
|--------|---------|
| PRESERVE | Keep canonical implementation as-is |
| PORT | Bring source artifact into canonical with light path adaptation |
| ADAPT | Re-implement source intent using canonical systems (WDS, apps) |
| MERGE CONCEPTS | Combine strengths; no wholesale file replace |
| RETIRE FROM PRIMARY UI | Keep code reachable; remove from primary homepage/nav prominence |
| ARCHIVE | Keep in repo/docs; not product surface |
| REDIRECT | Add route alias if needed |
| DO NOT COPY | Source must not overwrite canonical |
| REQUIRES OWNER REVIEW | Ambiguous or risky |

---

## Area classifications

| Area | Action | Status | Notes |
|------|--------|--------|-------|
| Homepage | MERGE CONCEPTS | COMPLETE | RC3 hierarchy/mission; WDS home + deep Launch targets |
| Navigation | ADAPT | COMPLETE | Primary six + quiet Incubator in footer |
| Mission | PORT | COMPLETE | Observe. Discover. Understand. |
| Tagline | PORT | COMPLETE | Capture what you find. Learn why it matters. |
| Dashboard | MERGE CONCEPTS | PARTIAL | Framing + existing Take preserved; no shallow RC3 replace |
| Scenes | PRESERVE + MERGE CONCEPTS | COMPLETE | Photo Coach preserved; mission language aligned |
| Photo Coach | PRESERVE | COMPLETE | DO NOT COPY site Scenes |
| Shoot Review | PRESERVE | COMPLETE | Under Scenes/Photo Coach |
| Sheds | MERGE CONCEPTS | PARTIAL | Framing + Take; map/GPS preserved; full Sheds 3.0 education port deferred |
| Volunteer | MERGE CONCEPTS | COMPLETE | Free primary framing; discovery mission preserved |
| Articles | MERGE CONCEPTS | PARTIAL | Hub reframed; category Create/Share labels still historical |
| Waypoint’s Take | PRESERVE + ADAPT | COMPLETE | Shared `wds-take.js` + product surfaces; Dashboard engines preserved |
| Incubator | PORT | COMPLETE | Page + demotion from primary Launch |
| SignalTerrain | RETIRE FROM PRIMARY UI | COMPLETE | App preserved |
| Steepleaf | RETIRE FROM PRIMARY UI | COMPLETE | App preserved |
| Savant Sommelier | RETIRE FROM PRIMARY UI | COMPLETE | App preserved |
| ForageCast | RETIRE FROM PRIMARY UI | COMPLETE | Supporting section only |
| Fieldry | RETIRE FROM PRIMARY UI | COMPLETE | Supporting section only |
| Landscape Interpretation | RETIRE FROM PRIMARY UI | COMPLETE | Supporting section only |
| Hidden Landscapes | PRESERVE | COMPLETE | Under Scenes — not primary nav |
| Design tokens | ADAPT | COMPLETE | Aurora bridge into WDS |
| Shared CSS | ADAPT | COMPLETE | Bridge CSS; no parallel DS |
| JavaScript services | PRESERVE | COMPLETE | Platform services untouched |
| Provider integrations | PRESERVE | COMPLETE | |
| Offline systems | PRESERVE | COMPLETE | |
| Tests | PRESERVE + ADAPT | PARTIAL | Existing validators pass; Chrome smoke blocked (`ws` missing) |
| Workflows | PRESERVE | COMPLETE | |
| CNAME | PRESERVE | COMPLETE | Unchanged `waypointstudio.org` |
| robots.txt | PRESERVE | COMPLETE | No change required this pass |
| sitemap.xml | ADAPT | COMPLETE | Primary elevated; demoted products lowered |
| Contact / Support | PRESERVE | COMPLETE | |
| Documentation | PORT | COMPLETE | RC3 constitution set + implementation report |
| Assets | DO NOT COPY | COMPLETE | No site megabyte assets imported |
| Incomplete Scenes WIP (site untracked) | REQUIRES OWNER REVIEW | OWNER REVIEW REQUIRED | Not copied into canonical |

---

## PORT / ADAPT detail sheets

### 1. Mission & tagline

| | |
|--|--|
| **Action** | PORT |
| **Source** | `waypoint-studio-site/index.html`, `docs/RC3-CONSTITUTION.md` |
| **Destination** | `index.html` meta/H1 + shared copy modules if any |
| **Reason** | Approved product direction |
| **Dependencies** | Homepage copy pass |
| **Conflicts** | Current “Create. Share.” pillars |
| **Acceptance** | First viewport states Observe/Discover/Understand + tagline; no Create/Share as mission |

### 2. RC3 Constitution & product docs

| | |
|--|--|
| **Action** | PORT |
| **Source** | `docs/RC3-CONSTITUTION.md`, `PRODUCTS.md`, `NAVIGATION-PLAN.md`, `INCUBATOR.md`, `AURORA-DESIGN-SYSTEM.md`, `AURORA-ACCESSIBILITY.md`, `DASHBOARD-3.md`, `SHEDS-3.md` |
| **Destination** | `docs/` (same or `docs/rc3/` namespace if collisions) |
| **Reason** | Law of the platform |
| **Dependencies** | None |
| **Conflicts** | Older `STRATEGIC-DIRECTION` / roadmap docs may contradict — mark superseded |
| **Acceptance** | Constitution linked from README/docs index; outdated mission docs labeled superseded |

### 3. Navigation / homepage hierarchy

| | |
|--|--|
| **Action** | ADAPT / MERGE CONCEPTS |
| **Source** | `waypoint-studio-site/index.html`, `docs/NAVIGATION-PLAN.md` |
| **Destination** | `index.html` + any shared nav partials/components in `design-system/` / `js/` |
| **Reason** | Primary products must match vision |
| **Dependencies** | Incubator demotion |
| **Conflicts** | Existing multi-pillar card grid & Launch CTAs for incubator apps |
| **Acceptance** | Primary: Dashboard, Scenes, Sheds, Volunteer; Articles accessible; Incubator quiet; ForageCast/Fieldry not primary |

### 4. Aurora → WDS tokens

| | |
|--|--|
| **Action** | ADAPT |
| **Source** | `styles/aurora-tokens.css`, `styles/aurora.css` |
| **Destination** | `design-system/css/` (new aurora bridge or token map) — **not** deleting WDS |
| **Reason** | Official outdoor visual direction without discarding platform CSS |
| **Dependencies** | Design review |
| **Conflicts** | Duplicate button/card rules; color-mix support |
| **Acceptance** | Documented token map; Scenes/Sheds/Volunteer/Dashboard can opt into product themes; no broken WDS pages |

### 5. Dashboard 3.0 concepts

| | |
|--|--|
| **Action** | MERGE CONCEPTS |
| **Source** | `dashboard/js/*`, `styles/dashboard.css`, `docs/DASHBOARD-3.md` |
| **Destination** | `apps/dashboard/` + `design-system/js/dashboard/` |
| **Reason** | Customize/reorder/kiosk/brief UX; A has deeper providers/OIE |
| **Dependencies** | Take contract already in A |
| **Conflicts** | Parallel dashboard v2/v3 engines — do not fork a fourth |
| **Acceptance** | No loss of provider/OIE; widget enable/order or equivalent UX; Take still “why it matters” |

### 6. Sheds 3.0 education / Take / layers

| | |
|--|--|
| **Action** | MERGE CONCEPTS |
| **Source** | `sheds/sheds.js`, `sheds/sheds-data.js`, `docs/SHEDS-3.md` |
| **Destination** | `apps/shed-hunting/` (+ map) |
| **Reason** | Education + Take + seasonality valuable; A map deeper |
| **Dependencies** | Aurora/WDS theme-sheds |
| **Conflicts** | Leaflet data models differ |
| **Acceptance** | Demo ethics retained; Take present; education content reachable; no fake parcel science |

### 7. Incubator demotion

| | |
|--|--|
| **Action** | PORT (page/section) + RETIRE FROM PRIMARY UI (apps) |
| **Source** | `incubator/index.html`, `docs/INCUBATOR.md` |
| **Destination** | New `incubator.html` or `apps/incubator/` overview + homepage change |
| **Reason** | Vision requires demotion without deleting apps |
| **Dependencies** | Homepage/nav |
| **Conflicts** | Status badges “Early access” Launch cards |
| **Acceptance** | SignalTerrain/Steepleaf/Savant Sommelier not in primary hero/Launch row; apps still resolve |

### 8. Articles category framework

| | |
|--|--|
| **Action** | MERGE CONCEPTS |
| **Source** | `education/index.html` |
| **Destination** | `articles/` index |
| **Reason** | Platform-wide categories |
| **Dependencies** | Nav label “Articles” |
| **Conflicts** | Existing article IA |
| **Acceptance** | Categories listed; links to existing content; no empty placeholder spam |

### 9. Volunteer messaging

| | |
|--|--|
| **Action** | MERGE CONCEPTS |
| **Source** | `volunteer/` copy |
| **Destination** | `apps/waypoint-volunteer/` |
| **Reason** | Align free stewardship framing |
| **Dependencies** | None critical |
| **Conflicts** | Minimal |
| **Acceptance** | Mission-consistent copy; discovery engine preserved |

### Items marked DO NOT COPY

| Source | Why |
|--------|-----|
| Entire `waypoint-studio-site` tree as merge | Would destroy `/apps/*` depth |
| Site `styles/site.css` wholesale | Conflicts with WDS |
| Site megabyte JPEGs | Unnecessary for IA |
| Site Dashboard/Sheds as replacements for apps | Shallower |
| CNAME / Pages workflow from site | Wrong domain model |

---

## Migration order (safe sequence)

1. **Constitution & documentation** — PORT RC3 docs; supersede conflicting strategy docs  
2. **Shared design tokens** — ADAPT Aurora → WDS bridge (no homepage redesign yet beyond tokens if needed)  
3. **Homepage content & hierarchy** — MERGE CONCEPTS (mission, tagline, primary four) — *owner-approved implementation phase*  
4. **Navigation** — ADAPT global nav to primary six + quiet Incubator  
5. **Articles & Waypoint’s Take** — MERGE category framework; audit Take coverage  
6. **Incubator demotion** — PORT incubator overview; RETIRE incubator apps from primary UI  
7. **Dashboard concept merge** — customize/brief/kiosk patterns into `apps/dashboard`  
8. **Sheds concept merge** — education/Take/seasonality into `apps/shed-hunting`  
9. **Volunteer / Scenes copy alignment** — light MERGE CONCEPTS  
10. **sitemap / robots review** — ADAPT  
11. **Tests** — extend automation assertions for IA  
12. **Owner QA on `recovery/rc3-consolidation`**  
13. **Only then:** PR to `main` + Pages deploy (explicit approval)

Effort sketch (post-prep implementation):

| Step | Estimate |
|------|----------|
| Docs + token bridge | half day–1 day |
| Homepage + nav + incubator demotion | 1–2 days |
| Dashboard/Sheds concept merges | multiple days |
| Full QA + PR | 1 day |

---

## Explicit non-goals of the next coding phase (until re-approved)

- DNS / CNAME / Pages settings changes  
- Force-push / rewrite of `main` history  
- Deleting SignalTerrain / Steepleaf / Sommelier / ForageCast / Fieldry codebases  
- Blind `git merge` of `waypoint-studio-site/rc3` into canonical  

---

## Related artifacts

- `docs/RC3-CONSOLIDATION-PREP.md`  
- `docs/consolidation/*` inventories & baseline tests  
- Site (uncommitted): `docs/CANONICAL-REPOSITORY-DECISION.md`
