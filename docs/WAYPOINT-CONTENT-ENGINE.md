# Waypoint Content Engine

**Publishing blueprint for the entire Waypoint Studio ecosystem**

*Supreme law:* [`WAYPOINT-STUDIO-CONSTITUTION.md`](WAYPOINT-STUDIO-CONSTITUTION.md)  
*Teaching philosophy:* [`WAYPOINT-METHOD.md`](WAYPOINT-METHOD.md)  
*Page standards:* [`FIELD-GUIDE-STANDARDS.md`](FIELD-GUIDE-STANDARDS.md)  
*Experience architecture:* [`ECOSYSTEM-BLUEPRINT.md`](ECOSYSTEM-BLUEPRINT.md)

---

## Why this exists

Waypoint Studio does not compete on volume. It competes on **habit**: the quiet rhythm of someone who steps outside several times a week because they noticed something worth checking.

The Content Engine is not a feed. It is a **field season calendar** — regional updates, seasonal cues, one lesson, one challenge, one photograph that makes you grab a jacket and go.

**Success metric:** Did the reader go outdoors with a better question than they had before?  
**Failure metric:** Did they scroll, feel informed, and stay inside?

If a piece of content does not pass the Constitution feature test, it does not publish.

---

## North star

| We publish | We do not publish |
|------------|-------------------|
| Reasons to look outside this week | Daily noise to fill a timeline |
| Local phenology and weather windows | Viral nature trivia |
| Repeat investigations | One-time consumption |
| Evidence-rich photography | Stock wallpaper |
| Plain-language research | Hype press releases |
| Optional citizen science | Surveillance disguised as community |

**Cadence philosophy:** Enough to return **2–4 times per week**, not enough to replace the trail. Most visits should take **5–15 minutes** indoors — then the real work happens outside.

---

## Geographic layers

Every content item carries a **scope tag**. Scope determines where it surfaces — never as a popularity ranking.

| Level | Code | What it means | Example |
|-------|------|---------------|---------|
| **Local** | `L1-county` | County or watershed — "what's happening near you" | "King County: first chanterelle signs on north slopes after rain" |
| **State** | `L2-state` | Statewide patterns, regulations, seasons | "Washington: razor clam tides this weekend" |
| **Regional** | `L3-region` | Bioregion / ecoregion / climate zone | "Pacific Northwest maritime: fog frequency below normal" |
| **National / Global** | `L4-global` | Only when locally actionable or universally instructive | "Aurora forecast — how to read Kp for your latitude" |

### Layering rules

1. **Default to local.** If it does not change what someone does outdoors in their county this week, do not lead with it on Home.
2. **State and regional** provide context — why local phenology is early, why smoke arrives, why a species is absent.
3. **National / global** publishes sparingly: migration flyways, climate patterns, eclipse, widespread research with local application. Never as breaking-news anxiety.
4. **Same story, four lenses:** A late spring dispatch might include county bloom times (L1), state snowpack (L2), regional marine layer behavior (L3), and a global phenology study summary (L4) — as linked sections, not four separate articles.
5. **Privacy:** Local content never requires precise user location. Suggest counties, watersheds, and public lands — users opt in to finer geography.

---

## The seven rooms (where content lives)

Content publishes into the ecosystem's seven rooms. Every product inherits the same rooms.

| Room | Content Engine role |
|------|---------------------|
| **Home** | This week's invitation — one photograph, one lesson, one challenge, seasonal highlight |
| **Learn** | Field guides, lessons, teacher's notebook, research briefs (depth) |
| **Gallery** | Featured photography, photo essays, evidence frames |
| **Field Notes** | Reader's private journal — content provides prompts, never public feeds |
| **News** | Regional outdoor updates, conservation stories, seasonal dispatches |
| **Videos** | Short educational films — click to play, never autoplay |
| **Tools** | Linked last — Scenes, maps, logs, calendars serve the story |

**Publishing rule:** No piece ships to Tools alone. Every tool link answers: *what did the content help you observe?*

---

## Weekly rhythm

Recurring themes create **predictable return visits** without gamification. Themes rotate by season; not every theme runs every week.

### Core weekly calendar

