# Dashboard Instrument Intelligence (2026-08-12)

Function / intelligence / information-quality pass on production Dashboard Rebuild.
**Visual design remains frozen** (semi-realistic field art `5.2.0` unchanged in intent).

Branch context: `feat/dashboard-instrument-intelligence`  
Baseline production: PR #27 / `5541961484cd8b76deac1145023a4f771b6260a2`

---

## 1. Baseline test failure — root cause and repair

### Symptom
CI job **Dashboard Today Outside tests** failed on production `main` before and after the art PR.

### Root cause
Assertions still expected the **Outdoor OS** product surface:

- Outdoor OS stylesheet (`wds-dashboard-os.css`)
- Product title / nav features for Outside OS
- Engine path that boots Outdoor OS as the live product

Production `/apps/dashboard/` had already moved to **Dashboard Rebuild Home**:

- Loads `wds-dashboard-rebuild.css`
- Product titled **Dashboard**
- Nav features: Workspace + Customize
- `home-boot.js` mounts `dashboardRebuild.mount` and explicitly does **not** boot Outdoor OS

The tests were **stale contracts**, not a live data or art regression.

### Repair
Updated `automation/test-dashboard-today-outside.mjs` to assert the Rebuild Home contracts above (without deleting coverage for OS module presence, engine anti-fallthrough, or Today Summary unit behavior).

### Result
`node automation/test-dashboard-today-outside.mjs` → green.

---

## 2. Instrument inventory and purpose

Source of truth: `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-registry.js` (12 instruments).

| ID | Title | Default | Question answered | Decision supported | Primary measurement | Secondary that matters | Trend/forecast? | Redundant? | Missing? | ~2–3s readable? | Actionable? | Duplicates? | Recommendation |
|----|-------|---------|-------------------|--------------------|---------------------|------------------------|-----------------|------------|----------|-----------------|-------------|-------------|----------------|
| `ph-conditions` | Conditions | yes | What is it like outside right now? | Dress, leave now vs later | Temp + sky | Feels-like, wind, humidity, precip chance | Current enough; trend lives in Next Hours | Slight overlap with Wind/Comfort | Pressure/visibility when available | Yes | Yes | Partial overlap with Wind/Comfort | **KEEP + IMPROVE** — emphasize feels-like only when delta ≥3°; optional pressure trend later |
| `ph-next-hours` | Next hours | yes | What changes soon? | Timing of outing | Hourly temp/sky/precip | Wind if present | **Forecast critical** | Overlaps Rain timing on precip | Gust trend | Yes | Yes | Partial with Rain timing | **KEEP + IMPROVE** — highlight first elevated precip hour |
| `ph-doorway` | Before you go | yes | What should I know before stepping out? | Go / wait / prepare | Derived brief (signals) | 2–4 condensed facts | Derived from current + near-term | Previously restated raw numbers | — | Yes (after intel) | Yes | Should synthesize, not duplicate Conditions | **KEEP + IMPROVE** — done this pass: signal-driven brief |
| `ph-alerts` | Alerts | yes | Is there an official hazard? | Cancel / harden plans | NWS alert presence | Severity, event type, timing | Expiry matters | No | Expiry in UI | Yes | Yes | — | **KEEP + IMPROVE** — surface effective/expires when present |
| `ph-air` | Air | yes | Is outdoor air OK? | Sensitive-group go/no-go | US AQI | Category, PM2.5 | Trend only if temporal feed exists | No | Pollutant detail optional | Yes | Yes | — | **KEEP + IMPROVE** — category-first hierarchy |
| `ph-precip-window` | Rain timing | yes | When does rain chance rise? | Leave before / after wet window | Elevated precip hour | Peak 12h | **Timing critical** | Overlaps Next Hours | Intensity/type | Medium | Yes | Partial Next Hours | **KEEP + IMPROVE** — lead with “next elevated” not peak alone |
| `ph-uv` | UV | yes | How strong is sun exposure now? | Shade / cover decisions | UV now | Today max | Peak helpful | Mild overlap with Light | Time of peak | Yes | Yes | Mild with Light | **KEEP** |
| `ph-light` | Light | yes | Where are we in the daylight cycle? | Photo / walk timing | Sunrise/sunset | Golden/blue when known | Window timing | Mild UV overlap | Solar elevation if reliable | Yes | Yes | Mild UV | **KEEP + IMPROVE** — connect to light signals when present |
| `ph-astronomy` | Astronomy | yes | What is the night-sky context? | Stargaze / night photo interest | Moon phase + illumination | Cloud obstruction | Night + cloud matters | No | Moonrise/set when available | Medium | Conditional | — | **KEEP + IMPROVE** — never claim excellent skies on moon alone |
| `ph-wind` | Wind | optional | How windy is it? | Exposed terrain / telephoto | Speed | Gusts, direction | Gusts critical | Overlaps Conditions wind | Trend | Yes | Yes | Conditions | **KEEP** (optional) |
| `ph-comfort` | How it feels | optional | Does it feel different than the reading? | Layering | Feels-like vs air temp | Humidity | Current | Overlaps Conditions | Heat index wording | Yes | Mild | Conditions | **MERGE** candidate long-term into Conditions when delta small; **KEEP** for now |
| `ph-day-range` | Today’s range | optional | What is today’s envelope? | Pack for high/low | High / low | Day precip prob | Daily | Mild Conditions overlap | — | Yes | Mild | Conditions | **KEEP** (optional) |

