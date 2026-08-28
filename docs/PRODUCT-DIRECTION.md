# Waypoint Studio — Product Direction (canonical)

**Status:** Canonical · supersedes conflicting portfolio lists in older docs  
**Last updated:** 2026-08-27  
**Audience:** Owners, engineers, and coding agents

When documents disagree, **this file wins** for what Waypoint is building now.

Related: [`PRODUCT_STANDARDS.md`](PRODUCT_STANDARDS.md) (feel / trust / privacy) · [`APP-SURFACE-ARCHITECTURE.md`](APP-SURFACE-ARCHITECTURE.md) (one app = one surface) · [`ENGINEERING-PLAYBOOK.md`](ENGINEERING-PLAYBOOK.md) (how we ship)

---

## Mission

**Observe. Discover. Understand.**

*Capture what you find. Learn why it matters.*

Waypoint helps curious people pay attention to landscapes, nature, geography, environmental phenomena, and the physical world — without becoming a social network, LMS, newsroom, or engagement platform.

---

## Authoritative public portfolio

There are **five** active public Waypoint efforts. Do not invent additional portfolio categories to accommodate old code.

### Waypoint Studio (web)

| Experience | Job |
|------------|-----|
| **Dashboard** | Front door. Ambient situational awareness: what is happening, what is changing, what is worth attention. Conditions, weather, astronomy/light, outdoor opportunities — interpretation rather than a raw dump. Implementation: `docs/DASHBOARD-DISCOVER.md`. |
| **Scenes** | Photography, visual observation, interpretation, and discovery. Scenes + Publishing: `docs/SCENES-PUBLISHING.md`. |
| **Sheds** | Map-first shed hunting and field intelligence. Inspect / terrain honesty: `docs/sheds/SHEDS-V3-2-FIELD-INTELLIGENCE.md`. |

### Waypoint Deck (distinct project)

Local-first / offline Linux field computer. Direction includes offline maps, GPS, local knowledge, local AI, radio/SDR, communications, weather, sensors, field data, incident/resilience tools, and system/power/connectivity awareness.

Public copy must distinguish **existing**, **in development**, and **planned**. Do not claim planned functionality is operational. Do not implement Deck OS unless explicitly instructed.

Canonical public URL: `/side-trails/waypoint-deck/`. Primary navigation uses the label **Deck**. The `/side-trails/` collection URL silently redirects here. Do not rebuild a Side Trails catalog of discontinued projects.

### Waypoint Publishing

Editorial layer — useful outdoor / environmental / geographic storytelling. **Deep Forest Dispatch** is an active series inside Publishing. Publishing is not a fourth Studio software app.

---

## Shared platform (not separate consumer products)

- Content engine — articles, videos, visual stories, Dashboard cards, Scenes content, relevant Sheds education.
- Shared services — mapping/geospatial, location, weather, design system, navigation, accounts (when present), analytics.

### Business model (intent)

One **subscription** across the Studio web ecosystem. Deck commercial intent is a one-time OS purchase, not the Studio subscription. Do not invent public pricing.

---

## Primary navigation

**Dashboard · Scenes · Sheds · Deck · Articles · Support · About**

- **Articles** — public entry to Publishing (content surface, not a fourth Studio instrument).
- **Deck** — distinct field-computing project.
- Do not expose discontinued product names in primary nav, footer, homepage, About, Support, or sitemaps.

Homepage introduces the Studio trio first; Deck is discoverable but visibly distinct; Publishing/DFD is editorial.

---

## Visual identity

Southwestern-inspired family palette (deep plum, burnt orange, golden yellow, desert tan, warm brown). Dashboard, Scenes, Sheds, Deck, and Publishing may keep character while belonging to one family. Avoid generic SaaS blue.

---

## Agent contract

1. Build toward Dashboard · Scenes · Sheds + Deck + Publishing.  
2. Do not revive discontinued public products, experiments, or incubator catalogs. Reusable engineering may stay internal.  
3. Do not build Waypoint Deck OS in this repo unless explicitly instructed.  
4. Prefer KEEP / REFACTOR over DELETE for useful code; remove obsolete **public identity**.  
5. Prefer incremental consolidation over theoretical rewrites.
