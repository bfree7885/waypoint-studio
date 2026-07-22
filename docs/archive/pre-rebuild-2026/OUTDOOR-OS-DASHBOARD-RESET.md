# Outdoor OS Dashboard — Architecture Reset

**Status:** Architecture only — no implementation in this phase  
**Date:** 2026-07-21  
**Surface:** `apps/dashboard/` (canonical), `dashboard.html` (redirect)  
**Verdict:** The current Dashboard UI has failed the product vision. Treat layouts, tab chrome, and widget-grid patterns as disposable. Preserve backend intelligence infrastructure.

---

## Mission (north star)

The Dashboard exists to answer **one** question:

> **What is happening outside near me today, what matters most, and what should I do about it?**

It is an **Outdoor Operating System** — a calm field briefing that orients action.

It is **not**:

- A weather website
- A list of widgets
- A collection of cards
- A technical monitoring / provider-status page
- A customize-your-grid product

---

## Design principles for the reset (binding)

Drawn from product standards and the frontend composition rules for *new* direction:

1. **One composition** — first viewport reads as a single outdoor briefing, not a dashboard of parts.
2. **Answer the mission question in the first viewport** — happening → matters → do.
3. **One job per section** — no mixed-purpose strips.
4. **Cards only when they contain interaction** — default: no cards.
5. **Real visual anchors** — outdoor context (light, weather character, place), not abstract decoration or gauge chrome.
6. **Trust is visible without becoming the product** — Live / Cached / Partial / Offline remain honest, but secondary.
7. **Privacy first, local-first** — no account required; location permission transparent.
8. **Never fabricate** — progressive hydrate; honest empty / loading / unavailable.

---

# 1. Audit — Existing Dashboard

## 1.1 Entry points and structure

| Layer | Path / module | Role today |
|-------|---------------|------------|
| Canonical page | `apps/dashboard/index.html` | Shell + skeleton; loads `wds.js` + `home-boot.js` |
| Legacy redirect | `dashboard.html` | Hard redirect to `apps/dashboard/` |
| Boot | `apps/dashboard/js/home-boot.js` | Location bootstrap → `contentEngine.init({ sections: ["outdoor-dashboard"] })`; 5‑min refresh |
| Content section | `design-system/js/wds-content-engine.js` → `renderOutdoorDashboard` | Mounts `#outdoor-dashboard` via `dashboardEngine` |
| Engine router | `design-system/js/dashboard/wds-dashboard-engine.js` | If Recovery enabled → Recovery shell; else legacy section/widget grid |
| Recovery UI (default ON) | `wds-dashboard-recovery.js` | Tab strip: Today · Weather · Photography · Rivers · Air · Sun & Moon · Alerts · Settings |
| V2 layer (default ON) | `design-system/js/dashboard/v2/*` | Replaces Today header/summary with “Today Outside” briefing stack |
| Styles | `wds-dashboard-home.css`, `wds-dashboard-v2.css`, `wds-dashboard-recovery.css`, `css/home-dashboard.css`, per-domain `*-dashboard.css` | Widget/tab/panel chrome |

**Boot sequence (current):**

```
HTML skeleton (aria-busy)
  → wds.js (~100+ ordered modules)
  → home-boot: provisional national shell OR stored coords
  → contentEngine (outdoor-dashboard only)
  → dashboardEngine → Recovery HTML
  → V2 render into Today panel (flag waypoint-dashboard-v2)
  → OIP Promise.all hydrate (weather, NWS, AQ, elevation, USGS)
  → trails late-hydrate
  → specialty mounts only on first visit to detail tabs
```

## 1.2 What the UI currently communicates

**Intended message (docs):** daily outdoor intelligence / field guide (`docs/dashboard-v2/PRODUCT-SPEC.md`, `docs/DASHBOARD_PLAYBOOK.md`).

**Actual first-viewport message (V2 + Recovery):**

