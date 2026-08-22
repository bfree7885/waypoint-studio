# App Surface Architecture — ONE APP = ONE PRODUCT SURFACE

**Status:** Critical platform rule (2026-08-10)  
**Applies to:** Every Waypoint Studio application under the studio shell  
**Exception:** Studio Homepage (`/`) may introduce multiple products

## Rule

**One app = one product surface.**

| Layer | Role |
|-------|------|
| **Waypoint Studio** | Parent platform — brand, global nav, footer, shared design system |
| **Dashboard / Scenes / Sheds / Articles / Side Trails…** | Distinct apps — each owns one job |
| **Global nav** | Only place for cross-product discovery between apps |
| **App-local nav** | Destinations *inside* the current app (under global nav) |
| **App body** | Product work for *this* app only |

### Forbidden in app bodies

- Studio directory / “explore other apps” grids
- Promo cards whose primary purpose is sending users to another app (Scenes, Sheds, Articles, Side Trails, SignalTerrain, Global Signals, OpenRoad PA, Incubator, etc.)
- Mini Homepage collages that restate the studio portfolio

### Allowed

- **Homepage (`/`)** — Observe / Discover / Understand front door; may introduce mature tools and mark Side Trails experimental
- **Global primary nav** — Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About
- **In-app local nav** — e.g. Dashboard Workspace · Customize
- **Honest outbound links** inside product workflows (e.g. “opens original publisher” on a conditions-related citation) when the *job* is still this app’s job — not portfolio marketing

## Three chrome layers

1. **Global shell** — brand, studio primary nav, footer (`was-global` / `was-footer`)
2. **Local nav** — app features only (`was-local` / `data-wds-app-local`)
3. **Body** — single product surface

## Dashboard specifically

`/apps/dashboard/` body = outdoor **instrument panel** for the user’s place:

- Today Outside
- Conditions · Air · Alerts · Light · Astronomy (and user-chosen instruments)
- Honest trust / freshness labels
- Customize / Workspace persistence

Not marketing, not an app directory, not decorative weather cards for other products.

## Tests

- `automation/test-app-surface-isolation.mjs` — permanent regression gate
- `automation/test-dashboard-instrument-panel.mjs` — Dashboard body + identity gate
- Homepage may still promote products: `automation/test-homepage-front-door.mjs`

## Related

- Design System 2.0: `docs/DESIGN-SYSTEM-2.0.md`
- Product standards: `docs/PRODUCT_STANDARDS.md`
- Engineering playbook: `docs/ENGINEERING-PLAYBOOK.md`
