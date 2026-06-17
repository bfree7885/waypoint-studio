# Waypoint Content Engine

**Regional field-guide publishing for the entire Waypoint Studio ecosystem.**

*Supreme law:* [`WAYPOINT-STUDIO-CONSTITUTION.md`](WAYPOINT-STUDIO-CONSTITUTION.md)  
*Teaching philosophy:* [`WAYPOINT-METHOD.md`](WAYPOINT-METHOD.md)  
*Implementation:* `design-system/content-engine/` + `design-system/js/wds-content-engine.js`

---

## Purpose

Make Waypoint Studio worth visiting **every day or every couple of days** — not to scroll, but to **learn during the week** and **go outside on the weekend** to test what you learned.

This is not endless content. It is a **field season calendar**: regional updates, seasonal cues, one investigation, one reason to close the laptop.

**Success:** Did the reader go outdoors with a better question?  
**Failure:** Did they feel informed but stay inside?

No APIs. No scraping. No comments, likes, profiles, or feeds. Private by default.

---

## Learn weekdays · test weekends

| Phase | When | Content types |
|-------|------|----------------|
| **Prepare** | Mon–Thu | This Week Outdoors, Regional Field Notes, Seasonal Watch, Species Spotlight, Teacher's Notebook, Research Brief, Featured Video |
| **Go** | Sat–Sun | Weekend Field Investigation (+ Photo Essay as monthly depth) |
| **Steward** | Ongoing | Conservation Update |

---

## Geographic layers (regional-first)

| Level | Code | Priority |
|-------|------|----------|
| County / local | `L1-county` | **Default** — lead every Home surface |
| State | `L2-state` | Context, regulations, migration |
| Regional | `L3-region` | Bioregion, climate, research |
| National / global | `L4-global` | Only when locally actionable |

**Launch region:** Pike County, Pennsylvania (`pike-county-pa`) — Northeastern PA, Delaware River Highlands, Pocono Plateau.

---

## Content types (specification)

Full machine-readable specs: [`design-system/content-engine/content-types.json`](../design-system/content-engine/content-types.json)

### 1. This Week Outdoors

| Attribute | Value |
|-----------|--------|
| **Purpose** | Weekly invitation — weekday learning + weekend field test |
| **Cadence** | Weekly (Sunday publish) |
| **Visual layout** | `wce-week-banner` — condition blocks + weekday/weekend split |
| **Photography** | One hero evidence frame |
| **Maps / diagrams** | Optional county locator; weather inset |
| **Related lessons** | 1–2 WEF lessons |
| **Related tools** | One soft link (SignalTerrain, Terrainbound, etc.) |
| **Outdoor challenge** | Weekend prompt embedded |
| **Citizen science** | Optional single opt-in line |
| **Subscription value** | Free: current week. Subscriber: archive + adjacent counties |

### 2. Regional Field Notes

| Attribute | Value |
|-----------|--------|
| **Purpose** | Ranger-bulletin dispatches — trail, weather, wildlife, phenology |
| **Cadence** | 2–4 per week |
| **Visual layout** | `wce-field-notes` list with scope badge |
| **Photography** | Optional thumbnail per note |
| **Maps / diagrams** | Trail or watershed map when place-specific |
| **Related lessons** | Cross-link when topic matches |
| **Related tools** | Terrainbound, ForageCast, Fieldry |
| **Outdoor challenge** | "Try this" line per note |
| **Citizen science** | Rare; trail or phenology opt-in |
| **Subscription value** | Free: 3/week. Subscriber: full archive |

### 3. Seasonal Watch

| Attribute | Value |
|-----------|--------|
| **Purpose** | Phenology calendar — emerging, peaking, fading |
| **Cadence** | Weekly update |
| **Visual layout** | `wce-seasonal-grid` status chips |
| **Photography** | Comparison pairs encouraged |
| **Maps / diagrams** | Elevation / aspect timing |
| **Related lessons** | Ecology, species tracks |
| **Related tools** | ForageCast season table |
| **Outdoor challenge** | Find one watch-list species |
| **Citizen science** | Anonymous phenology scores |
| **Subscription value** | Full calendar + history |

### 4. Weekend Field Investigation

| Attribute | Value |
|-----------|--------|
| **Purpose** | Capstone outdoor lab — 60–120 min |
| **Cadence** | Weekly |
| **Visual layout** | `wce-investigation` / FGDS field-investigation |
| **Photography** | Wide + detail protocol |
| **Maps / diagrams** | Site sketch optional |
| **Related lessons** | Required companion |
| **Related tools** | Fieldry, Waypoint Scenes |
| **Outdoor challenge** | The entire piece |
| **Citizen science** | Structured opt-in |
| **Subscription value** | Printable PDF + educator rubric |

### 5. Research Brief

| Attribute | Value |
|-----------|--------|
| **Purpose** | Plain-language science + **local application** paragraph |
| **Cadence** | 2 per month |
| **Visual layout** | `ws-research-card` |
| **Photography** | Field-relevant frame |
| **Maps / diagrams** | Study area + local inset |
| **Related lessons** | Method / ecology |
| **Related tools** | Fieldry |
| **Outdoor challenge** | Simplified local replication |
| **Citizen science** | Transparent if study used community data |
| **Subscription value** | Citation archive |

### 6. Featured Video

