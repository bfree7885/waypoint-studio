# Dashboard Production Tile Layout Repair — Owner Review

**Date:** 2026-07-25  
**Branch:** `fix/dashboard-production-tile-layout`  
**Starting SHA:** `0be5f9fb23f0b0f024794ea2542df502416537f1` (`origin/main`)

## Executive summary

Production Home (`/` and `/apps/dashboard/`) showed narrow orphan tiles beside empty half-row gaps whenever a family group contained fewer tiles than the column preference (Astronomy / Light alone at `span 4` on a 12-column grid). Mobile and desktop now use an authoritative equal-width family-grid contract. Coming-soon placeholders were removed from the selectable catalog. Live verification is required after merge to `main` (GitHub Pages).

## Root cause

1. **Family headers lived in the same 12-column grid as widgets.** A single Astronomy or Light tile kept `grid-column: span 4` (⅓ width), leaving a large empty gap.
2. **Per-tile size classes (`sm`/`md`/`lg`/`anchor`)** produced uneven spans independent of readable equal columns.
3. **Coming-soon catalog entries** (Photography, Rivers, Wildlife, Trails, Travel) remained selectable and showed “Coming Soon” badges.

Not a stale service-worker-only issue: the live Rebuild CSS/JS still encoded the mixed-span model (`?v=dash-rc25-s6` on production before this repair).

## Exact layout correction

- Workspace renders **nested family sections** (`.wdb-r-family` → `.wdb-r-family__grid`).
- Family grids use **equal tracks**: 1 / 2 / 3 columns from `data-columns`.
- 3-column families use a **6-track** grid so incomplete rows fill cleanly (one leftover → full width; two leftovers → equal halves).
- Tile size model: **`standard` | `wide` | `featured`** (legacy `sm`/`md`/`lg`/`anchor`/`half`/`compact` migrate).
- **Mobile (`max-width: 47.99rem`)**: `grid-template-columns: minmax(0, 1fr)` and every variant `grid-column: 1 / -1`.
- Loading skeletons use the same size class / family grid footprint as loaded tiles.

## Tile catalog audit

| Tile | Status | Action |
|------|--------|--------|
| Conditions | Live OIP | Kept (default) |
| Air | Live OIP | Kept (default) |
| Alerts | Honest empty (“No active alerts…”) | Kept; Available badge (not Coming Soon) |
| Astronomy | Live OIP | Kept (default) |
| Light | Live OIP | Kept (default) |
| Photography | Coming soon | **Removed from catalog** |
| Rivers | Coming soon | **Removed from catalog** |
| Wildlife | Coming soon | **Removed from catalog** |
| Trail Conditions | Coming soon | **Removed from catalog** |
| Travel | Coming soon | **Removed from catalog** |

**Functional visible tiles:** 5  
**Removed / disabled from selectable catalog:** 5

## Affected components and CSS

- `design-system/css/wds-dashboard-rebuild.css`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-workspace.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-prefs.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-customize.js`
- `index.html`, `apps/dashboard/index.html` (cache-bust `dash-tile-layout-1`)

## Stale / conflicting legacy behavior found

- 12-column span model with `sm` → `span 3` and orphans at `span 4`
- Phone breakpoint only at `40rem` (640px) while tablet forced half-width spans
- Customize copy and badges still advertising “Coming Soon”
- Legacy prefs could retain removed widget ids / old size tokens (now normalized)

## Tests added

- `automation/test-dashboard-tile-layout-repair.mjs` — 48 assertions (CSS contract, size migration, catalog gate, family grids, odd count, long title, lazy footprint, no Coming Soon)
- `automation/capture-dashboard-tile-layout-repair.mjs` — browser CDP widths + screenshots

### Results

| Suite | Result |
|-------|--------|
| Tile layout repair | **48 passed** |
| Rebuild phase 1 | **88 passed** |
| Rebuild phase 2 | **96 passed** |
| Rebuild phase 3 | **94 passed** |
| Browser capture verification | **ok** (`verification.json` failures: `[]`) |
| `test-home-rc1` | Pre-existing fail: support.html still contains “Coming later” / incubator (documented Sprint 6 follow-up; unchanged) |

### Local browser measurements (key)

- Mobile 320–430: tile ratios ≈ 1.0 (full family width)
- Desktop 1024–1440: Environmental thirds; Astronomy / Light **full width** (ratio 1.0)
- Odd count: Astronomy full width
- Customize: no Coming Soon text

## Screenshot paths

`docs/rebuild-2026/dashboard-tile-layout-repair/`

- `320x800-loaded.png`, `375x812-loaded.png`, `390x844-loaded.png`, `430x932-loaded.png`
- `768x1024-loaded.png`, `1024x768-loaded.png`, `1440x1000-loaded.png`
- `1440x1000-all-tiles.png`, `1440x1000-odd-tiles.png`, `1440x1000-customize.png`
- `1440-loading-or-settling.png`, `390-apps-dashboard.png`
- `measurements.json`, `verification.json`

Visual review: desktop orphans filled; mobile Conditions (and siblings) full-width; no Coming Soon in customize capture.

## Privacy / security

No new remote APIs, analytics, or uploads. Location remains local-first. No Dashboard→Sheds cross-product changes beyond shared Home Rebuild assets.

## Diff-scope confirmation

Dashboard Rebuild Home path only (`design-system/.../rebuild/*`, Home HTML cache-bust, automation, docs). Scenes portfolio stack untouched. Sheds product files absent.

## Remaining risks

- Users with old localStorage size tokens rely on `normalizeSize` migration (covered by tests).
- Tablet 768 currently collapses to full-width rows in capture (still readable; not half orphans).
- Alerts remains non-live (honest empty) until an alerts OIP adapter ships.
- Production must be verified after Pages deploy with cache-bust query.

## SHAs (filled at merge/deploy)

| Field | Value |
|-------|-------|
| Branch | `fix/dashboard-production-tile-layout` |
| Starting SHA | `0be5f9fb23f0b0f024794ea2542df502416537f1` |
| Implementation SHA | `73d60dea37e2748ee435b47dad5b6a74cee02531` |
| Merge SHA | *(set after merge to main)* |
| Deployed production SHA | *(from live `data/build-info.json`)* |
| Live URLs | `https://waypointstudio.org/?cb=tile-layout-1`, `https://waypointstudio.org/apps/dashboard/?cb=tile-layout-1` |
