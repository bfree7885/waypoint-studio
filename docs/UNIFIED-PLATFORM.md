# Waypoint Studio — Unified Platform Foundation

**Status:** Active architecture  
**Last updated:** Platform foundation sprint

This document describes the shared infrastructure that every Waypoint Studio application builds on.

---

## Mission

Waypoint Studio helps people observe, understand, create, and share the natural world.

The platform is designed around curiosity, learning, and calm craft — not popularity, competition, followers, likes, rankings, or engagement metrics.

---

## Public surfaces today

| Surface | Role |
|---------|------|
| Outdoor Intelligence Dashboard | Regional weather, light, trails, stewardship |
| ForageCast | Seasonal / habitat guidance |
| Fieldry | Private observation ledger & life list |
| Waypoint Scenes / Photo Coach | Photography coaching & visual observation |

## Product foundations (architecture-ready)

| Product | Path | Domain models |
|---------|------|----------------|
| Sheds | `apps/shed-hunting/` | FindRecord, cervid species catalog |
| Steepleaf | `apps/steepleaf/` | TeaEntry, BrewSession |
| SignalTerrain | `apps/signalterrain/` | Receiver, Incident |
| Savant Sommelier | `apps/savant-sommelier/` | PropertySite, Winery, Wine |

These are **real foundations** (landing, modules, data models, routes) — not finished products and not disposable stubs.

Terrainbound is **retired** and redirects to Fieldry / Dashboard.

---

## Shared platform kernel

| Module | Path | Purpose |
|--------|------|---------|
| Catalog | `design-system/js/platform/wds-platform-catalog.js` | Product registry for nav |
| Shell | `design-system/js/platform/wds-platform-shell.js` | Shared topbar / footer |
| Stores | `design-system/js/platform/wds-platform-stores.js` | Profile, locations, collections, settings |
| Foundation UI | `design-system/js/platform/wds-platform-foundation.js` | Landing renderer |
| Future data | `design-system/js/platform/wds-platform-future-data.js` | Disabled APIs / GIS / research exports |
| WOS extensions | `design-system/js/observations/wds-wos-extensions.js` | App-namespaced observation extensions |

Loaded via `design-system/js/wds.js` for dashboard surfaces; foundation apps may load modules directly.

### Local storage keys

| Key | Store |
|-----|--------|
| `waypoint-platform-profile-v1` | Shared user profile (private) |
| `waypoint-platform-locations-v1` | Saved locations |
| `waypoint-platform-collections-v1` | Collections / favorites |
| `waypoint-platform-settings-v1` | Accessibility, notifications, data flags |

---

## Unified observation model

Canonical research-grade schema: **Waypoint Observation Standard (WOS)**  
`design-system/observations/schema-v1.json` · `docs/WAYPOINT-OBSERVATION-STANDARD.md`

Runtime helpers: `WDS.observations` + `WDS.observations.extensions`

Every observation supports:

- unique id · application · type · timestamp · location  
- privacy (`private` / `shared` / `public` / `anonymized`)  
- environmental context · media · tags · notes  
- AI metadata (must be labeled) · confidence · licensing · sync state  

Apps extend via `observation.extensions[<appId>]` without mutating the core schema.

---

## Future data platform (disabled)

`WDS.futureData` reserves hooks for:

- APIs · GIS exports · research datasets · analytics  
- anonymous aggregates · conservation partnerships · enterprise licensing  

**No marketplace.** All features return `enabled: false` until intentionally developed.

---

## Design language

- Shared WDS tokens, typography (Cormorant + Inter), components  
- Product accents via `data-product`  
- Foundation landings use `wds-platform-foundation.css`  
- Progressive enhancement, accessibility, responsive layout required  

---

## Engineering rules

1. Prefer shared infrastructure over one-off app chrome  
2. Private by default  
3. Do not fake AI  
4. Label editorial vs live vs prediction  
5. Commit frequently; keep main shippable  
6. Smoke-test after platform changes  

---

## See also

- [PLATFORM-ARCHITECTURE.md](PLATFORM-ARCHITECTURE.md)  
- [ROADMAP.md](ROADMAP.md)  
- [WAYPOINT-OBSERVATION-STANDARD.md](WAYPOINT-OBSERVATION-STANDARD.md)  
- [WAYPOINT-STUDIO-CONSTITUTION.md](WAYPOINT-STUDIO-CONSTITUTION.md)