| Day | Theme | Primary content types | Outdoor prompt |
|-----|-------|----------------------|----------------|
| **Monday** | **Mushroom Monday** *(autumn)* / **Moss Monday** *(wet season)* / **Map Monday** *(winter)* | Species spotlight, field guide, regional update | "Walk 20 minutes after rain. Look at wood, not lawns." |
| **Tuesday** | **Trail Tuesday** | Regional update, conservation story, photo essay | "Check one trail condition you've ignored." |
| **Wednesday** | **Watershed Wednesday** | Habitat guide, research brief, map feature | "Find the nearest creek. Note water color and sound." |
| **Thursday** | **Teacher's Thursday** | Teacher's notebook, lesson, field investigation | "Try this lab with one student or one friend." |
| **Friday** | **Forest Friday** | Ecosystem guide, species spotlight, featured photography | "Stand in shade vs. sun for five minutes each. Compare." |
| **Saturday** | **Sky Saturday** | Weather guide, video, astronomy / cloud ID | "Name three cloud types before noon." |
| **Sunday** | **Slow Sunday** | Photo essay, seasonal highlight, outdoor challenge preview | "One hour outside. Phone in pocket except one evidence photo." |

### Seasonal theme swaps

| Season | Monday swap | Friday swap | Saturday swap |
|--------|-------------|-------------|---------------|
| Spring | **Bud Monday** (phenology) | **Forest Friday** | **Sky Saturday** |
| Summer | **Pollinator Monday** | **Alpine Friday** *(where relevant)* | **Dawn Saturday** |
| Autumn | **Mushroom Monday** | **Forest Friday** | **Migration Saturday** |
| Winter | **Track Monday** | **Conifer Friday** | **Storm Saturday** |

### Monthly anchors

| Week | Anchor content |
|------|----------------|
| **Week 1** | Seasonal highlight + county phenology roundup |
| **Week 2** | Research brief + conservation story |
| **Week 3** | Weekend field investigation (longer form) |
| **Week 4** | Photo essay + repeat-photography invitation |

**Volume cap:** Publish **at most 3–4 original ecosystem pieces per week** across all types, plus **1 regional update bundle** per county cluster. Quality and local accuracy beat frequency.

---

## Content types — full specification

Each type maps to an FGDS template where applicable. Every type includes the **Waypoint Learning Cycle** and ends with an outdoor action.

---

### 1. Regional outdoor update

**Purpose:** Answer *what's worth paying attention to outdoors in my area this week?* — weather windows, phenology, trail conditions, wildlife activity, ethical reminders.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | Weekly per county cluster; daily only during acute events (fire smoke, storm, closure) |
| **Geographic scope** | Primary: L1-county. Context: L2-state, L3-region |
| **Visual layout** | News card on Home; full dispatch in News room. Dateline, 3–5 short blocks: Weather · Phenology · Watershed · Wildlife · Stewardship |
| **Photography** | One current evidence frame (not stock). Caption: date, place, conditions |
| **Illustrations** | Optional small icon for phenology stage (bud, leaf, bloom, fade) |
| **Maps** | County outline + watershed or public lands overlay; no user pins |
| **Videos** | Rare; link to Sky Saturday or habitat walk if relevant |
| **Related lessons** | 1 WEF lesson tied to the week's phenomenon |
| **Related tools** | ForageCast calendar, SignalTerrain map, Terrainbound conditions — as needed |
| **Outdoor investigation** | "This week: notice X on your usual walk" — one sentence |
| **Citizen science** | Optional: phenology, rain gauge, trail condition — anonymous, rounded location |

**Tone:** Park ranger bulletin, not news ticker.

---

### 2. Seasonal highlight

**Purpose:** Name what the season is offering — equinox light, first frost, migration peak — and connect calendar to sensation.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | Weekly (Home banner); deep essay monthly |
| **Geographic scope** | L1 + L3 (local manifestation of regional season) |
| **Visual layout** | `ws-seasonal` homepage component; FGDS seasonal journal for depth |
| **Photography** | Comparison pair encouraged (same bearing, different week) |
| **Illustrations** | Phenology wheel or sun-angle diagram |
| **Maps** | Aspect / elevation gradient for season timing |
| **Videos** | 2–4 min explainer optional |
| **Related lessons** | Weather or ecology track |
| **Related tools** | Scenes for repeat photography; Fieldry for journal |
| **Outdoor investigation** | Repeat photograph or journal entry with fixed protocol |
| **Citizen science** | Optional repeat-photo phenology networks |

---

### 3. Educational field guide

**Purpose:** Peterson-style reference — identify, understand context, investigate outdoors. The canonical depth content.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1–2 new or revised guides per month per product domain |
| **Geographic scope** | Species/habitat: L1–L3 range maps. Global only for widespread taxa |
| **Visual layout** | Full FGDS template (species, habitat, ecosystem, weather, geology, photography, equipment) |
| **Photography** | Hero + plate + habitat + detail + comparison |
| **Illustrations** | Required diagnostic plate |
| **Maps** | Range, habitat, watershed |
| **Videos** | Companion habitat walk (optional) |
| **Related lessons** | 2–3 WEF lessons in reading order |
| **Related tools** | Domain tool (Steepleaf ID, ForageCast season table, etc.) |
| **Outdoor investigation** | Tiered: beginner / intermediate / advanced |
| **Citizen science** | Species lists, phenology — opt-in, ethics block required |