1. Product chrome: “Dashboard · Version 2”, Refresh / Location / Settings actions  
2. Place + trust meta strip (source, Live/Cached/Partial, updated time)  
3. **Overview panel grid** — Now / Air / UV / Light / River / Alerts / Photo (mini gauges that jump to tabs)  
4. Multi-article briefing (“What it feels like”, “What changes…”, etc.)  
5. Then (below fold / scroll): timeline, activity suitability list, observe cards, trust table  
6. Persistent **topic tab strip** implying the product is a multi-app weather console  

**Secondary tabs** re-present domain specialty UIs wrapped in **widget article chrome** (`wdb-widget` with icon, trust tag, refresh ↻): Outdoor Weather, Photography Conditions, Water, Air Quality, Sun & Moon, Alerts list, Settings/customize.

**Legacy path (Recovery off):** full **catalog grid** (~74 widgets in `wds-dashboard-catalog.js`) in category sections — Conditions, Wildlife, Foraging, Flora, Water, Trails, Photography/Sky, Safety, Conservation, “My” features — plus Customize modal.

## 1.3 Pages / surfaces

There is effectively **one route** (`apps/dashboard/`). “Pages” are **tabs + overlays**, not distinct URLs:

| Surface | Communicates |
|---------|----------------|
| Today (+ V2) | Interpreted day + gauge panels + lists |
| Weather / Photo / Rivers / Air / Sun & Moon | Domain instrument panels |
| Alerts | Official NWS list |
| Settings | Customize widgets + location hints |
| Location prompt (`#wds-location-prompt`) | Permission / place selection |
| National provisional shell | “Finding your location…” educational fallback |

## 1.4 Component / module inventory (UI-facing)

**Orchestration**

- `wds-dashboard-engine.js` — grid/recovery dispatch, mount, hydrate
- `wds-dashboard-recovery.js` — tab IA + lazy mounts
- `wds-dashboard-v2.js` + `*-render.js` — Today Outside presentation
- `wds-dashboard-settings.js` / `wds-dashboard-customize.js` — visibility/order prefs
- `wds-dashboard-catalog.js` / `wds-dashboard-widgets.js` / `wds-dashboard-widget-data.js` — registry + OIP readers
- `wds-dashboard-categories.js` — section taxonomy for grid era
- Parallel briefing stacks (historical layering): `wds-dashboard-today-summary.js`, `wds-dashboard-brief.js`, `wds-dashboard-briefing.js`, `wds-morning-briefing.js`, `wds-dashboard-briefing-package.js`, `wds-dashboard-story.js`, `wds-dashboard-highlights.js`, `wds-dashboard-challenge.js`, `wds-dashboard-learn.js`

**Domain specialty UIs** (widget mount targets)

- Weather/sky: `wds-outdoor-weather-ui.js`, `wds-sky-dashboard-ui.js`, `wds-weather-ui.js`
- Water: `wds-water-dashboard-ui.js`
- Trails: `wds-trail-dashboard-ui.js`
- Wildlife / flora / foraging / safety: matching `*-dashboard-ui.js`

## 1.5 Data flows

```
WDS.location (bootstrap / stored / geolocation / Nominatim)
        ↓
contentEngine + regionalIntelligence engine (bundle / national)
        ↓
WDS.outdoorIntelligence (OIP)  ←—— parallel providers ——→
        │     Open-Meteo weather          WDS.weather
        │     Open-Meteo AQ               WDS.airQuality
        │     NWS alerts                  WDS.nwsAlerts
        │     Open-Meteo DEM              WDS.elevation
        │     USGS IV                     WDS.usgsWater
        │     OSM Overpass (late)         trailConditions
        ↓
platform package (normalize, blockStatus, trust, cache-in-memory)
        ↓
dashboardV2Model.normalizeFromContext  OR  widget getData readers
        ↓
briefing / activity / timeline / observe rules  OR  specialty mounts
        ↓
HTML replace / in-place hydrate
```

**Caching / reliability**

- OIP in-memory `lastPackage` + offline stale serve (`wds-oip-service.js`)
- V2 briefing localStorage cache `waypoint-dashboard-v2-cache-v1` (5 min fresh / 60 min max stale) — `wds-dashboard-v2-trust.js`
- `wds-dashboard-reliability.js` — trust classification, mount deadlines, connectivity meta
- Prefs: `waypoint-dashboard-v2-prefs-v1`, recovery tab key, settings v4 widget visibility

