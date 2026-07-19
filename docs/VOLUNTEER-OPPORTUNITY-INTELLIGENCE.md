# Waypoint Volunteer — Opportunity Intelligence Engine v1

**Status:** Live on Discover (demo catalog)  
**Mission:** *What good can I do today?*  
**App:** [`/apps/waypoint-volunteer/discover.html`](../apps/waypoint-volunteer/discover.html)

---

## Purpose

Prioritize a short, meaningful set of opportunities with **plain-language reasons**.

Not a volunteer management system. Not registration. Not social media.

No leaderboards, likes, followers, public scores, guilt, or pressure.

---

## Architecture

```
Context (weather, season, day, location, private profile)
        ↓
Insight rules (hopeful / practical / seasonal copy)
        ↓
Per-opportunity soft scores (facets + weather + profile fit + distance)
        ↓
Today panel + ranked list + alternatives + map
```

| Module | Role |
|--------|------|
| `wds-volunteer-weather.js` | Open-Meteo context; fail-soft → `unavailable` |
| `wds-volunteer-intelligence.js` | Facets, weather suitability, scoring, `recommendToday` |
| `wds-volunteer-profile.js` | Private preferences (`localStorage`) |
| `wds-volunteer-planning.js` | Saved statuses |
| `wds-volunteer-impact.js` | Private completion tallies |
| `wds-volunteer-map.js` | Leaflet markers (today / saved / category) |
| `wds-volunteer-discover.js` | UI: Today panel, filters, detail, explanations |

Globals hang under `WDS.volunteer*`.

---

## Scoring model

Private **estimated** overall score (0–100), never published:

| Weight | Signal |
|--------|--------|
| 28% | Service impact (catalog facet) |
| 28% | Weather suitability (rules + setting) |
| 26% | Profile fit (causes, distance, duration, ability, access) |
| 10% | Outdoor suitability facet |
| 8% | Accessibility fit facet |

### Weather examples

- Cool + dry outdoor → boost trail / planting (“Excellent day for outdoor stewardship…”)
- Heavy rain → boost indoor/remote; lower outdoor cleanup
- High heat → lower long outdoor work; prefer shorter or indoor

### Honesty labels

| Label | Meaning |
|-------|---------|
| `demo` / `sample` | Catalog is educational sample data |
| `live` | Weather fetched from Open-Meteo |
| `unavailable` | Weather failed; gentle defaults |
| `estimated` | Soft scores — not scientific rankings |
| `private-local` | Profile / saves / impact on-device only |

---

## Facets (per opportunity)

Service impact, travel effort, outdoor suitability, accessibility, family/kid/senior/dog/wheelchair friendly, indoor/outdoor, duration, physical intensity, skill requirement, drop-in, recurring, remote/virtual, cause tags (conservation, trail-work, cleanup, food-security, citizen-science, …), optional impact metrics for private completion logging.

---

## UI surfaces

| Route | Purpose |
|-------|---------|
| `/apps/waypoint-volunteer/` | Foundation overview |
| `discover.html` | Today panel + filters + list/map + explanations |
| `saved/` | Private statuses |
| `profile/` | Private preferences |
| `impact/` | Private hours / causes / calm week count |

---

## Tests

```bash
node automation/test-waypoint-volunteer.mjs
```

Covers scoring, rain vs trail, filters, planning, profile, impact, nav, and anti-gamification copy.

---

## Known limitations

- Catalog is **demo sample** (Pike County–adjacent fiction) — not a live board.
- Coordinates are **approximate** for map demos only.
- Weather uses a default region unless the browser later supplies a fix.
- Impact metrics on completion use sample `impactMetrics` hints — estimated.
- “Weeks with help” is a calm private count — never presented as a competitive streak.
- No organization RSVP, hours verification, or sync.
- Map clustering is visual grouping via fitBounds; marker clustering library not required for v1.
- CI browser smoke may still flake independently of this engine.

---

## Quality bar

Calm. Useful. Private. Explained. Never gamified.
