# Waypoint Studio — Owner Summary (2026-08-03)

**Production build:** `59c09de` (`59c09debbe8d9c7d36acf74607bd4ebfa55359fc`)  
**Matches `origin/main`:** Yes  
**Local Meerkat `main`:** Stale at `63fc457` (36 commits behind) — do not trust it as production.

Full evidence: [`2026-08-03-waypoint-studio-complete-status-audit.md`](./2026-08-03-waypoint-studio-complete-status-audit.md)

---

## What is actually working today?

- **Dashboard Rebuild** on `/` → “See today’s outdoors” / `/apps/dashboard/`: Today Outside + customizable workspace with **five** real tiles (Conditions, Air, Alerts, Astronomy, Light). Mobile layout repair is live. No Coming Soon tiles in the catalog.
- **Scenes craft loop:** Photo Coach / Shoot Review, Photo Library, Hidden Landscapes (experimental).
- **Sheds field map:** interactive map, local observations, likelihood/heat guidance, Today’s Search planner — foundation quality, not a finished product.
- **Deploy fingerprinting:** `data/build-info.json` + `waypoint-build` meta work.
- **Large automated suites green** for Rebuild phases, Coach, Library, Hidden Landscapes, most Sheds (see audit §15).

## What is only on unmerged branches?

- **32-tile Dashboard catalog** — `feature/dashboard-functional-tile-catalog` @ `c975958` (0 behind main; ready for merge-gate).
- **Scenes four-pillar IA + Scene Library** — sprint1/sprint3 (`e8258e1` / `89129f4`), **36 behind** main.
- **Portfolio suite** (assistant → website output) — feature branch chain tips through `c672f8d`.
- **Turnaround sprints 01–05** (reconciliation, public cleanup, security, dashboard loader, Scenes honesty) — based on `59c09de`, not merged.
- **Coach blurry-preview fix**, **RC4 design-system sprint**.
- **Photo Coach 2.0** — exists as **local staged WIP** on `feature/scenes-photo-coach-2-architecture` and is **not pushed to GitHub**.

## What exists only as an idea or document?

- Outdoor Journals product (hiking/wildlife/mushroom journals, Year-in-Nature books, print/PDF).
- Sheds regulations, species browser routes, seasonal forecast modules (`foundation.json` marks planned).
- Full account/auth sync platform.
- Marketing-level “customizable outdoor workspace” depth (needs the unmerged 32-tile catalog).
- Living Scenes as a finished motion product (preview page only on production).

## What is currently deployed?

Exactly **`origin/main` @ `59c09de`**, built **2026-07-26T02:47:56.539Z**, workflow `30185121429`.  
`/version.json` does not exist (404).

## What is the strongest product right now?

**Dashboard** — most coherent, tested, and honest live experience.

## What is closest to becoming genuinely usable?

1. Shipping the **32-tile Dashboard catalog** branch (already implemented + tested on its branch).  
2. Then a **Scenes single-door** cleanup so Photo Coach + Library feel like one product.

## What work is at risk of being lost?

1. **Unpushed Photo Coach 2.0 files** on the Meerkat working tree (highest urgency).  
2. Scenes portfolio branch family and sprint1/3 (diverged, easy to forget).  
3. Turnaround sprint real commits buried under hundreds of `[skip ci]` publish commits.  
4. Two git stashes (`rc4`, `sprint4-scene-native`).

## What should we work on next?

Stabilize and **ship Dashboard catalog depth**, then reconcile Scenes. Do not start a new Sheds feature sprint yet.

## Should Dashboard, Scenes, or Sheds be the immediate priority?

**Dashboard** — immediate priority.

## Next five concrete steps

1. **Push/commit Photo Coach 2.0 WIP** to `origin` so it cannot be lost (separate from audit).  
2. **Fast-forward Meerkat local `main`** to `origin/main` (`59c09de`).  
3. **Merge-gate + merge** `feature/dashboard-functional-tile-catalog` → `main` → deploy; verify production build-info advances.  
4. **Land turnaround security + Scenes honesty** (sprints 03 and 05 real commits) as small PRs.  
5. **Rebase Scenes sprint3 + portfolio chain** onto post-catalog main; pick one Scenes entry URL and demote the other.

---

## Classifications (headline)

| Area | Status | Confidence |
| --- | --- | --- |
| Dashboard | FUNCTIONAL BUT INCOMPLETE | High |
| Scenes overall | PARTIAL | High |
| Learn | FUNCTIONAL BUT INCOMPLETE | High |
| Create | PROTOTYPE | High |
| Remember | MISSING (prod) / PARTIAL (branches) | High |
| Explore | FUNCTIONAL BUT INCOMPLETE | High |
| Sheds | PARTIAL | High |

## Test snapshot (main @ `59c09de`)

- **Pass:** Rebuild phase1–3, tile layout repair, mobile tile editing, reliability, kiosk modules, most Sheds, Photo Coach, Library, Hidden Landscapes, surface consistency.  
- **Fail:** today-outside (4), platform-consistency (1), platform-integration (2), platform-experience-rc2 (9), sheds-map (1).  
- **Broken deps:** kiosk-location-boot, morning-briefing (`ws` missing).  
- **Not repaired** (audit-only).

## Audit git

| | |
| --- | --- |
| Branch | `audit/waypoint-studio-complete-status-2026-08-03` |
| Starting SHA | `59c09debbe8d9c7d36acf74607bd4ebfa55359fc` |
| Ending SHA | (tip of this audit branch) |
| App code changed | **No** |
| Merged / deployed / deleted | **No** |