| Attribute | Value |
|-----------|--------|
| **Purpose** | Show phenomenon before explain; assign outdoor follow-up |
| **Cadence** | 1 per week |
| **Visual layout** | `ws-video-feature` — click to play, never autoplay |
| **Photography** | B-roll as evidence |
| **Maps / diagrams** | When habitat context matters |
| **Related lessons** | Required companion |
| **Related tools** | One tool step |
| **Outdoor challenge** | Final 30 seconds of film |
| **Citizen science** | Rare |
| **Subscription value** | Video archive + transcript |

### 7. Photo Essay

| Attribute | Value |
|-----------|--------|
| **Purpose** | 4–8 evidence frames, one place-and-season story |
| **Cadence** | Monthly |
| **Visual layout** | `wce-photo-essay` grid |
| **Photography** | Primary medium |
| **Maps / diagrams** | Route locator |
| **Related lessons** | Photography + ecology |
| **Related tools** | Waypoint Scenes |
| **Outdoor challenge** | Repeat route next season |
| **Citizen science** | Optional repeat photography |
| **Subscription value** | Full-resolution gallery |

### 8. Species Spotlight

| Attribute | Value |
|-----------|--------|
| **Purpose** | One organism — ID, ecology, ethics |
| **Cadence** | 1–2 per week |
| **Visual layout** | `ws-spotlight` + `wce-species-id` |
| **Photography** | Plate + habitat + detail |
| **Maps / diagrams** | Range / seasonal activity |
| **Related lessons** | Species track |
| **Related tools** | Steepleaf, ForageCast, Shed Hunting |
| **Outdoor challenge** | Ethical observe-without-collect |
| **Citizen science** | Privacy-educated observation |
| **Subscription value** | Full FGDS species library |

### 9. Teacher's Notebook

| Attribute | Value |
|-----------|--------|
| **Purpose** | Field-tested lab — 50%+ outdoor time |
| **Cadence** | Weekly (Thursday) |
| **Visual layout** | `wce-teacher` card |
| **Photography** | Classroom-to-field sequence |
| **Maps / diagrams** | Schoolyard map template |
| **Related lessons** | WEF alignment |
| **Related tools** | Fieldry export |
| **Outdoor challenge** | Lab assignment |
| **Citizen science** | Class opt-in with permission |
| **Subscription value** | Educator tier: standards + printables |

### 10. Conservation Update

| Attribute | Value |
|-----------|--------|
| **Purpose** | Stewardship — real place, honest hope |
| **Cadence** | 2 per month |
| **Visual layout** | `wce-conservation` card |
| **Photography** | Place portrait |
| **Maps / diagrams** | Project boundary |
| **Related lessons** | Conservation track |
| **Related tools** | External volunteer links only |
| **Outdoor challenge** | Visit public viewpoint |
| **Citizen science** | Restoration monitoring opt-in |
| **Subscription value** | Project archive |

---

## Pike County launch content

**Bundle:** [`design-system/content-engine/regions/pike-county-pa.json`](../design-system/content-engine/regions/pike-county-pa.json)

Topics covered in placeholders:

- Morel season winding down · chanterelle timing (watch late June)
- Black bear activity · secure attractants
- Mountain laurel bloom · spring ephemerals fading
- Blueberry fruit set · whitetail antler growth
- Warbler migration tail · trail mud after rain
- Delaware River valley fog · afternoon thunderstorms
- DWGNRA trail maintenance · streambank stabilization
- Weekend investigation: fog line and birdsong along the Delaware

---

## Implementation (no API)

```
design-system/content-engine/
  manifest.json              # default region
  content-types.json         # type specifications
  regions/
    pike-county-pa.json      # weekly regional bundle
```

**Renderer:** `WDS.contentEngine.init({ region: 'pike-county-pa', base: 'design-system/content-engine/', mount: '#wds-content-engine' })`

**Product inheritance:** `contentEngineRegion` in `design-system/ecosystem/product-registry.json` — all products use `WDS.ecosystem.initProductHome()` which delegates to the content engine.

**CSS:** `wds-content-engine.css` (included in `wds.css`)

---

## Subscriptions (Constitution-aligned)

| Free (always) | Subscriber |
|---------------|------------|
| Current week bundle | Full archive |
| 3 field notes / week | All notes + adjacent counties |
| One weekend investigation | Printable PDFs + educator rubrics |
| One species spotlight | Full species library |
| Optional citizen science | Research brief citations |

People subscribe to become **better observers** — not because nature is paywalled.

Never: engagement metrics, FOMO weather alerts, required sharing, identity for access.

---

## Weekly rhythm (Pike County example)

| Day | Focus |
|-----|--------|
| Mon | Read This Week Outdoors + first field note (morels, bears) |
| Tue | Species spotlight (mountain laurel) |
| Wed | Seasonal watch + watershed note |
| Thu | Teacher's notebook lab |
| Fri | Research brief + featured video (fog) |
| Sat–Sun | Weekend field investigation |

---

## Feature test (before publish)

- [ ] Observe first in copy and media  
- [ ] Ends with outdoor action  
- [ ] L1-county lead when possible  
- [ ] No social patterns  
- [ ] Citizen science optional and explained  
- [ ] Subscription value is depth, not hostage-taking  

---

## Final rule

If the Content Engine increases screen time but decreases field time, **revise the engine**.

The Constitution wins. Always.