---

### 4. Research brief

**Purpose:** Plain-language summary of one study — what was asked, found, and **why a hiker should care locally**.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 2 per month ecosystem-wide |
| **Geographic scope** | L4-global source → L1 local application paragraph required |
| **Visual layout** | FGDS research-brief template; `ws-research-card` on Home |
| **Photography** | One field-relevant frame, not lab stock |
| **Illustrations** | One process diagram |
| **Maps** | Study region + "if you live here" inset |
| **Videos** | None usually; link to Teacher's Thursday discussion |
| **Related lessons** | Method or ecology lesson |
| **Related tools** | Fieldry for notes; optional data export for educators |
| **Outdoor investigation** | "Replicate a simplified version of the method locally" |
| **Citizen science** | Link to project if study used community data — transparency required |

---

### 5. Featured photography

**Purpose:** Evidence frame — document what attention looked like at a moment in place and season.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 2–3 per week ecosystem; daily only as Gallery feature, not News spam |
| **Geographic scope** | L1 preferred; credit watershed |
| **Visual layout** | `ws-featured-photo` / Gallery full-bleed; metadata caption required |
| **Photography** | Wide + optional detail; EXIF or plain-language settings; no heavy processing |
| **Illustrations** | None unless annotation for teaching |
| **Maps** | Optional small locator inset |
| **Videos** | None |
| **Related lessons** | Photography or observation lesson |
| **Related tools** | Waypoint Scenes — atmosphere as extension, not replacement |
| **Outdoor investigation** | "Return to this bearing next week" |
| **Citizen science** | Optional repeat photography contribution |

---

### 6. Short educational video

**Purpose:** Demonstrate a field skill or phenomenon — **show before tell**, assign outdoor follow-up.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1 per week ecosystem; 3–8 minutes max |
| **Geographic scope** | L1–L3 filming location labeled |
| **Visual layout** | `ws-video-feature`; click to play; transcript and investigation below |
| **Photography** | B-roll is evidence, not cinematic filler |
| **Illustrations** | Overlay diagrams sparingly |
| **Maps** | When navigation or habitat context matters |
| **Videos** | The content type — hosted curated, no autoplay, no algorithmic queue |
| **Related lessons** | Companion lesson required |
| **Related tools** | One tool step in video |
| **Outdoor investigation** | Stated in final 30 seconds |
| **Citizen science** | Rare; if present, end card explains data use |

---

### 7. Outdoor challenge

**Purpose:** Weekly assignment — observe, document, reflect. **No leaderboard. No posting required.**

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1 per week (Sunday preview → week-long) |
| **Geographic scope** | L1 — doable in any county with habitat notes |
| **Visual layout** | FGDS outdoor-challenge template; `ws-challenge-block` on Home |
| **Photography** | Example evidence pair optional |
| **Illustrations** | Checklist graphic |
| **Maps** | Only if navigation challenge |
| **Videos** | None |
| **Related lessons** | 101 or field skills |
| **Related tools** | Fieldry journal; Scenes for photo pair |
| **Outdoor investigation** | The entire piece |
| **Citizen science** | Optional appendix — never required for completion |

---

### 8. Weekend field investigation

**Purpose:** Longer structured lab (60–120 min) — the week's capstone for families, teachers, and dedicated naturalists.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1 per month; bonus in summer |
| **Geographic scope** | L1 with L2 alternates listed |
| **Visual layout** | FGDS field-investigation template; Teacher's Thursday cross-link |
| **Photography** | Protocol requires wide + detail + scale |
| **Illustrations** | Field data sheet printable |
| **Maps** | Site sketch or topo optional |
| **Videos** | Optional 5-min setup |
| **Related lessons** | Full track module tie-in |
| **Related tools** | Product-specific data capture |
| **Outdoor investigation** | Full Waypoint Method skeleton |
| **Citizen science** | Structured opt-in with clear data dictionary |

---

### 9. Species spotlight