**Auth**

- **No account / auth gate** for Dashboard. Local-first preferences only. Preserve this product stance.

## 1.6 UX patterns (and failure modes)

| Pattern | Evidence | Failure vs Outdoor OS |
|---------|----------|------------------------|
| Widget catalog mindset | 74 registry ids; Customize as product | Fragmented “pick your instruments” vs one briefing |
| Card grid / article chrome | `wdb-widget`, bento reviews in Sprint 1 | Cards-for-everything; monitoring feel |
| Topic tabs as primary IA | Recovery `TABS` | Splits the one question across apps |
| Overview gauge strip | V2 `wdb-v2-panels` | Weather-site first impression |
| Layered recovery on recovery | V1 grid → Recovery tabs → V2 briefing on Today | Vision diluted; chrome accumulates |
| Monitoring / trust as hero | Version eyebrow, trust table, per-widget tags + refresh | Technical ops UI, not field OS |
| Duplicate interpretation engines | Multiple briefing/summary modules | Competing voices; unclear ownership |
| Playbook concession | `DASHBOARD_PLAYBOOK.md`: “legitimately multi-widget after briefing” | Encodes the failed compromise |
| Performance debt | ~108 sequential scripts; full refresh every 5 min | Shell-first intent fought by payload |
| Incomplete live coverage | Many catalog widgets still Preview/educational | Grid promises more than OS can honestly say |

**Documented debt used as evidence (not sacred layout):**  
`docs/DASHBOARD-SPEED-AUDIT-2026-07.md`, `docs/DASHBOARD-REMAINING-DEBT-SPRINT2.md`, `docs/DASHBOARD-WIDGETS-UX-REVIEW.md`, `docs/OUTDOOR-DASHBOARD-SPRINT*.md`, `docs/dashboard-v2/REMAINING-WORK.md`, persona reviews noting long pages, placeholder/live confusion, and “go/wait” synthesis still missing as a *product* answer.

---

# 2. Preserve — With Why

Preserve **capability and contracts**, not presentation.

## 2.1 Must preserve (backend / platform spine)

| Asset | Location | Why (product) | Why (tech) |
|-------|----------|---------------|------------|
| Outdoor Intelligence Platform | `design-system/js/outdoor-intelligence/wds-oip-*.js` | Single honest package of “what’s outside” | Parallel providers, late trails, offline stale, generation guards |
| Provider services | `wds-weather-service.js`, `wds-air-quality-service.js`, `wds-nws-alerts-service.js`, `wds-elevation-service.js`, `wds-usgs-water-service.js`, trail conditions service | Live facts for the briefing | Already integrated; trust/blockStatus wired |
| Integrations honesty registry | `wds-integrations-registry.js` | Never pretends pending APIs are live | Status vocabulary for future providers |
| Location system | `wds-location.js`, `wds-location-context.js`, prompt mount, Null Island / legacy default guards in `home-boot.js` | Privacy + no fake hometown | Critical for trust; hard-won bugs fixed |
| Regional / national educational core | `regional-intelligence/*`, `wds-us-national-context.js`, content bundles | Calm fallback while locating; seasonal context | Progressive shell without inventing coords |
| Photography / daylight derived intel | `wds-photography-conditions.js`, `wds-daylight-utils.js`, sky intel | Answers “what to do” for light-driven users | Pure functions over weather — reusable |
| Outdoor weather / nature / photo rules | `wds-oie-*-rules.js`, `wds-outdoor-weather-intel.js` | Interpretable “why” without LLM fabrication | Deterministic traces align with Product Standards |
| V2 **model + engines** (not V2 chrome) | `wds-dashboard-v2-model.js`, `-briefing.js`, `-activity.js`, `-timeline.js`, `-observe.js`, `-prefs.js`, `-trust.js` (cache logic) | Closest existing answer to the mission question | Normalized contracts; rule traces; activity suitability |
| Reliability / trust classification | `wds-dashboard-reliability.js`, OIP `blockStatus` / connectivity | Trust is the product | Shared vocabulary Live/Cached/Partial/Offline |
| Educational fallback | `wds-educational-fallback.js` | Honest empty/unavailable | Prevents blank or fake gauges |
| Progressive boot pattern | Skeleton in `index.html`, provisional shell, non-blocking fonts, Recovery lazy-mount *idea* | Never freeze waiting for all providers | Pattern stays; tab UI goes |
| Widget **data readers** as adapters | `wds-dashboard-widget-data.js` patterns | Feed OS from OIP without UI coupling | Keep “no API calls from presentation” rule |
| Specialty **intel** modules | `*-dashboard-intel.js` (water, trail, sky, safety, flora…) | Deep “why” for secondary detail | Reuse as detail drawers / focus modes — not as home grid |
| Local-first prefs (no auth) | settings / V2 prefs localStorage | Privacy; zero account friction | Matches Product Standards |
| Content-engine hook for single section | `sections: ["outdoor-dashboard"]` | Keeps Dashboard a product surface, not homepage collage | Boot already scoped correctly |
| Redirect + canonical URL | `dashboard.html` → `apps/dashboard/` | Stable entry | Don’t break bookmarks |

