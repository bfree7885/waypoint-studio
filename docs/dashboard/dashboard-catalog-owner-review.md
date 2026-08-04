# Dashboard — Functional Tile Catalog (Owner Review)

**Status:** implemented and verified — **pending owner review**. Do not merge. Do not deploy.  
**Branch:** `feature/dashboard-functional-tile-catalog`  
**Canonical owner entrypoint:** this file (`docs/dashboard/dashboard-catalog-owner-review.md`)  
**Deep implementation record:** [`docs/rebuild-2026/dashboard-functional-tile-catalog-owner-review.md`](../rebuild-2026/dashboard-functional-tile-catalog-owner-review.md) (superseded as entrypoint; retained for full tile/source tables and delivery history)

---

## SHAs

| Role | SHA |
| --- | --- |
| Start (merge-base / prior `main`) | `59c09de` |
| Implementation (catalog) | `1164abc` |
| Tests | `a178291` |
| Initial docs | `e7a4b15` |
| Prior tip (readiness stamp) | `00d95f6` |
| This verification / docs-gap tip | _stamped on the commit that lands this file_ |

**Rebase:** already contains `origin/main` @ `59c09de` — rebase is a **no-op** (0 behind, 8 ahead before this docs pass). No conflicts.

---

## Verdict for owner

Dashboard is now a **daily outdoor workspace** backed by a **32-tile functional catalog** across **9 categories**. Every selectable tile is live (shared OIP package or documented local calculation). There are **no Coming Soon / placeholder / disabled registry entries**. Deferred capabilities (eBird, moonrise/set, pollen, aurora, ISS, etc.) are **absent**, not stubbed.

Preserved: Today Outside, mobile full-width layout, customize + layout persistence (`waypoint-dashboard-rebuild-prefs-v1`), Rebuild architecture (`wds-dashboard-rebuild*`).

---

## Tile counts and categories

| Metric | Value |
| --- | --- |
| Working / catalogued tiles | **32** |
| Default-visible | **11** |
| Categories (library) | **9** (+ Favorites prefs group) |
| Removed this pass | **none** (no obsolete rebuild stubs) |
| Disabled / Coming Soon / placeholders | **none** |

| Category | Count | Tile IDs |
| --- | --- | --- |
| Weather | 5 | `ph-conditions`, `ph-hourly`, `ph-forecast`, `ph-wind`, `ph-precip` |
| Photography | 5 | `ph-golden`, `ph-blue`, `ph-photo`, `ph-sky`, `ph-night-photo` |
| Astronomy | 3 | `ph-sun`, `ph-moon`, `ph-dark-sky` |
| Air and Environment | 3 | `ph-air`, `ph-uv`, `ph-exposure` |
| Hiking and Trails | 4 | `ph-hiking-window`, `ph-daylight-left`, `ph-trail-estimate`, `ph-pack` |
| Rivers and Water | 3 | `ph-river`, `ph-rainfall`, `ph-flood` |
| Wildlife and Birding | 3 | `ph-birding`, `ph-wildlife-window`, `ph-seasonal` |
| Travel and Access | 3 | `ph-driving`, `ph-travel-window`, `ph-place` |
| Alerts and Safety | 3 | `ph-alerts`, `ph-risk`, `ph-freeze` |

Default workspace: `ph-conditions`, `ph-hourly`, `ph-golden`, `ph-sun`, `ph-air`, `ph-hiking-window`, `ph-daylight-left`, `ph-river`, `ph-wildlife-window`, `ph-alerts`, `ph-risk`.

Full per-tile dependency / source table: see the rebuild-2026 deep record §3.

Authority for IDs and metadata: `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js`.  
Human catalog index: [`tile-catalog.md`](./tile-catalog.md).

---

## Remaining placeholders

**None in the Rebuild registry.** Comment in registry: “No placeholders, no Coming Soon.”

Deferred features are documented as out of catalog (not selectable). Legacy Outdoor OS / V2 / V3 catalogs remain in-tree for historical surfaces only and are **not** the Rebuild product path.

---

## Risks / known limitations

1. **NWS weather fallback** omits sunrise/sunset, cloud cover, humidity, UV → Photography / Astronomy / UV / exposure tiles correctly go unavailable more often than on Open-Meteo.
2. **`ph-river`** needs a USGS gauge in search radius; otherwise honest “no nearby gauge.”
3. **Rainfall runoff** and **moon illumination** are qualitative / approximate estimates, labeled Estimated with basis lines.
4. **Pre-existing** `test-dashboard-today-outside.mjs` failures (Outdoor OS era asserts) and `test-home-rc1.mjs` support.html “Coming later” are **not** introduced by this catalog — same baseline on `origin/main`.

---

## Test summary (re-run 2026-08-03)

| Suite | Result |
| --- | --- |
| `test-dashboard-functional-tile-catalog.mjs` | **177 pass / 0 fail** |
| `test-dashboard-tile-layout-repair.mjs` | **48 pass / 0 fail** |
| `test-dashboard-mobile-tile-editing.mjs` | **39 pass / 0 fail** |
| `test-dashboard-rebuild-phase1.mjs` | **88 pass / 0 fail** |
| `test-dashboard-rebuild-phase2.mjs` | **97 pass / 0 fail** |
| `test-dashboard-rebuild-phase3.mjs` | **102 pass / 0 fail** |
| `test-dashboard-reliability.mjs` | **41 pass / 0 fail** |
| `test-dashboard-os-copy.mjs` | **28 pass / 0 fail** |
| `test-dashboard-os-interpret.mjs` | **80 pass / 0 fail** |
| `test-dashboard-os-routes.mjs` | **36 pass / 0 fail** |
| `test-dashboard-v2.mjs` | **59 pass / 0 fail** |
| `test-dashboard-v3.mjs` | **50 pass / 0 fail** |
| `test-dashboard-today-outside.mjs` | **28 pass / 4 fail** (stale Outdoor OS asserts; same on `origin/main`) |
| **Dashboard green total (excl. stale today-outside)** | **845 pass / 0 fail** |

No integration-introduced failures. No repairs required this pass.

---

## Screenshots

Authoritative browser captures (prior verification `ok: true`, **26 PNGs**):

`docs/rebuild-2026/dashboard-functional-tile-catalog/`

Includes desktop default / all-tiles / customize (+ per-category), mobile 320–430, and `apps/dashboard`. Refresh not re-run this pass (`ws` CDP dependency missing in this environment); existing `verification.json` remains the visual record.

---

## Docs updated this pass

| Doc | Change |
| --- | --- |
| `docs/dashboard/dashboard-catalog-owner-review.md` | **This file** — canonical owner entrypoint |
| `docs/dashboard/tile-catalog.md` | Locked catalog index |
| `docs/rebuild-2026/03-dashboard-architecture.md` | Locked 32-tile catalog + registry contract |
| `docs/rebuild-2026/dashboard-functional-tile-catalog-owner-review.md` | Points here as entrypoint; tip stamps |
| `docs/rebuild-2026/README.md` | Links catalog owner review |
| `docs/ENGINEERING-PLAYBOOK.md` | Report path → canonical owner review |
| `docs/PLAYBOOK_CHANGELOG.md` | Standards entry for catalog lessons |

---

## Ship gate

- **Do not merge.**
- **Do not deploy.**
- Stopped for owner review on this branch after push.
