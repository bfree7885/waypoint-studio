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

### SignalTerrain (second project)

- **Tagline:** Adaptive cyber intelligence for defenders.
- **Description:** SignalTerrain helps individuals and organizations understand what cyber threats matter today by combining trusted public intelligence with explainable defensive guidance.
- **Status:** Experimental
- **Button:** Explore SignalTerrain → `/side-trails/signalterrain/` product landing
- **Icon:** `assets/images/side-trails/signalterrain-network.svg` (cyber / network motif)
- **Product landing:** [`signalterrain-landing.md`](signalterrain-landing.md)

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
- Incubator (`/incubator/`) remains the Coming later surface for maturing product visions.
