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
- **Purpose:** Relationship intelligence platform exploring how geopolitics, trade, infrastructure, policy, weather, cyber events, conflict, and economics ripple through industries to citizens.
- **Status:** Experimental
- **Positioning:** **Not** a news website. **Not** financial advice.
- **Landing notes:** [`global-signals.md`](global-signals.md)
- **Architecture:** [`../GLOBAL-SIGNALS-ARCHITECTURE.md`](../GLOBAL-SIGNALS-ARCHITECTURE.md)
- **Roadmap:** [`../GLOBAL-SIGNALS-ROADMAP.md`](../GLOBAL-SIGNALS-ROADMAP.md)
- **Owner review:** [`../product/global-signals-owner-review.md`](../product/global-signals-owner-review.md)
- **Relationship Engine (design only):** [`../GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md`](../GLOBAL-SIGNALS-RELATIONSHIP-ENGINE.md)
- **Citizen Impact Dashboard (design only):** [`../GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md`](../GLOBAL-SIGNALS-CITIZEN-IMPACT-DASHBOARD.md)
- **Cascading Impact Explorer (design only):** [`../GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md`](../GLOBAL-SIGNALS-CASCADING-IMPACT-EXPLORER.md)

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