## 2.2 Preserve with adaptation (contracts migrate; UI replaced)

- **Briefing section semantics** (`feel`, `changes`, `opportunities`, `caution`, `noticing`) — rename/reorder for Outdoor OS hierarchy, keep rule engine.
- **Activity suitability** — promote to “what should I do” primary; demote full score lists.
- **Timeline events** — keep builder; present as *day arc*, not a second dashboard.
- **Alerts** — keep NWS merge; surface as **interrupt** on calm briefing, not a peer tab.
- **Cache key / TTL strategy** — keep; re-key if model shape changes.

## 2.3 Explicitly out of “preserve UI”

Do **not** preserve Recovery tab layout, V2 panel grid, widget article chrome, catalog Customize-as-home, or monitoring trust table as primary UI — even though modules may remain temporarily for deep links during migration.

---

# 3. Delete — With Why

“Delete” means **remove from product IA and first-class UX**. Code may be deleted in later implementation phases or quarantined behind dead flags. This phase does not delete files.

## 3.1 Delete from product experience

| Target | Why (product) |
|--------|----------------|
| **Widget-grid home** (`wdb-grid`, catalog sections, Customize-as-layout) | Turns OS into a DIY weather console; violates one composition |
| **~74-widget catalog as user-facing product** | Catalog is a warehouse, not an answer; most entries dilute “what matters most” |
| **Recovery primary tab strip** (Weather/Photo/Rivers/Air/Sun & Moon as peer homes) | Fragments the one question; trains weather-site navigation |
| **Overview gauge panels** (`wdb-v2-panels`) as first-viewport hero | Communicates “read the instruments” before “here’s your day” |
| **Widget article chrome** (icon + title + Live tag + ↻ on every block) | Monitoring / ops aesthetic; cards without necessary interaction |
| **Challenge / Learn / Story / Highlights as Dashboard centerpieces** | Homework/engagement drift vs Observe·Understand field OS |
| **Trust / provider table as primary scroll content** | Useful for power users; wrong as core briefing — bury under “Sources” |
| **“Dashboard · Version 2” / recovery versioning chrome** | Engineering narrative, not outdoor narrative |
| **Duplicate briefing UIs** (morning briefing package, brief, today-summary competing with V2) | Multiple voices = no voice |
| **Specialty `*-dashboard-ui` as tab bodies** | Reintroduces domain apps; detail should be progressive disclosure |
| **Playbook line legitimizing multi-widget-after-briefing** | Codifies the failed compromise — revise in docs when implementing |
| **National “instrument cards” / homepage collage patterns** if any re-enter via contentEngine | Dashboard boot already strips them; keep them off this surface |

## 3.2 Delete or demote from IA (secondary only, if at all)