**Purpose:** One organism — ID, ecology, ethics, local look-alikes. Gateway to field guides.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1–2 per week (theme days: Mushroom Monday, Pollinator Monday, etc.) |
| **Geographic scope** | L1–L3 range; local abundance note |
| **Visual layout** | FGDS species-guide abbreviated on Home; full guide in Learn |
| **Photography** | Plate + habitat + diagnostic detail |
| **Illustrations** | Required |
| **Maps** | Seasonal activity map |
| **Videos** | 3-min ID walk optional |
| **Related lessons** | Species track lesson |
| **Related tools** | Steepleaf, ForageCast, Shed Hunting as domain fit |
| **Outdoor investigation** | "Find or ethically observe without collecting" |
| **Citizen science** | iNaturalist-style only with privacy education |

---

### 10. Conservation story

**Purpose:** Real place, real stakes, honest hope — stewardship without guilt or doom.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 2 per month |
| **Geographic scope** | L1–L2 primary |
| **Visual layout** | Article in News; hero photograph; pull quote from land manager or researcher |
| **Photography** | Place portrait + evidence of change or recovery |
| **Illustrations** | Before/after or process only if accurate |
| **Maps** | Project boundary or watershed |
| **Videos** | Optional interview &lt; 6 min |
| **Related lessons** | Conservation track |
| **Related tools** | Volunteer sign-up external link; never required account |
| **Outdoor investigation** | "Visit public viewpoint; note one sign of change" |
| **Citizen science** | Restoration monitoring — opt-in |

---

### 11. Teacher's notebook

