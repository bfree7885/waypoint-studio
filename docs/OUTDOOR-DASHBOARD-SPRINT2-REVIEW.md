# Outdoor Dashboard Sprint 2 — Live Intelligence Review

Review date: May 2026  
Scope: Connect dashboard to live outdoor intelligence providers.

---

## Live widgets connected

| Widget | Provider | Status |
|--------|----------|--------|
| Current Weather | Open-Meteo | Live — temp, feels like, humidity, wind, rain chance, today high/low |
| Hourly Forecast | Open-Meteo | Live |
| Weekly Forecast | Open-Meteo | Live |
| Wind | Open-Meteo | Live |
| UV Index | Open-Meteo | Live |
| Sunrise / Sunset | Open-Meteo | Live |
| Cloud Cover | Open-Meteo | Live |
| Golden Hour / Blue Hour | Computed from live sun times | Live when weather loads |
| Moon Phase / Illumination | Open-Meteo + ephemeris fallback | Live |
| Moonrise / Moonset | Open-Meteo daily astronomy | Live when available |
| Today's Outdoor Highlights | OIP + live weather + rules | Live/Educational mix |

---

## APIs integrated

- **Open-Meteo Forecast API** — current, hourly, daily, sunrise/sunset, moonrise/moonset/moon_phase
- **Browser geolocation** — optional, persisted, never forced
- **regions-index.json** — nearest county + ecological bundle resolution
- **Daylight utils** — golden hour, blue hour, moon phase math (no extra API)

---

## Widgets still using placeholders

~38 widgets remain Preview: air quality, USGS water gauges, trail/road closures, NPS alerts, bird migration API, safety indices (ticks, fire, pollen), conservation calendars, aurora, ISS, and several My Dashboard features.

---

## Remaining blockers

1. **USGS gauges** — no provider module yet (highest user value for water/trails)
2. **County-specific bundles** — all counties map to Pike County Preview ecological model
3. **Highlights refresh** — generated at OIP load; does not re-run if user refreshes a single weather widget (acceptable for MVP)
4. **Air quality** — needs dedicated provider (Open-Meteo or EPA)

---

## Highest-value widget to build next

**River Levels / Stream Flow (USGS)** — connects water section widgets to live gauge data; critical for kayakers, anglers, and hikers crossing streams.

---

## Persona check before leaving

| Activity | What works now |
|----------|----------------|
| Hike | Live weather, storm cues in highlights, trail editorial |
| Photography | Golden/blue hour, cloud cover, sunrise quality from live wx |
| Mushroom hunt | Rainfall observation + rule-based fruiting cues in highlights |
| Bike ride | Wind live, storm risk |
| Birding | Species editorial + migration text matching; no eBird yet |

---
