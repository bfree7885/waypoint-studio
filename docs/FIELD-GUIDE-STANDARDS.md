# Field Guide Standards

**Official standard for every educational page in every Waypoint Studio product.**

*Supreme law:* [`WAYPOINT-STUDIO-CONSTITUTION.md`](WAYPOINT-STUDIO-CONSTITUTION.md)  
*Teaching philosophy:* [`WAYPOINT-METHOD.md`](WAYPOINT-METHOD.md)  
*Implementation:* `design-system/field-guide/`, `design-system/css/wds-field-guide.css`

---

## Purpose

Waypoint Studio teaches like a lab and a field course. Every educational page — species profile, habitat guide, article, challenge, or research brief — should feel like a **modern Peterson Field Guide**: warm, precise, photography-first, and designed to send the learner **back outside**.

Technology is the specimen cabinet and the map on the trailhead wall. It is not the forest.

---

## Visual character

### Must feel like

| Quality | In practice |
|---------|-------------|
| Warm | Hearth tones, generous whitespace, display type for titles |
| Cozy | Inset panels, journal textures, calm pacing |
| Traditional | Roman numerals for major sections, plate captions, fact sidebars |
| Handcrafted | Sketch slots, notebook examples, honest captions |
| Educational | Driving questions, numbered investigations, reflection |
| Nature-first | Phenomenon before definition; evidence before opinion |
| Photography-first | Hero frames as documentation; metadata in captions |

### Must NOT feel like

- Startup landing pages or SaaS dashboards  
- Social media feeds, likes, or engagement metrics  
- Enterprise software or generic CMS templates  
- Clickbait headlines or algorithmic “trending”  
- Gaming UI or trophy leaderboards  

---

## Template types

Every product may use these eleven canonical templates. Copy the HTML from `design-system/field-guide/templates/` or render equivalent structure from CMS data.

| Template | File | Primary use |
|----------|------|-------------|
| Species Guide | `species-guide.html` | Organisms — ID, range, ecology |
| Habitat Guide | `habitat-guide.html` | Places — riparian, alpine, estuary |
| Ecosystem Guide | `ecosystem-guide.html` | Systems — rainforest, prairie, reef |
| Weather Guide | `weather-guide.html` | Phenomena — fog, fronts, seasons |
| Geology Guide | `geology-guide.html` | Rock, landform, process |
| Photography Guide | `photography-guide.html` | Technique as field documentation |
| Equipment Guide | `equipment-guide.html` | Modest kit — observation enablers |
| Research Brief | `research-brief.html` | Plain-language science summaries |
| Outdoor Challenge | `outdoor-challenge.html` | Weekly / seasonal investigations |
| Seasonal Journal | `seasonal-journal.html` | Phenology and field season pages |
| Field Investigation | `field-investigation.html` | Structured outdoor lab |

---

## Required page sections

Every field guide page includes these blocks **in this order**. Skip only when genuinely inapplicable — mark skipped sections in editorial workflow, never silently omit citizen science or ethics where field impact exists.

| # | Section | ID | Content |
|---|---------|-----|---------|
| — | **Hero photograph** | — | Wide evidence frame; caption with date · place · weather |
| — | **Title & subtitle** | — | Common name + scientific or plain descriptor |
| — | **Table of contents** | — | Anchor links to major sections |
| 0 | **Quick facts** | `quick-facts` | Sidebar: range, season, habitat, status, etc. |
| I | **Identification** | `identification` | Sensory / diagnostic criteria — bullets or key |
| II | **Why it matters** | `why` | Motivation without hype; stewardship |
| III | **How it connects** | `connect` | Web of ecology, weather, geology, culture |
| IV | **Maps** | `maps` | Range, habitat, watershed, or site map |
| V | **Diagrams & illustrations** | `diagrams` | Plate, process diagram, field sketch |
| VI | **Outdoor investigation** | `investigation` | Numbered steps; ends outdoors |
| VII | **Reflection** | `reflection` | Before vs. after; one honest prompt |
| VIII | **Related content** | `related` | Species, lessons, articles, videos |
| IX | **Citizen science** | `citizen-science` | Optional contribution; privacy explicit |

### CSS classes (Field Guide Design System)

| Block | Primary classes |
|-------|-----------------|
| Page shell | `.fg-page`, `.fg-page__title`, `.fg-page__subtitle` |
| Hero | `.fg-hero`, `.fg-hero__caption` |
| Quick facts | `.fg-quick-facts`, `.fg-fact` |
| Sections | `.fg-section`, `.fg-section--identify`, `--why`, `--connect`, `--investigation`, `--reflection`, `--citizen` |
| Media placeholders | `.fg-media-slot`, `--hero`, `--plate`, `--map`, `--diagram`, `--sketch` |
| Plates | `.fg-plate`, `.fg-plate__caption` |
| Related | `.fg-related-grid`, `.fg-related-card` |
| Video | `.fg-video-slot` |

Import via `design-system/css/wds.css`.

---

## Media standards

Every page assumes slots for:

| Media | Slot class | Notes |
|-------|------------|-------|
| Hero photography | `.fg-media-slot--hero` | 21:9 or full-bleed; never stock without context |
| Species / plate illustration | `.fg-media-slot--plate` | Peterson-style labeled figure |
| Maps | `.fg-media-slot--map` | Range, aspect, watershed |
| Diagrams | `.fg-media-slot--diagram` | Process, cycle, cross-section |
| Field notebook sketch | `.fg-media-slot--sketch` | Warm paper tone |
| Video | `.fg-video-slot` | Click to play; never autoplay |

**Caption rule:** Every photograph answers: *What · When · Where · Conditions · Why this frame matters.*

Placeholder slots use dashed borders and uppercase labels until real assets ship. Never ship empty frames without a label.

---

## Learning cycle alignment

Every page must advance the [Waypoint Learning Cycle](WAYPOINT-METHOD.md#the-waypoint-learning-cycle):

1. **Observe** — Hero image or field prompt before definition  
2. **Ask questions** — Reflection and investigation prompts  
3. **Investigate** — Maps, diagrams, background in support of inquiry  
4. **Use the tool** — Link to product workshop when relevant (not required on every brief)  
5. **Collect evidence** — Photography and journal metadata  
6. **Connect** — “How it connects” section required  
7. **Reflect** — Section VII required  
8. **Return outdoors** — Investigation section required  

If a learner finishes the page and has no outdoor task, **the page failed**.

---

## Homepage components

Reusable blocks for ecosystem and product home pages live in `design-system/homepage/` with CSS in `wds-home-sections.css`.

| Component | Class prefix | Purpose |
|-----------|--------------|---------|
| Featured Photograph | `.ws-featured-photo` | Gallery-forward hero |
| Today's Lesson | `.ws-content-card` | One learning-cycle prompt |
| Seasonal Highlight | `.ws-seasonal` | Phenology / weather banner |
| Field Guide Spotlight | `.ws-spotlight` | Plate + quick ID |
| Recent News | `.ws-card-grid` | Seasonal dispatches |
| Featured Video | `.ws-video-feature` | Curated instruction |
| Outdoor Challenge | `.ws-challenge-block` | No leaderboard |
| Explore Nearby | `.ws-nearby-list` | Privacy-respecting places |
| Latest Research | `.ws-research-card` | Plain-language brief |
| Featured Tool | `.ws-tool-card` | Workshop entry — not the whole product |

Reference: `design-system/homepage/index.html`

---

## Shared content library

Placeholder catalog for development and IA testing:

```
design-system/content/
  articles.json      — 50 article cards
  lessons.json       — 50 lesson cards
  videos.json        — 50 video cards
  field-guides.json  — 50 field guide cards
  challenges.json    — 50 outdoor challenge cards
  news.json          — 50 news cards
```

Each item includes: `id`, `title`, `summary`, `domain`, `season`, `placeholder: true`.

Regenerate or extend via `design-system/scripts/generate-foundation.py`.

Products consume this library until real CMS or curriculum data replaces placeholders.

---

## Privacy & citizen science

From the Constitution — non-negotiable on every page:

- **Private by default.** Observations, photos, and notes belong to the user.  
- **Contribution is optional.** Never trick users into sharing data.  
- **Identity never required.** Prefer anonymous contribution.  
- **Location privacy respected.** Round or obscure coordinates by default.  
- **No social metrics.** No likes, followers, leaderboards, or feeds.  

Section IX (Citizen science) must state what is collected, why it matters, and how to opt out.

---

## Feature test

Before publishing any educational page, ask:

| Does this help someone… | |
|-------------------------|---|
| Observe? | ☐ |
| Understand connections? | ☐ |
| Create evidence? | ☐ |
| Share ethically (if they choose)? | ☐ |
| Spend more time outdoors? | ☐ |
| Learn something meaningful? | ☐ |

If not, do not publish yet.

---

## Relationship to WEF

The **Waypoint Education Framework** (`design-system/education/`) defines lesson *schema* (what / why / identify / field observations / challenge).  

The [**nine-pillar Educational Framework**](WAYPOINT-EDUCATIONAL-FRAMEWORK.md) is the company-wide standard every topic should answer — WEF lessons map to it via `WDS.educationTopic.auditWefLesson()`.

**Field Guide Standards** define *page layout* for all educational content types — including species pages, briefs, and challenges that are not WEF lessons.

Both obey the Constitution and Waypoint Method. When content is both a lesson and a field guide page, use WEF section content inside FGDS layout.

---

## File map

| Path | Role |
|------|------|
| `docs/FIELD-GUIDE-STANDARDS.md` | This document |
| `design-system/field-guide/` | Templates + index |
| `design-system/homepage/` | Homepage component reference |
| `design-system/content/` | Shared placeholder library |
| `design-system/css/wds-field-guide.css` | Field guide styles |
| `design-system/css/wds-home-sections.css` | Homepage section styles |
| `design-system/css/wds.css` | Single import for products |

---

## Final rule

If a design, AI suggestion, or product plan conflicts with the Constitution, **the Constitution wins**. If layout or copy conflicts with this standard, **revise the layout or copy** — do not weaken the standard for convenience.