- Full hourly/weekly forecast tables → **detail** after “what changes today”
- Per-species / phenology widget walls → Studio / Fieldry / observe deep links
- Astronomy curiosities (ISS, meteor showers) unless they win “matters most” for *this* day
- Conservation news / volunteer lists as Dashboard peers → stewardship elsewhere unless urgent locally

## 3.3 Why this deletion is required

Every recovery sprint **added interpretation on top of widget infrastructure** without killing the widget product model. Persona and sprint reviews still evaluate success as “which widgets are live.” That metrics frame guarantees a weather-site outcome. Outdoor OS succeeds only if the **default path never offers a grid or peer domain tabs**.

---

# 4. Decision rationale (product principles)

| Decision | Principle |
|----------|-----------|
| Preserve OIP + providers | Trust requires real facts; don’t rebuild pipes to fix UI |
| Preserve rule briefing / activity engines | Honest AI/heuristics with traces; no fabricated certainty |
| Preserve location privacy guards | Fake place destroys trust faster than missing weather |
| Delete widget grid & tabs-as-home | One composition; answer one question |
| Delete gauge-first viewport | Brand/mission first: outdoor briefing, not NOAA clone |
| Cards only for interaction | Reduce chrome; calm field OS feel |
| Alerts as interrupt | Safety matters most when present — don’t equalize with UV trivia |
| No auth | Local-first; remove friction from “should I go out?” |
| Detail on demand | Depth without dumping instruments into the first breath |

---

# 5. Information Architecture — Outdoor OS

## 5.1 Sitemap (single product surface)

```
/apps/dashboard/                    Outdoor OS (home)
  ├─ [interrupt] Official alert banner (if any)
  ├─ Primary composition: Today Outside (first viewport)
  ├─ Day arc (secondary, same scroll)
  ├─ Focus / detail (tertiary — sheet, section, or soft route)
  │    ├─ Conditions detail (weather numbers)
  │    ├─ Light detail (sun/moon/photo windows)
  │    ├─ Water detail (nearest gauges)
  │    ├─ Air detail (AQI)
  │    └─ Sources & trust (collapsed)
  ├─ Location flow (prompt / change place)
  └─ Preferences (activities, comfort, sensitivities) — not widget toggles
```

No peer “Weather app” tab. Domain depth is **progressive disclosure** from the briefing.

## 5.2 Hierarchy of meaning (what wins the viewport)

```
1. PLACE + TIME (quiet)     — where/when this briefing applies
2. HAPPENING                — outdoor character right now (feel)
3. MATTERS MOST             — 1–3 ranked signals (alert > safety > change > opportunity)
4. DO                       — primary recommended action + optional alternates
5. DAY ARC                  — how the next hours change the advice
6. NOTICE                   — optional curiosity (only if not competing with 3–4)
7. SOURCES                  — trust, age, provider (always available, never hero)
```

**Primary content:** 2–4 (must fit first viewport on mobile).  
**Secondary:** 5–6.  
**Tertiary:** numeric instruments, full alert text, prefs, sources.

## 5.3 Mapping from mission question

| Question clause | IA slot | Engine input (preserved) |
|-----------------|---------|---------------------------|
| What is happening outside near me today? | HAPPENING + PLACE | weather current, feel rules, location label |
| What matters most? | MATTERS MOST (+ alert interrupt) | caution rules, NWS, AQI/UV/heat/wind thresholds, river hazards |
| What should I do about it? | DO + DAY ARC | activity engine windows + briefing opportunities/changes |

## 5.4 User journeys

### J1 — Morning check (core)

1. Open Dashboard (cached place or locate).  
2. First viewport: feel → top matters → one clear do.  
3. Optional: skim day arc; leave.  
**Success:** under ~5 seconds of comprehension after shell+weather.

### J2 — Alert / urgent day

1. Interrupt banner with severity + plain action (“Postpone exposed ridgelines until 4pm”).  
2. Briefing demotes opportunities; DO becomes safety-first.  
3. Tap alert → full NWS detail (tertiary).  
**Success:** never need Weather tab to learn it’s dangerous.

### J3 — Calm, beautiful day

