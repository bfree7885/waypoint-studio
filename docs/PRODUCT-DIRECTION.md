# Waypoint Studio — Product Direction (canonical)

**Status:** Canonical · supersedes conflicting portfolio lists in older docs  
**Last updated:** 2026-08-25  
**Audience:** Owners, engineers, and coding agents

When documents disagree, **this file wins** for what Waypoint Studio is building now.

Related: [`PRODUCT_STANDARDS.md`](PRODUCT_STANDARDS.md) (feel / trust / privacy) · [`APP-SURFACE-ARCHITECTURE.md`](APP-SURFACE-ARCHITECTURE.md) (one app = one surface) · [`ENGINEERING-PLAYBOOK.md`](ENGINEERING-PLAYBOOK.md) (how we ship) · [`WAYPOINT-CONTENT-ENGINE.md`](WAYPOINT-CONTENT-ENGINE.md) (publishing specs)

---

## Mission

**Observe. Discover. Understand.**

*Capture what you find. Learn why it matters.*

Waypoint helps curious people pay attention to landscapes, nature, geography, environmental phenomena, and the physical world — without becoming a social network, LMS, newsroom, crisis-monitoring company, or Pennsylvania-government accountability platform.

---

## Active Waypoint Studio

One Waypoint ecosystem. Multiple specialized experiences.

| Experience | Job |
|------------|-----|
| **Dashboard** | **Discover** — front door to what is interesting outdoors near you or worth exploring (conditions, season, sky, landscape signals). Waypoint Intelligence helps surface what matters. |
| **Scenes** | **Explore & understand** — storytelling, visual exploration, photography craft, and understanding landscapes and phenomena. **Articles and videos are first-class** here. |
| **Sheds** | **Go / field exploration** — specialized map-first shed hunting: terrain, habitat, observations, field tools. Keep the specialty; do not dilute it into generic outdoor GIS. |

Implementation detail for Discover (sources, ranking, honesty): `docs/DASHBOARD-DISCOVER.md`.  
Ambient Intelligence (Phase 0 audit / plan only): `docs/DASHBOARD-AMBIENT-PHASE-0.md`.  
Scenes + Publishing (stories, DFD series, handoffs): `docs/SCENES-PUBLISHING.md`.  
Sheds field intelligence (Inspect / terrain / habitat honesty): `docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md`.

### Shared platform (not separate consumer products)

- **Waypoint Publishing / content engine** — Detect → Research → Verify → Write → Illustrate → Narrate → Produce → Publish → Measure. Powers articles, videos, visual stories, Dashboard cards, Scenes content, and relevant Sheds education. Includes Deep Forest Dispatch infrastructure reframed as Studio publishing capability.
- **Waypoint Intelligence & shared services** — mapping/geospatial, location, weather/environment, design system, navigation, accounts/subscription (when present), analytics, utilities/APIs.

### Business model (intent)

One **subscription** across the Studio ecosystem — not unrelated paywalls per app. Do not invent pricing in docs unless live pricing exists.

---

## Paused / retired (not active Studio products)

| Item | Status | Guidance |
|------|--------|----------|
| **Fieldry** | **Paused indefinitely** | Keep code; do not develop; no public “coming soon” or flagship language. |
| **OpenRoad PA** | **Retired** | Remove from active/public Studio promises. Preserve reusable mapping/GIS/ingestion only if useful elsewhere. |
| **Savant Sommelier** | **Not an active priority** | Keep if isolated; do not invest; no Studio architecture role. |
| **Cyber / SignalTerrain (as Studio apps)** | **Not standalone Studio products** | Preserve research/code in Side Trails / archive for possible **Waypoint Deck** inputs. |
| **Global Signals** | **Not a standalone Studio product** | Same — archive/research, not a Studio flagship. |
| **ForageCast / Steepleaf / Volunteer / similar** | Supporting or incubator only | Reachable if useful; never peers of Dashboard · Scenes · Sheds. |

---

## Separate project — Waypoint Deck

**Waypoint Deck is not a Waypoint Studio web application.**

**Public Side Trail:** `/side-trails/waypoint-deck/` · catalog featured as **in development**.

Long-term: offline-first Linux field/resilience computer with **local AI** at the center (maps, GPS, weather, radio/SDR, reference library, sensors, Global Signals concepts when connected, graceful degradation offline).

**Information sources (conceptual):** weather · GPS/maps · radio/SDR · sensors · offline knowledge · system status · cached data · **Global Signals when online** (archived research feeding Deck situational awareness — not a standalone product). AI is the intended synthesis/interface layer.

Commercial intent (Deck): one-time OS purchase + optional one-time packs — **not** the Studio subscription.

Do not implement Deck OS, local AI, SDR, or Global Signals integration unless explicitly instructed. Public pages must distinguish **planned / exploring** from **shipping**.

Do not treat Deck requirements as active Studio backlog.

---

## Primary navigation (Studio)

**Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About**

- **Articles** — public entry to Publishing (not a fourth “instrument” peer to Dashboard/Scenes/Sheds; a content surface).
- **Side Trails** — independent experiments. The **active** Side Trail is **Waypoint Deck** (offline-first Linux field computer). Older work (OpenRoad PA retired; SignalTerrain / Global Signals archived research) stays subordinate. Not Studio flagships.

Homepage may introduce mature tools. App bodies stay one product (`APP-SURFACE-ARCHITECTURE.md`).

---

## Publishing loop (strategy)

1. Waypoint detects something interesting  
2. Publishing creates useful content (article / video / story)  
3. Search/social/content bring people in  
4. Users explore Dashboard / Scenes / Sheds  
5. Some return and eventually subscribe  

Never claim automation or capabilities that do not exist.

---

## Visual identity

Southwestern-inspired family palette (purple, orange, golden yellow, tan, brown, warm terracotta). Dashboard, Scenes, and Sheds may keep character while clearly belonging to one family. Avoid random page-local palettes.

---

## Agent contract

1. Build toward Dashboard · Scenes · Sheds + Publishing + shared platform.  
2. Do not revive OpenRoad, Fieldry, Savant, Cyber, or Global Signals as Studio flagships.  
3. Do not build Waypoint Deck in this repo unless explicitly instructed.  
4. Prefer KEEP / REFACTOR / ARCHIVE over DELETE when unsure.  
5. Prefer incremental consolidation over theoretical rewrites.