### Recommendation counts

| Status | Count |
|--------|------:|
| KEEP | 2 (`ph-uv`, `ph-wind`) |
| KEEP + IMPROVE | 9 |
| MERGE | 1 (`ph-comfort` — candidate later, not executed) |
| REMOVE | 0 |
| DEFER | 0 |

No instruments invented this pass. No instruments removed.

---

## 3. Normalized environmental state

Module: `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js`  
API: `WDS.dashboardRebuildIntel.normalizeEnvState(platform, location, now)`

Produces a single client-side object from already-fetched OIP/platform packages:

- **location** — label, lat/lng, timezone (nullable when unknown)
- **weather** — temp, apparent, humidity, dew point, cloud, visibility, pressure, UV, conditions, precip now, wind/gust/dir, daily high/low/UV max when present
- **precipWindow** — next elevated ≥40%, peak 12h, later (~2–3h) probability
- **air** — AQI, category, PM2.5
- **light** — sunrise/sunset ISO + formatted, solar elevation, kind
- **astronomy** — illumination %, phase, phase value
- **alerts** — status, count + items (`alert-none` only when status is `live` or `empty`)
- **meta** — cache/stale/hasWeather

Unavailable fields remain `null`. No fabricated measurements.

`WDS.dashboardRebuildData.fromPlatform` attaches `intel: analyze(...)` for workspace consumers without extra network I/O.

---

## 4. Derived signal catalog

`deriveSignals(state)` — deterministic rules only.

| ID | Category | When | Noteworthy default | Score band |
|----|----------|------|--------------------|------------|
| `alert-active` | alerts | ≥1 NWS item | yes | 100 |
| `alert-none` | alerts | live/empty alerts package with zero items | no | 5 |
| `precip-active` | precipitation | raining / measurable precip now | yes | 78 |
| `precip-ending` | precipitation | active or high now + later prob low | yes | 40–42 |
| `precip-dry-now` | precipitation | now ≤10% and no near elevated | no | 12 |
| `precip-soon` | precipitation | elevated ≥40% within ~3h | yes | 55–80 |
| `wind-gusts` | wind | gust ≥30 mph | yes | 60–80 |
| `wind-breezy` | wind | sustained ≥18 | yes | 28 |
| `wind-calm` | wind | ≤6 mph | no | ~10 |
| `temp-freezing` | temperature | ≤32°F | yes | 70 |
| `temp-heat` | temperature | apparent ≥90 | yes | 62+ |
| `comfort-humid` | temperature | ≥72°F and humidity ≥70% | low | 22 |
| `air-good` | air | AQI ≤50 | no | 10 |
| `air-moderate` | air | 51–100 | yes | 34 |
| `air-unhealthy-*` | air | >100 | yes | 72 |
| `light-golden-approaching` | light | sunset in 0–75 min | yes | 30–48 |
| `light-blue-hour` | light | daylight kind contains blue | yes | 40 |
| `uv-high` | light | UV ≥6 | yes | 36 |
| `astro-dark-moon-clear` | astronomy | illum ≤5%, clouds ≤45%, night (after sunset or before sunrise) | yes | 26–44 |
| `astro-bright-moon-cloudy` | astronomy | illum ≥90%, clouds ≥70% | no | 14 |
| `light-daylight-remaining` | light | 75–240 min to sunset | no | 11 |
| `light-sunrise-soon` | light | sunrise in 0–90 min | yes | 38 |