1. HAPPENING is inviting; MATTERS MOST may be a light/photo or wildlife notice.  
2. DO suggests best window (e.g., golden hour walk).  
3. NOTICE optional.  
**Success:** feels like a field guide, not empty gauges.

### J4 — Multi-condition conflict day (heat + good light + rising river)

1. MATTERS MOST ranks tradeoffs explicitly (not seven equal cards).  
2. DO states primary path + “if you still go…” constraint.  
3. Day arc shows when constraints ease.  
**Success:** user understands *priority*, not a wall of suitability scores.

### J5 — No / denied location

1. Honest empty: can’t personalize near-me.  
2. CTA: share location or pick a place.  
3. Optional national educational tone — never a fake county.  
**Success:** no Null Island, no invented hometown.

### J6 — Offline / partial

1. Shell + last briefing with Cached/Partial.  
2. DO may soften (“based on conditions from …”).  
3. No fake Live.  
**Success:** still actionable when possible; always honest.

---

# 6. Wireframes

Legend: `[ ]` region · `>` action · `…` progressive

## 6.1 Desktop — first viewport (calm day)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Waypoint · Outside                                              Location │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Tuesday · Near Millbrook                                               │
│                                                                          │
│   Soft overcast, mild, light air                                         │
│   The woods will feel quiet and cool through midday.                     │
│                                                                          │
│   What matters                                                           │
│   · Best light late afternoon (golden hour ~7:40p)                       │
│   · UV climbs after 11 — shade for longer walks                          │
│                                                                          │
│   Do this                                                                │
│   › Walk or easy hike mid-afternoon → early evening                      │
│     Alternate: short creek look mid-morning before the haze lifts        │
│                                                                          │
│   [ subtle outdoor visual: sky/light character — full-bleed atmosphere ] │
│                                                                          │
│   Day arc                                            Sources ▾           │
│   9a  calm · 1p warmer · 7:40p golden · 9p clear                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Mobile — first viewport (calm day)

```
┌─────────────────────────┐
│ Outside          Place ▾│
│                         │
│ Tue · Near Millbrook    │
│                         │
│ Soft overcast, mild     │
│ Quiet woods through     │
│ midday.                 │
│                         │
│ Matters                 │
│ · Golden hour ~7:40p    │
│ · UV up after 11        │
│                         │
│ Do                      │
│ › Afternoon → evening   │
│   walk                  │
│                         │
│ Day arc  →              │
└─────────────────────────┘
```

## 6.3 Loading

```
┌─────────────────────────┐
│ Outside                 │
│                         │
│ Finding today’s         │
│ conditions…             │
│                         │
│ (structure visible:     │
│  place skeleton,        │
│  three quiet lines)     │
│                         │
│ Live data will fill in  │
│ without freezing.       │
└─────────────────────────┘
```

No tab skeleton. No fake gauges.

## 6.4 Empty location

```
┌─────────────────────────┐
│ Outside                 │
│                         │
│ We need a place to      │
│ brief what’s outside    │
│ near you.               │
│                         │
│ › Use my location       │
│ › Choose a place        │
│                         │
│ Until then, we won’t    │
│ invent a hometown.      │
└─────────────────────────┘
```

## 6.5 Alert / urgent

```
┌─────────────────────────┐
│ ⚠ Severe Thunderstorm   │
│   Watch until 6pm       │
│   › Stay near shelter   │
│     this afternoon      │
├─────────────────────────┤
│ Hot, building clouds    │
│                         │
│ Matters                 │
│ · Storm timing 2–6p     │
│ · High UV still midday  │
│                         │
│ Do                      │
│ › Morning only outdoors │
│   Finish by early       │
│   afternoon             │
└─────────────────────────┘
```

## 6.6 Multi-condition day

```
┌────────────────────────────────────────────────────────────┐
│ Hot · gusty · river rising                                 │
│                                                            │
│ Matters (ranked)                                           │
│ 1. Heat — limit midday exertion                            │
│ 2. Rising stage on nearby creek — avoid crossings          │
│ 3. Strong evening light if storms miss                     │
│                                                            │
│ Do                                                         │
│ › Early shaded walk; skip fording; photo only if storms clear │
│                                                            │
│ Day arc: 7a ok · 12–4p hard · 7p maybe light               │
└────────────────────────────────────────────────────────────┘
```