**Purpose:** Field-tested lab for educators — objectives, materials, safety, assessment rubric, **outdoor time guaranteed**.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1 per week (Teacher's Thursday) |
| **Geographic scope** | L1 adaptable; L2 standards alignment noted |
| **Visual layout** | Printable PDF + web version; FGDS field-investigation structure |
| **Photography** | Classroom-to-field sequence |
| **Illustrations** | Student worksheet diagrams |
| **Maps** | Schoolyard or park map template |
| **Videos** | Demo of setup |
| **Related lessons** | WEF curriculum alignment table |
| **Related tools** | Export lesson plan; Fieldry for student notes |
| **Outdoor investigation** | Minimum 50% of lesson time outdoors |
| **Citizen science** | Class projects — parental permission, anonymity |

---

### 12. Photo essay

**Purpose:** Serial evidence tells one story — observe → question → understand arc across 5–12 frames.

| Attribute | Specification |
|-----------|---------------|
| **Cadence** | 1 per month (Week 4 anchor) |
| **Geographic scope** | L1 narrative; L3 ecological thread |
| **Visual layout** | Gallery room; horizontal scroll or vertical story; minimal chrome |
| **Photography** | 5–12 frames; evidence captions mandatory |
| **Illustrations** | One sketch or map if needed |
| **Maps** | Route or watershed context |
| **Videos** | None — photography leads |
| **Related lessons** | Photography + ecology |
| **Related tools** | Scenes for subtle motion optional; Gallery export |
| **Outdoor investigation** | "Repeat the route next season" |
| **Citizen science** | Optional documentary contribution |

---

## How pieces combine (weekly bundle)

A **publish bundle** is the atomic unit editors ship — not isolated posts.

```
WEEK OF [date] · [County cluster / Bioregion]
─────────────────────────────────────────────
Home invitation
  ├── Featured photography (1)
  ├── Today's lesson (1 WEF lesson)
  ├── Seasonal highlight (1 sentence + link)
  └── Outdoor challenge (week)

News room
  ├── Regional outdoor update (L1 + L2 context)
  └── Conservation story OR research brief (alternate weeks)

Learn room
  ├── Species spotlight OR field guide page (theme day)
  └── Teacher's notebook (Thursday)

Gallery
  └── Photo essay segment OR challenge evidence examples

Videos
  └── One short film (Saturday theme)

Tools
  └── One soft link — "Try this with today's photograph"
```

**Reader journey (ideal week):**

| Visit | Trigger | Time indoors | Outdoor result |
|-------|---------|--------------|----------------|
| **Mon** | Mushroom Monday spotlight | 8 min | 20-min walk after rain |
| **Wed** | Watershed Wednesday update | 5 min | Creek visit |
| **Thu** | Teacher's notebook or lesson | 12 min | Field lab block |
| **Sat** | Sky Saturday video + challenge check-in | 10 min | Cloud ID + challenge photo |
| **Sun** | Slow Sunday essay | 15 min | Unhurried hour outside |

Total: **~4 visits, ~50 minutes screen** — rest is field time.

---

## Editorial governance

### Before publish — feature test

Every piece answers yes to at least four:

- [ ] Observe  
- [ ] Understand connections  
- [ ] Create evidence  
- [ ] Spend more time outdoors  
- [ ] Learn something meaningful  
- [ ] Share ethically (optional)  

### Rejection list

- Content that exists only to fill a schedule slot  
- National doom without local action  
- Species ID from photos alone without field ethics  
- Leaderboards, streaks, badges for outdoor time  
- "Trending" or "most read" surfaces  
- Autoplay video  
- Required social sharing to unlock content  

### Voice

Field teacher at the trailhead. Park ranger who respects your intelligence. Photographer who captions honestly. Never startup hype. Never influencer cadence.

---

## Subscriptions and the Constitution

Income supports the mission. It does not replace the mission.

### What stays free (always)

Aligned with *private by default* and *access to nature is not paywalled*:

- Core weekly regional update for user's chosen county  
- One lesson per week (Today's lesson)  
- One outdoor challenge per week  
- Constitution-compliant citizen science participation  
- Basic field guide entries (rotating catalog)  
- One video per week  

Free tier must still send people outdoors. It must not feel like a demo — it must feel like a **generous trailhead bulletin**.

### What subscribers support

People subscribe because Waypoint Studio helps them become **better observers** — not because content is withheld hostage.

| Tier | Value | Constitution alignment |
|------|-------|------------------------|
| **Naturalist** | Full Learn library · all field guides · complete video archive · seasonal journals · ad-free quiet reading | Education-first; no engagement tricks |
| **Field Naturalist** | County + adjacent counties · weekly PDF field packets · printable teacher's notebooks · research brief archive | Supports preparation for field time |
| **Studio** *(product-specific)* | Advanced tools — Scenes exports, ForageCast season depth, SignalTerrain layers, Terrainbound routes | Tools last; never the whole product |
| **Educator** | Classroom licenses · rubrics · standards maps · bulk print | Teacher's notebook mission |
| **Contributor** *(optional)* | Anonymous research-quality datasets · phenology exports · opt-in only | Citizen science transparent; identity never required |

### What we never sell

- User observations without explicit consent  
- Precise location data  
- Attention metrics to third parties  
- "Boost" for sightings or popularity  
- Anxiety — fire, smoke, and storm alerts are **public safety**, not premium FOMO  

### Subscription copy test

Would a subscriber say: *"I pay because I go outside more prepared and return with better notes"* — not *"I pay because otherwise I'm missing out"*?

If not, revise the offer.

---

## Product routing (who publishes what)

Content Engine is **ecosystem-first**. Products specialize; they do not silo.

| Content type | Primary home | Cross-product surfacing |
|--------------|--------------|------------------------|
| Regional update | Ecosystem News | All product Home cards |
| Seasonal highlight | Ecosystem Home | All |
| Field guide | Learn (domain product) | Steepleaf, ForageCast, SignalTerrain, etc. |
| Research brief | Learn + News | Educator, Fieldry |
| Featured photography | Gallery | Scenes, ecosystem Home |
| Video | Videos | Themed Saturday across products |
| Outdoor challenge | Home + Learn | Terrainbound, Shed Hunting emphasis |
| Weekend investigation | Learn | Teacher's Thursday |
| Species spotlight | Learn | Steepleaf, ForageCast, Shed Hunting |
| Conservation story | News | All |
| Teacher's notebook | Learn | Fieldry, ecosystem |
| Photo essay | Gallery | Scenes, ecosystem |

**Rule:** One editorial calendar. Eight laboratories. Same seven rooms.

---

## Implementation references (not code)

When building publishing workflows, align to existing foundations:

| Foundation | Path |
|------------|------|
| FGDS templates | `design-system/field-guide/templates/` |
| Homepage components | `design-system/homepage/` |
| Content library shape | `design-system/content/*.json` |
| Product inheritance | `design-system/ecosystem/product-registry.json` |
| WEF lessons | `design-system/education/` |

Content items should carry metadata:

```text
id · type · title · scope (L1–L4) · county · state · bioregion
season · theme_day · publish_date · rooms[] · fgds_template
related_lessons[] · related_tools[] · investigation_id
citizen_science_opt_in · placeholder
```

---

## Success measures (non-metric)

We do not optimize for dwell time or scroll depth.

| Signal | Meaning |
|--------|---------|
| Repeat visits 2–4× / week | Rhythm is working |
| Field Notes entries after challenges | Content drove practice |
| Optional citizen science submissions | Trust and clarity |
| Subscription renewal with "field season" language | Mission-aligned revenue |
| Unprompted repeat photography | Evidence habit formed |

---

## Final rule

The Content Engine serves the Constitution.

If a publishing plan increases time on screen but decreases time outdoors, **the plan loses**.

If a subscription offer tricks users into sharing data or feeling behind, **the offer is withdrawn**.

**Observe. Understand. Create. Share.**  
Then close the laptop and go.
