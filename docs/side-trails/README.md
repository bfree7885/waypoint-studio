# Side Trails

**Route:** `/side-trails/`  
**Catalog:** `data/side-trails/catalog.json`

Side Trails is Waypoint Studio’s laboratory for sister projects — adjacent
experiments that deepen curiosity without competing as Home flagships.

Cards are rendered only from the JSON catalog. The HTML never hardcodes
project titles or CTAs.

---

## Projects (catalog)

| Id | Title | Status | CTA |
| --- | --- | --- | --- |
| `civic-trails` | Civic Trails | Beta | Explore Civic Trails |
| `signalterrain` | SignalTerrain | Experimental | Explore SignalTerrain |
| `global-signals` | Global Signals | Experimental | Explore Global Signals |

### SignalTerrain

- **Tagline:** Adaptive cyber intelligence for defenders.
- **Status:** Experimental
- **Landing:** [`signalterrain-landing.md`](signalterrain-landing.md)

### Global Signals

- **Tagline:** Understanding how world events shape everyday life.
- **Purpose:** Help people see how geopolitics, trade, infrastructure, weather, conflict, energy, cyber events, and policy ripple through supply chains and industries to citizens.
- **Status:** Experimental
- **Positioning:** Intelligence platform — **not** a news website
- **Landing:** [`global-signals.md`](global-signals.md)
- **Owner review:** [`../product/global-signals-owner-review.md`](../product/global-signals-owner-review.md)

---

## Files

| Path | Role |
| --- | --- |
| `side-trails/index.html` | Page shell |
| `data/side-trails/catalog.json` | Source of truth |
| `design-system/js/side-trails/wds-side-trails.js` | Catalog loader |
| `design-system/js/side-trails/wds-side-trails-app.js` | Card UI |
| `design-system/css/wds-side-trails.css` | Layout |
| `assets/images/side-trails/` | Icons |

---

## Related

- [`docs/product/side-trails-signalterrain-owner-review.md`](../product/side-trails-signalterrain-owner-review.md)
- [`docs/product/global-signals-owner-review.md`](../product/global-signals-owner-review.md)
- Incubator (`/incubator/`) remains the Coming later surface for maturing product visions.
