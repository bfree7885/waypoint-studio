# Owner Review — Waypoint Studio navigation architecture alignment

**Date:** 2026-08-06  
**Branch:** `feature/studio-nav-architecture-alignment`  
**Start SHA:** `aa408fa5a6ef9e76712242bc06edbcaf2d557f82`  
**End SHA:** `861e9edc1b0d321b763c410b4f2bd1ad1ade9738`
**Base tip:** Side Trails lineage (`aa408fa5a6ef9e76712242bc06edbcaf2d557f82`)
**Deployed:** No  
**Merged:** No  
**Author commit identity:** Bryan Freeman \<bfree7885@gmail.com\>

---

## Verdict

**Approve aligning shared navigation, catalogs, and directory surfaces to the current Waypoint Studio architecture.**

No visual redesign. Quiet Home chrome remains intentionally minimal.

---

## Current architecture (source of truth)

Shared primary / architecture nav must expose:

1. **Dashboard**
2. **Scenes**
3. **Sheds**
4. **Articles**
5. **Side Trails**
6. **Support**
7. **About**

Retired as **primary peers** (apps may still exist): Volunteer, SignalTerrain, Steepleaf, Savant, Fieldry, ForageCast, Landscape Interpretation.

SignalTerrain / Civic Trails belong under **Side Trails**, not as top-level studio peers.

---

## Audit — menus / catalogs / listings found

| Surface | Before | After |
| --- | --- | --- |
| `wds-app-nav-config.js` `studioPrimaryNav` | Home · Scenes · Sheds · Articles · About (or partial Side Trails WIP) | **Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About** |
| `nav-registry.json` | Apps catalog without studio primary contract | Adds `studioPrimaryNav` + `architectureNavLabels` + home buckets |
| `product-registry.json` `portfolio.core` | ForageCast / Fieldry / photo-coach as core peers | Dashboard, Scenes, Sheds, Articles, Side Trails (+ studio); Support/About in `studioChrome`; demoted peers in foundations |
| `wds-platform-catalog.js` | ForageCast/Fieldry `tier: core`; SignalTerrain foundation peer | Architecture cores; ForageCast/Fieldry supporting; SignalTerrain `tier: side-trails` with parent; Volunteer/Steepleaf/Savant incubator |
| App Shell primary nav | Five Home-era items; no Side Trails/Support active states | Seven-item config; active states for Side Trails + Support |
| App Shell footer | Trust-only (Contact · Privacy · Terms) | **Unchanged** (RC1.2 intentional) |
| Quiet Home `/` Rebuild chrome | Hides studio primary nav | **Unchanged** — documented exception below |
| `about.html` | Home-centric primary list; incomplete architecture | Full seven-item primary products + honest demotions |
| `support.html` Experiences | Mixed Home/Coming later cards | Seven architecture cards; Coming later demoted to caption |
| `404.html` | Near-complete; Home label | Dashboard-first seven + Contact + Coming later |
| `incubator/index.html` | Called Volunteer a primary; SignalTerrain as incubator peer | Correct architecture begin links; Steepleaf/Savant/Volunteer incubator; Side Trails for SignalTerrain |
| `js/studio-home.js` | Fallback listed Volunteer; primary fallback included volunteer | Architecture fallback links; incubator includes Volunteer; Side Trails section for SignalTerrain |
| `sitemap.xml` | Missing Side Trails; incubator apps at peer-ish priority | Side Trails + SignalTerrain landing; demoted secondary priorities |
| `site.webmanifest` | Studio start at `/` | **Unchanged** (start URL, not an app directory) |
| Explore launcher | Full app catalog by category | **Unchanged** — secondary discovery, not primary architecture nav |

---

## Intentional exceptions

1. **Quiet Home chrome** — Rebuild Home at `/` and `/apps/dashboard/` keeps quiet chrome: brand + local Workspace/Customize only. It does **not** force Side Trails / Support / About into the first viewport. Secondary/global and directory surfaces carry the seven-item architecture.
2. **Product name “Home”** — Quiet Rebuild may still present the outdoor workspace as **Home** (`data-product-name="Home"`). Architecture nav / catalogs use **Dashboard** as the shared label for that experience.
3. **Trust footer** — Remains Contact · Privacy Policy · Terms (Home RC1.2). Architecture destinations stay in primary nav / directory pages, not reintroduced as a dense footer IA.
4. **Explore launcher** — Still lists live/foundation apps for discovery. It is not the primary architecture contract.
5. **Incubator / Side Trails** — May still mention experimental work (SignalTerrain under Side Trails; Steepleaf/Savant/Volunteer under Incubator).

---

## Tests

```bash
node automation/test-studio-nav-architecture.mjs
node automation/test-home-rc1.mjs
node automation/test-side-trails.mjs
node automation/test-platform-foundation.mjs
```

---

## Risks / remaining

1. Older docs under `docs/rebuild-2026/` still describe Home · Scenes · Sheds · Articles · About as primary — historical; this review supersedes for architecture nav.
2. Explore launcher can still surface demoted apps — by design for discovery; owner may later want a quieter Explore.
3. Constitution still says users say “Home”; Dashboard is the architecture label — keep both honest in copy.

---

## Recommendation

**Approve and push.** Do not merge until owner confirms Dashboard labeling vs quiet Home naming is acceptable site-wide.
