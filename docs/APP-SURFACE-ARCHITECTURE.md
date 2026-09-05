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

`/` is a **Dashboard-first Waypoint Studio entrance**. It introduces Dashboard as the Studio product, Shed Hunting as a public sibling (`https://shedhunting.org/` overview), Publishing (Articles / Deep Forest Dispatch), and Deck as a distinct project.

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

- Public entrance: `https://shedhunting.org/` (overview) — **Should I go shed hunting today?**
- Field interface: `https://shedhunting.org/map/` — **Where should I look?** plus Field Hunt, Hunt Track, and private observations.
- Map HUD is immersive (no studio primary nav); escape via the overview.
- Studio legacy routes noindex and cut over to the dedicated host. See `docs/sheds/SHEDHUNTING-ORG-PHASE-3C.md`.
- Version sequence and V2.x flagship dynamic search-priority map: `docs/sheds/SHEDS-PRODUCT-ROADMAP.md`. Do not implement that map in V1.7.

## SignalTerrain (SOTA) specifically

In-development, unpublished. Product name **SignalTerrain**. Route: `/apps/summit-signal/`. Map-first SOTA explorer with a V0.2 OpenStreetMap candidate access layer, V0.3 user-selected hiking routes, V0.4 terrain-derived Activation Zone, V0.5 fixture coverage for a second W2/GC summit, V0.6 Route to Activation Zone, V0.7 Activation Plan + Field Readiness, and V0.8 field-test start inspection with a Maps handoff to the selected trailhead; not a Studio architecture peer. V0.9 field-test host is the unlisted github.io companion `https://bfree7885.github.io/waypoint-studio-site/apps/summit-signal/` — not `waypointstudio.org`, not a `main` merge. Keep it off primary nav, homepage, About/Support active lists, and the sitemap. `noindex` + robots Disallow. Do not couple it to Shed Hunting modules. Do not occupy `/apps/signalterrain/` (retired SignalTerrain Cyber redirect). Do not import `design-system/signalterrain/**` or `wds-signalterrain-*`. See `docs/signal-terrain/V0.1.md`, `docs/signal-terrain/V0.2.md`, `docs/signal-terrain/V0.3.md`, `docs/signal-terrain/V0.4.md`, `docs/signal-terrain/V0.5.md`, `docs/signal-terrain/V0.6.md`, `docs/signal-terrain/V0.7.md`, `docs/signal-terrain/V0.8.md`, and `docs/signal-terrain/V0.9.md`.

**SignalTerrain (SOTA/outdoor, unpublished) is a new product definition and is not the retired SignalTerrain Cyber product.** The “SignalTerrain” mention in Forbidden promo cards above refers to not promoting the *retired cyber* product (or this unpublished SOTA app) from other app bodies.

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
