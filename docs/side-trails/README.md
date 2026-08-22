# Side Trails

**Route:** `/side-trails/`  
**Catalog:** `data/side-trails/catalog.json`  
**Status:** Production integration (simple landing)  
**Hierarchy:** Waypoint Studio → Side Trails → (catalog projects)

Side Trails is the permanent home for experimental projects, research,
prototypes, intelligence tools, and special-interest applications beside
Waypoint Studio’s primary outdoor tools.

The landing is intentionally simple: a short introduction and project cards.
There is **no** search, categories UI, filters, or dashboard chrome.

Cards render from a minimal JSON catalog. The page shell does not hardcode
project titles or CTAs.

---

## Projects (production set)

| Id | Title | Status | Open |
| --- | --- | --- | --- |
| `civic-trails` | Civic Trails | Beta | GitHub (`bfree7885/civic-trails`) |
| `signalterrain` | SignalTerrain | Experimental | `/side-trails/signalterrain/` |
| `global-signals` | Global Signals | Experimental | `/side-trails/global-signals/` |

### Card fields

Each card shows: icon · title · tagline · short description · status badge · **Open** button.

### Civic Trails

- Evidence-first civic transparency GIS (public records; certainty labeled).
- Open → public GitHub repository until a hosted product URL is confirmed.
- Civic Trails application engineering lives in a **separate repo** (`bfree7885/civic-trails`); Studio only catalogs and links out.

### SignalTerrain

- **IA home:** Waypoint Studio → Side Trails → SignalTerrain (not a studio primary peer; not Incubator)
- Adaptive cyber intelligence for defenders.
- Open → product landing at `/side-trails/signalterrain/` (existing app remains at `/apps/signalterrain/`).
- Details: [`signalterrain-landing.md`](signalterrain-landing.md)
- IA move review: [`docs/product/signalterrain-side-trails-move-owner-review.md`](../product/signalterrain-side-trails-move-owner-review.md)

### Global Signals

- **Tagline:** Understanding how world events shape everyday life.
- Relationship intelligence foundation (docs, landing, placeholders) — not live engines.
- **Not** a news website. **Not** financial advice.
- Open → `/side-trails/global-signals/`
- Landing notes: [`global-signals.md`](global-signals.md)
- Architecture / roadmap: [`../GLOBAL-SIGNALS-ARCHITECTURE.md`](../GLOBAL-SIGNALS-ARCHITECTURE.md), [`../GLOBAL-SIGNALS-ROADMAP.md`](../GLOBAL-SIGNALS-ROADMAP.md)
- Owner review: [`../product/global-signals-owner-review.md`](../product/global-signals-owner-review.md)
- Relationship Engine (design only): [`../GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md`](../GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md)
- Citizen Impact Dashboard (design only): [`../GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md`](../GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md)
- Cascading Impact Explorer (design only): [`../GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md`](../GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md)

### Intentionally omitted

- Search, category filters, and admin/dashboard surfaces on the Side Trails landing.
- Live Global Signals engines (relationship / cascade / citizen-impact remain design + placeholder surfaces).

---

## Files

| Path | Role |
| --- | --- |
| `side-trails/index.html` | Simple page shell |
| `data/side-trails/catalog.json` | Three-project catalog |
| `design-system/js/side-trails/wds-side-trails.js` | Catalog loader |
| `design-system/js/side-trails/wds-side-trails-app.js` | Card UI |
| `design-system/css/wds-side-trails.css` | Layout (reuses `wcs-page` / `was-home__card`) |
| `assets/images/side-trails/` | Icons |
| `automation/test-side-trails.mjs` | Smoke checks |
| `automation/test-signalterrain-side-trails-move.mjs` | IA placement smoke checks |
| `automation/test-global-signals.mjs` | Global Signals foundation smoke |

Light discovery links (no IA redesign): About, Support, 404, Incubator (pointer only for SignalTerrain).

---

## Related

- [`docs/product/signalterrain-side-trails-move-owner-review.md`](../product/signalterrain-side-trails-move-owner-review.md) — architecture placement under Side Trails
- [`docs/product/side-trails-production-integration-owner-review.md`](../product/side-trails-production-integration-owner-review.md)
- [`docs/product/side-trails-signalterrain-owner-review.md`](../product/side-trails-signalterrain-owner-review.md) (earlier catalog expansion)
- [`docs/product/global-signals-owner-review.md`](../product/global-signals-owner-review.md)
- Incubator (`/incubator/`) remains Coming later for maturing product visions (Steepleaf, Savant, Volunteer). SignalTerrain and Global Signals are listed under Side Trails.