Each signal includes: `id`, `category`, `title`, `summary`, `severity`, `confidence`, `evidence[]`, optional `validUntil`, `relatedInstrumentIds`, optional `toolLinks`.

---

## 5. Evidence / explainability model

Evidence entries: `{ metric, value, source }` where `source` is `weather`, `weather.hourly`, `air`, `nws`, `daylight`, `astronomy`, or `computed`.

UI default: Before You Go shows the brief + condensed facts only.  
Debug / future expanders can read `signal.evidence` or `beforeYouGo.evidence` / `pack.intel`.

---

## 6. Before You Go logic

`composeBeforeYouGoBrief(state, signals)`:

1. Pick at most one signal per category (alerts preferred first).
2. Build 2–3 short clauses from comfort, precip (skip pure dry filler unless sparse), wind (skip calm filler), significant air, alerts, noteworthy light/astro.
3. Capitalize; end with period.
4. Attach ≤4 supporting facts with Live/Derived notes.
5. Trust chip remains **derived**.

Renderer: `renderDoorwayBrief` → `.wdb-r-widget__brief` + facts. No layout redesign.

---

## 7. Happening Now ranking

`happeningNow(state)` → `rankSignals(signals, { noteworthyOnly: true, minScore: 25, limit: 5 })`.

Ranking factors (deterministic score already encodes urgency/magnitude/proximity):

- Alerts outrank comfort
- Active precip / gusts / freezing / unhealthy air score high
- Ordinary dry/calm/good-air stay below threshold → **empty list is valid**

Capability is available on `pack.intel.happeningNow` and `Intel.happeningNow`. No new homepage chrome required this pass.

---

## 8. Contextual Waypoint-tool linking

`contextualLinksFor(signals)`:

- Only emits links attached by signal rules.
- Hard filter: only `scenes` is eligible today (`/apps/scenes/`).
- Fired for justified light/astro windows (golden hour with manageable cloud, blue hour, sunrise window, dark-moon + clearer skies).
- Sheds / ForageCast **not** surfaced (no relevance model / unfinished promotion).

---

## 9. Fixture / test matrix

`automation/test-dashboard-rebuild-intel.mjs` (also CI):

1. Calm clear summer afternoon  
2. Hot/humid afternoon  
3. Rain arriving soon  
4. Rain ending  
5. High wind/gusts  
6. Cold/freezing evening  
7. Golden hour approaching  
8. New moon + clear night  
9. Full moon + cloudy night  
10. Moderate air quality  
11. Active severe weather alert  
12. Ordinary conditions → nothing noteworthy  

Each checks signals, ranking where relevant, Before You Go, evidence, no filler prose, doorway render, and no fake tool ads.

---

## 10. Architecture files

| File | Role |
|------|------|
| `wds-dashboard-rebuild-intel.js` | Normalize + derive + rank + BYO + links |
| `wds-dashboard-rebuild-data.js` | Doorway uses intel; `fromPlatform.intel` |
| `wds-dashboard-rebuild-registry.js` | Doorway brief render |
| `wds-dashboard-rebuild.css` | Brief typography only |
| `wds.js` | Loads intel **before** data |
| `test-dashboard-today-outside.mjs` | Baseline contract repair |
| `test-dashboard-rebuild-intel.mjs` | Fixture matrix |
| `.github/workflows/ci.yml` | Intel test step |

---

## Performance

- Pure synchronous derivation on already-fetched platform payload
- No LLM, no extra API calls, no duplicate weather fetches
- Initial Dashboard shell unchanged