## 6.7 Secondary state — detail sheet (example: Light)

```
┌─────────────────────────┐
│ Light detail          ✕ │
│ Sunrise 5:52 · Set 8:21 │
│ Golden 7:40–8:05        │
│ Clouds ~40% evening     │
│ Photo outlook: good     │
│ (from live weather)     │
└─────────────────────────┘
```

Opened from a single text affordance in DO/Matters — not from a Photo tab.

---

# 7. Component hierarchy (Outdoor OS)

Intentional tree — **not** a widget catalog. Names are logical; map to modules in rebuild.

```
OutdoorOSApp
├── AppShell (skip link, brand/product name, footer — existing WAS shell ok)
├── LocationGateway
│   ├── LocationPrompt
│   ├── PlaceLabel (safe strings only)
│   └── ChangePlaceControl
├── OutdoorOSScreen                    ← one composition root
│   ├── AlertInterrupt?                ← conditional; highest priority
│   │   ├── AlertSummary
│   │   └── AlertDetailDisclosure
│   ├── BriefingHero                   ← first viewport answers mission Q
│   │   ├── PlaceTimeHeader            ← quiet; not monitoring chrome
│   │   ├── HappeningBlock             ← feel / outdoor character
│   │   ├── MattersMostList            ← ranked 1–3
│   │   ├── DoBlock                    ← primary CTA + optional alternate
│   │   └── AtmosphereAnchor           ← visual outdoor character (not gauges)
│   ├── DayArc                         ← secondary; timeline engine behind it
│   ├── NoticeOptional?                ← tertiary curiosity; omit if weak
│   ├── TrustStrip (collapsed)         ← Cached/Partial/Offline + age
│   └── SourcesPanel (disclosure)      ← provider honesty; not hero
├── DetailFocus (sheet/section)        ← one job each; opened from briefing
│   ├── ConditionsDetail
│   ├── LightDetail
│   ├── WaterDetail
│   └── AirDetail
├── PreferencesPanel                   ← activities/comfort — NOT widget toggles
└── SystemStates
    ├── BootSkeleton
    ├── PartialState
    ├── OfflineState
    ├── ProviderUnavailableState
    └── BootErrorRetry
```

**Non-components (anti-catalog):** no `WidgetGrid`, `WidgetCard`, `CategorySection`, `RecoveryTablist`, `OverviewPanelGrid`, `ChallengeCard`, `LearnTodayCard`.

**Data adapters (non-visual, keep):**

```
OutdoorOSData
├── OipSession (WDS.outdoorIntelligence)
├── OsModel (evolve from dashboardV2Model)
├── BriefingEngine (evolve from v2-briefing)
├── PriorityRanker (new thin layer: rank MattersMost / Do)
├── ActivityEngine (reuse)
├── DayArcEngine (reuse timeline)
└── TrustClassifier (reuse reliability)
```

---

# 8. Rebuild plan (phased — architecture only)

**Constraint:** This document authorizes **no implementation**. Phases below are ordered for a future build.

## Phase 0 — Align (docs / flags only when build starts)

- Freeze product definition on this doc; mark widget/tab IA deprecated.
- Revise `DASHBOARD_PLAYBOOK.md` multi-widget concession when implementation begins.
- Success criteria drafted (below); no UI code yet.

## Phase 1 — Contract freeze (keep pipes)

**Wire first:**

1. Keep `home-boot` → location → OIP → package path.  
2. Freeze/extend `dashboardV2Model` as `OsModel` contract (location, weather, air, alerts, rivers, daylight, photography, provider meta).  
3. Keep provider services and integrations registry.  
4. Add **PriorityRanker** spec: inputs → ranked MattersMost + Do (deterministic, traced).

**Do not yet:** rip catalog files (avoid breaking other Studio consumers without audit).

