# App Surface Architecture — ONE APP = ONE PRODUCT SURFACE

**Status:** Critical platform rule (2026-08-29)  
**Applies to:** Every Waypoint Studio application under the studio shell  
**Exception:** Studio Homepage (`/`) may introduce Dashboard plus sibling destinations  
**Canonical portfolio:** `docs/PRODUCT-DIRECTION.md` wins if this file disagrees

## Rule

**One app = one product surface.**

| Layer | Role |
|-------|------|
| **Waypoint Studio** | Parent platform — brand, global nav, footer, shared design system. **The Studio product is Dashboard.** |
| **Dashboard / Shed Hunting / Articles / Deck…** | Distinct destinations — each owns one job. Scenes is retained internally, not a public peer. |
| **Global nav** | Only place for cross-product discovery between public destinations |
| **App-local nav** | Destinations *inside* the current app (under global nav) |
| **App body** | Product work for *this* app only |

### Forbidden in app bodies

- Studio directory / “explore other apps” grids
- Promo cards whose primary purpose is sending users to another app (Scenes, Sheds, Articles, Side Trails, SignalTerrain, Global Signals, OpenRoad PA, Incubator, etc.)
- Mini Homepage collages that restate the studio portfolio
- Public promotion of unpublished Scenes

### Allowed

- **Homepage (`/`)** — Observe / Discover / Understand front door; Dashboard-first Studio entrance; may introduce Shed Hunting as a sibling, Publishing, and Deck. Do not redirect `/` to `/apps/dashboard/`.
- **Global primary nav** — Dashboard · Shed Hunting · Deck · Articles · Support · About
- **In-app local nav** — e.g. Dashboard Workspace · Customize
- **Honest outbound links** inside product workflows (e.g. “opens original publisher” on a conditions-related citation) when the *job* is still this app’s job — not portfolio marketing

## Three chrome layers

1. **Global shell** — brand, studio primary nav, footer (`was-global` / `was-footer`)
2. **Local nav** — app features only (`was-local` / `data-wds-app-local`)
3. **Body** — single product surface

## Homepage specifically

`/` is a **Dashboard-first Waypoint Studio entrance**. It introduces Dashboard as the Studio product, Shed Hunting as a public sibling (`/apps/shed-hunting/` overview), Publishing (Articles / Deep Forest Dispatch), and Deck as a distinct project.

Do **not** present Scenes as an active Studio application. Do **not** present Dashboard, Scenes, and Sheds as three equal Studio apps.

OpenRoad PA, Fieldry-as-promise, Savant-as-priority, and standalone Cyber/Global Signals
must not be presented as active Studio products (see `docs/PRODUCT-DIRECTION.md`).

## Dashboard specifically

`/apps/dashboard/` body = outdoor **instrument panel** for the user’s place:

- Today Outside
- Conditions · Air · Alerts · Light · Astronomy (and user-chosen instruments)
- Honest trust / freshness labels
- Customize / Workspace persistence

Not marketing, not an app directory, not decorative weather cards for other products. Do not deep-link users into unpublished Scenes.

## Shed Hunting specifically

- Public entrance: `/apps/shed-hunting/` (overview) — **Should I go shed hunting today?**
- Field interface: `/apps/shed-hunting/map/` — **Where should I look?**
- Map HUD is immersive (no studio primary nav); escape via the overview.
- Until `shedhunting.org` is activated (Phase 3), do not create external links to it. Phase 2 prep: `docs/sheds/SHEDHUNTING-ORG-PHASE-2.md`.

## Scenes specifically

Retained internally. URLs must keep working. Absent from primary nav, homepage, About/Support active lists, sitemap, and Dashboard public CTAs. `noindex` + robots Disallow.

## Tests

- `automation/test-app-surface-isolation.mjs` — permanent regression gate
- `automation/test-dashboard-instrument-panel.mjs` — Dashboard body + identity gate
- Homepage may introduce public destinations: `automation/test-homepage-front-door.mjs`
- Public architecture: `automation/test-studio-nav-architecture.mjs`, `automation/test-public-portfolio-reconciliation.mjs`

## Related

- Design System 2.0: `docs/DESIGN-SYSTEM-2.0.md`
- Product standards: `docs/PRODUCT_STANDARDS.md`
- Engineering playbook: `docs/ENGINEERING-PLAYBOOK.md`
