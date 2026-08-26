# Waypoint Studio — Product Direction (canonical)

**Status:** Canonical · supersedes conflicting portfolio lists in older docs  
**Last updated:** 2026-08-26  
**Audience:** Owners, engineers, and coding agents

When documents disagree, **this file wins** for what Waypoint Studio is building now.

Related: [`PRODUCT_STANDARDS.md`](PRODUCT_STANDARDS.md) (feel / trust / privacy) · [`APP-SURFACE-ARCHITECTURE.md`](APP-SURFACE-ARCHITECTURE.md) (one app = one surface) · [`ENGINEERING-PLAYBOOK.md`](ENGINEERING-PLAYBOOK.md) (how we ship) · [`WAYPOINT-CONTENT-ENGINE.md`](WAYPOINT-CONTENT-ENGINE.md) (publishing specs)

---

## Mission

**Observe. Discover. Understand.**

*Capture what you find. Learn why it matters.*

Waypoint helps curious people pay attention to landscapes, nature, geography, environmental phenomena, and the physical world — without becoming a social network, LMS, newsroom, or crisis-monitoring company.

---

## Active portfolio

### Waypoint Studio

| Experience | Job |
|------------|-----|
| **Dashboard** | **Discover** — front door to what is interesting outdoors near you or worth exploring (conditions, season, sky, landscape signals). Waypoint Intelligence helps surface what matters. |
| **Scenes** | **Explore & understand** — storytelling, visual exploration, photography craft, and understanding landscapes and phenomena. **Articles and videos are first-class** here. |
| **Sheds** | **Go / field exploration** — specialized map-first shed hunting: terrain, habitat, observations, field tools. Keep the specialty; do not dilute it into generic outdoor GIS. |

Implementation detail for Discover: `docs/DASHBOARD-DISCOVER.md`.  
Scenes + Publishing: `docs/SCENES-PUBLISHING.md`.

### Waypoint Publishing

Shared infrastructure — not a fourth Studio “instrument.”

- **Articles** — curated field reading.
- **Videos** — narrated companions when a story earns film.
- **Deep Forest Dispatch** — editorial series / label under Publishing when useful.

Loop: **Discover → Understand → Read/Watch → Explore.**

### Side Trails

Independent projects beside Studio. Not flagships.

| Experience | Job |
|------------|-----|
| **Waypoint Deck** | Offline-first Linux field computer: local AI, maps/GPS, weather, radio/SDR, offline knowledge, sensors, and situational awareness when connectivity exists. |

Public route: `/side-trails/waypoint-deck/`. Catalog featured as **in development**.

There is no public archive of other Side Trails.

---

## Shared platform (not separate consumer products)

- **Waypoint Publishing / content engine** — Detect → Research → Verify → Write → Illustrate → Narrate → Produce → Publish → Measure.
- **Waypoint Intelligence & shared services** — mapping/geospatial, location, weather/environment, design system, navigation, analytics, utilities/APIs.
- **Deck signal ingestion** (internal) — `scripts/deck-signals/` writes situational-awareness artifacts for future Deck use. Not a public product.

### Business model (intent)

One **subscription** across the Studio ecosystem — not unrelated paywalls per app. Do not invent pricing in docs unless live pricing exists.

---

## Separate project — Waypoint Deck

**Waypoint Deck is not a Waypoint Studio web application.**

Long-term: offline-first Linux field/resilience computer with **local AI** at the center (maps, GPS, weather, radio/SDR, reference library, sensors, external situational-awareness signals when connected, graceful degradation offline).

**Information sources (conceptual):** weather · GPS/maps · radio/SDR · sensors · offline knowledge · system status · cached data · **external situational-awareness signals when online**. AI is the intended synthesis/interface layer.

Those inputs are **not separate products**.

Commercial intent (Deck): one-time OS purchase + optional one-time packs — **not** the Studio subscription.

Do not implement Deck OS, local AI, or SDR unless explicitly instructed. Public pages must distinguish **planned / exploring** from **shipping**.

---

## Do not feature

Keep code if deletion is risky. Do not surface in navigation, catalogs, docs strategy, or marketing:

- **Fieldry** — paused indefinitely.
- **Savant Sommelier** — dropped / inactive.

Do not create archive cards for them.

---

## Primary navigation (Studio)

**Dashboard · Scenes · Sheds · Articles · Side Trails · Support · About**

- **Articles** — public entry to Publishing.
- **Side Trails** — independent projects; currently **Waypoint Deck** only.

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

1. Build toward Dashboard · Scenes · Sheds + Publishing + Waypoint Deck (Deck only when instructed).  
2. Do not revive removed product identities as Studio or Side Trail flagships.  
3. Do not build Waypoint Deck in this repo unless explicitly instructed.  
4. Do not create public archives, retired lists, or graveyards for deleted products.  
5. Prefer incremental consolidation over theoretical rewrites.