## Phase 2 — Presentation replace (rip UI)

**Rip out of default path:**

1. Recovery tab strip as home IA.  
2. V2 overview panels + trust table from primary scroll.  
3. Widget grid render path for `outdoor-dashboard`.  
4. Duplicate briefing renderers from mount path.

**Replace with:**

1. Single `OutdoorOSScreen` mount in `renderOutdoorDashboard` / successor.  
2. BriefingHero + DayArc + states from §6–§7.  
3. DetailFocus progressive disclosure using **intel** modules, not full `*-dashboard-ui` grids.

## Phase 3 — Migrate data contracts

| Old | New |
|-----|-----|
| V2 briefing `sections.*` | Map → Happening / Matters / Do / Notice |
| Activity list (8 scores) | Top 1–2 actions + reasons; rest in prefs-driven expand |
| Timeline events | DayArc labels |
| Alerts tab panel | AlertInterrupt + detail |
| Settings widget visibility map | Deprecate; prefs = activities/comfort only |
| `waypoint-dashboard-v2-cache-v1` | Version schema → `outdoor-os-brief-cache-v1` when shape changes |
| Specialty mount kinds | Optional detail targets keyed by matter id |

## Phase 4 — Quarantine / delete code (later)

- Remove or stop loading: recovery tabs CSS/JS from Dashboard boot graph if unused.  
- Catalog: keep as internal registry for adapters **or** delete if nothing else depends — audit `wds.js` consumers first.  
- Kill dead briefing modules after one OS renderer owns voice.

## Phase 5 — Hardening

- Playwright: geo granted/denied/offline/alert/calm/multi-condition.  
- a11y: one H1, interrupt semantics, focus in sheets.  
- Perf: reduce Dashboard boot graph (structural debt from speed audit).  
- Contrast / motion: calm, no urgency hacks.

## Risks

| Risk | Mitigation |
|------|------------|
| Power users miss gauges | DetailFocus + Sources; don’t restore tabs as home |
| Ranking feels wrong | Traces + tunable thresholds; never hide official alerts |
| Bundle still huge | Phase 5 split; OS render must not mount all specialty UIs |
| Dual IA during migration | Feature flag `outdoor-os` with **default ON** only when Hero answers mission Q; no long “tabs + OS” hybrid |
| Editorial/live confusion | Only live/derived in Happening/Matters; educational clearly labeled or omitted |
| Other apps using catalog/engine | Audit before file deletion; delete UX path first |

## Success criteria

1. **First viewport answers all three clauses** of the mission question without scrolling on a common phone viewport (calm day).  
2. **Zero widget grids / peer domain tabs** on the default path.  
3. **Official alerts** always interrupt above the briefing when present.  
4. **No fabricated place or Live** — existing trust vocabulary respected.  
5. **Time-to-comprehension:** usable Happening+Do when weather is live; Partial/Cached labeled when not.  
6. **Persona check:** hiker / photographer / parent can state “what I’ll do” after one screen.  
7. **Preserved pipes:** OIP providers still hydrate; no regression to Pike-as-fake-home or Null Island.  
8. **Prefs ≠ layout:** no “turn on 40 widgets” product.

## Explicit non-goals of *this* phase

- No code implementation, refactors, or commits for UI rip/replace.  
- No new providers required to declare OS IA complete.  
- No React rewrite assumption — vanilla WDS remains acceptable if composition rules are met.

---

# Executive summary — Outdoor OS IA

The Dashboard should become a **single Outdoor OS briefing surface**: place quietly established, then **Happening → Matters most → Do**, with a short **Day arc** and **Sources** tucked away. Alerts **interrupt**; instruments live in **detail sheets**, not tabs. Preserve **OIP, location, provider services, rule engines, and trust/cache**; delete **widget-grid mentality, recovery tab IA, gauge-first panels, and monitoring chrome** from the default experience. Rebuild by **freezing data contracts, replacing presentation, ranking priority deterministically, then quarantining catalog UI** — implementation only in later phases.

**One line:** *Outside, near you, today — what it is, what matters, what to do.*
