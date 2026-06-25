# Outdoor Dashboard Sprint 1 — Product Review

Review date: May 2026  
Scope: Homepage transformed to dashboard-only mission control (`outdoor-dashboard`).

---

## Wildlife photographer

**Immediately valuable**
- Vitals row: current weather, hourly forecast, wind — no scrolling required
- Sunrise / sunset / golden hour widgets with summary lines in card headers
- Photography section: sunrise quality, cloud cover, fog potential, Milky Way moon-phase heuristic
- Field cues (Happening Now) in header strip

**Weak spots**
- No live golden-hour API — editorial daylight slice only
- Aurora and Milky Way need astronomy providers

---

## Mushroom hunter

**Immediately valuable**
- Mushroom outlook + recent rainfall + seasonal edibles
- Trail conditions and storm risk for route timing
- ForageCast link from mushroom widget

**Weak spots**
- Fruiting models still editorial, not moisture-index driven
- No elevation-band moisture

---

## Birder

**Immediately valuable**
- Bird migration widget with species-filtered editorial data
- Wildlife activity + insect/amphibian companion widgets
- Sun/Moon timing for dawn chorus

**Weak spots**
- No eBird or radar integration yet
- Migration widget depends on observation text matching

---

## Weekend hiker

**Immediately valuable**
- Weekly + hourly forecast, UV, trail conditions
- Storm risk and heat risk safety widgets
- Outdoor pulse + weekend question in header

**Weak spots**
- Trail conditions are editorial placeholders, not user reports
- No parking or closure live feeds

---

## Mountain biker

**Immediately valuable**
- Wind, storm risk, trail conditions
- Recent rainfall for mud vs. tack
- Park alerts placeholder shows where live data will land

**Weak spots**
- No trail-specific wet/dry index
- Parking updates not connected

---

## Teacher planning a field trip

**Immediately valuable**
- Clear section taxonomy (Conditions, Wildlife, Safety, Conservation)
- Customize dashboard to show only relevant widgets for student groups
- Fieldry + Species links for post-trip recording

**Weak spots**
- No printable field-trip preset yet
- Conservation volunteer widget is placeholder

---

## Highest priority live API next

**Current Weather / Hourly Forecast (Open-Meteo)** — already wired; ensure reliability and summary lines update from live package after mount.

**Next provider to connect:** **USGS stream gauges → River Levels / Stream Flow** — highest impact for kayakers, anglers, and hikers crossing water.

---

## Remaining placeholders

~40 widgets use preview/editorial data until OIP providers connect: air quality, water gauges, road/trail closures, astronomy APIs, safety indices (ticks, fire, pollen), conservation calendars, and several My Dashboard features (favorites, goals).

---
