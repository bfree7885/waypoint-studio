# Side Trails path — legacy / unlisted

**Status:** Not a current Waypoint Studio product section.  
**Canonical portfolio:** [`../PRODUCT-DIRECTION.md`](../PRODUCT-DIRECTION.md)

## Freeze rules (agents)

- **`/side-trails/` is legacy/unlisted infrastructure**, not a product category.
- Primary nav label for the Deck project is **Deck** → `/side-trails/waypoint-deck/`. That URL path is historical; it does **not** restore “Side Trails” as IA.
- Do **not** add “Side Trails” to primary nav, Home, About, footer, or sitemap.
- Do **not** infer that a catalog JSON or files under `side-trails/` mean Side Trails is part of current Studio IA.
- **Merged / deployed ≠ discoverable.** Verify discoverability from the live Home page navigation only.
- **Global Watch** is a **standalone** application (separate repository). Studio only hosts a noindex bridge at `/side-trails/global-watch/`.
- Owner discovery today (temporary): **Support → Experiences → Global Watch** → bridge → **LOCAL** `http://127.0.0.1:4173` when the owner runs the app. Not a permanent product location. Not a public cloud host.

## What lives under this path

| Path | Role |
|------|------|
| `/side-trails/waypoint-deck/` | Public Deck direction page (indexed) |
| `/side-trails/global-watch/` | Noindex Studio bridge to LOCAL field-test host |
| `/side-trails/` | Unlisted/noindex legacy catalog shell — not linked from Home/primary nav |
| Discontinued landings (SignalTerrain, Global Signals, OpenRoad) | Archived/retired; robots Disallow; not catalog peers |

## Catalog

`data/side-trails/catalog.json` may list Deck and Global Watch for the unlisted shell. That file is **not** a public product registry and must not drive Home or primary nav.
