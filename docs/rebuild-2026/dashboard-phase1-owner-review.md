# Dashboard Phase 1 — Owner Review

**Status:** Awaiting owner review — **stop here; do not start Phase 2 widgets**  
**Date:** 2026-07-22  
**Authority:** `docs/rebuild-2026/` (Waypoint Studio 2026 Rebuild)  
**Git:** Nothing committed or pushed in this work block (working tree dirty; confirm locally)

---

## Verdict

Phase 1 Dashboard **shell** is implemented and wired as the `/apps/dashboard/` entry.

`/apps/dashboard/` now mounts the **Rebuild workspace** (Today Outside container + placeholder widget framework + customize + kiosk hooks). Outdoor OS is **no longer the product entry**. OS modules remain in the tree as historical code loaded by `wds.js` but are unused by the Dashboard boot path.

---

## What was built

| Capability | Status |
|------------|--------|
| Routing (Workspace · Customize · Kiosk) | Done — hash routes `#/`, `#/customize`, `#/kiosk` + local nav features |
| Layout (Today Outside + widget workspace) | Done — structural CSS only, no polish |
| Widget framework | Done — frames, sizes, independent placeholder payload |
| Today Outside container | Done — honest empty summary region (no intelligence) |
| Widget registry | Done — placeholder widgets only (`ph-*`) |
| Persistence | Done — `localStorage` key `waypoint-dashboard-rebuild-prefs-v1` |
| Kiosk framework | Done — mode flag, constraints, refresh timer, no surprise location prompt |
| Nav contract | Done — product label **Dashboard**; `homePrimary` = Dashboard · Scenes · Sheds |

---

## File inventory

### New (Phase 1)

| Path | Role |
|------|------|
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` | Placeholder widget registry |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js` | Local-first layout prefs |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-today.js` | Today Outside container |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js` | Widget grid framework |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js` | Customize mode |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-kiosk.js` | Kiosk mode hooks |
| `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Shell orchestrator |
| `design-system/css/wds-dashboard-rebuild.css` | Structural layout CSS |
| `automation/test-dashboard-rebuild-phase1.mjs` | Phase 1 regression tests |
| `docs/rebuild-2026/dashboard-phase1-owner-review.md` | This review |

### Replaced entry (Dashboard-local)

| Path | Change |
|------|--------|
| `apps/dashboard/index.html` | Rebuild shell entry; no Outdoor OS CSS/presentation |
| `apps/dashboard/js/home-boot.js` | Mounts `WDS.dashboardRebuild` immediately (no OS / contentEngine briefing) |
| `apps/dashboard/contact.html` | Dashboard naming; local nav enabled |

### Shared contracts (minimal blast radius)

| Path | Change |
|------|--------|
| `design-system/js/wds.js` | Registers rebuild modules |
| `design-system/js/platform/wds-app-nav-config.js` | Dashboard label, features, three-product `homePrimary` |
| `design-system/ecosystem/nav-registry.json` | Aligned with nav config |
| `automation/test-dashboard-os-routes.mjs` | Assertions updated for Dashboard naming |

### Intentionally untouched as entry

| Path | Note |
|------|------|
| `design-system/js/dashboard/os/*` | Still present; **not** Dashboard entry |
| `design-system/js/dashboard/v2/*`, `v3/*` | Historical infra; not Phase 1 UI |
| Scenes / Sheds product pages | Not modified |

---

## How to run locally

From repo root:

```bash
# Static server (any local static server works)
python3 -m http.server 8080

# Open
# http://localhost:8080/apps/dashboard/
# http://localhost:8080/apps/dashboard/#/customize
# http://localhost:8080/apps/dashboard/#/kiosk
```

Tests:

```bash
node automation/test-dashboard-rebuild-phase1.mjs
node automation/test-dashboard-os-routes.mjs
```

**Phase 1 result (this session):** `53` + `40` passed.

---

## Architecture mapping

| Architecture section | Phase 1 implementation |
|----------------------|------------------------|
| **03** First viewport | Shell: actions → Today Outside → Widget workspace |
| **03** Today Outside | Container with place/time/trust + honest empty body |
| **03** Widget model | Registry contract + placeholder `getData` / render |
| **03** Customize | Add/remove/reorder/resize/presets/reset; local persist |
| **03** Performance | Shell mounts without waiting for OIP/providers |
| **03** Kiosk | Enter/exit, constraints, refresh hook, low-chrome flag |
| **06** Canonical entry | `/apps/dashboard/` → Rebuild workspace |
| **06** Local nav | Workspace · Customize · Kiosk |
| **06** Labels | **Dashboard** (not permanent “Outside”) |
| **06** Primary three | `homePrimary`: dashboard, scenes, sheds |
| **07** Composition | Workspace = summary region + widget grid; structural only |
| **01/02** Non-goals | No OS briefing, no AI/recommendations, no Scenes/Sheds merge |

---

## Outdoor OS / legacy relationship

| Layer | State after Phase 1 |
|-------|---------------------|
| **Product entry** `/apps/dashboard/` | **Replaced** by Rebuild shell |
| **Outdoor OS modules** `dashboard/os/*` | **Still present** in repo + still listed in `wds.js` loader |
| **Recovery / V2 / V3** | Still present as historical modules; not the entry |
| **Archived vision docs** | `docs/archive/pre-rebuild-2026/` |

Owner note: current Dashboard (Outdoor OS) is retired as the meaning of `/apps/dashboard/`. Phase 1 is the start of that replacement. Deleting or unloading OS/V2/V3 from `wds.js` is **deferred** (trim dead weight after Phase 1 review).

Optional archaeology: modules remain importable; there is no supported UI path that mounts Outdoor OS as home.

---

## Intentionally deferred (Phase 2+)

- Real widget implementations (conditions, light, air, water, alerts, …)
- Today Outside observational composer / provider wiring
- Visual polish / atmosphere / motion
- AI-generated content or recommendation copy
- Widget detail sheets with live data
- DnD polish, advanced presets beyond shell defaults
- Removing Outdoor OS / Recovery from `wds.js` loader
- Studio home card copy refresh beyond nav registry
- Deploy / Pages publish

**Hard stop:** do not start Phase 2 until owner approves this review.

---

## Language / trust checks

- Chrome labels are observational (Workspace, Today Outside, Customize, Kiosk)
- No “Do this”, homework, or coaching CTA voice in Phase 1 chrome
- Placeholders report **Unavailable** — no fabricated numbers
- Today Outside empty state explains what is missing

---

## Tests

| Suite | Result |
|-------|--------|
| `automation/test-dashboard-rebuild-phase1.mjs` | 53 passed |
| `automation/test-dashboard-os-routes.mjs` | 40 passed |

Coverage includes: module presence, registry placeholders, prefs round-trip, Today Outside empty shell, view routing, kiosk constraints, banned chrome terms, nav Dashboard features, three-product homePrimary.

---

## Git status confirmation

- **No commit** created for this Phase 1 work
- **No push / merge / deploy**
- Confirm with: `git status` (expect uncommitted Phase 1 files under `design-system/js/dashboard/rebuild/`, `apps/dashboard/*`, tests, and this review)

---

## Screenshots

Optional / not required for Phase 1 (no polish). Structural shell is verifiable in-browser via local URLs above.

---

## Owner decision asks

1. Approve Phase 1 shell as the ongoing `/apps/dashboard/` entry?
2. OK to leave Outdoor OS modules in-tree until a dedicated cleanup phase?
3. Authorize Phase 2 (real widgets + Today Outside composer) only after this review?
