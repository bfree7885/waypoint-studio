# Experience-First Product Architecture

**Product:** Waypoint Studio  
**Branch:** `recovery/rc3-consolidation`  
**Date:** 2026-07-21  
**Status:** Emotional & guided-experience law for flagship products  

**Companion docs:**  
- [`HUMAN-EXPERIENCE-ARCHITECTURE.md`](./HUMAN-EXPERIENCE-ARCHITECTURE.md) — information architecture & mental models  
- [`RC3-CONSTITUTION.md`](./RC3-CONSTITUTION.md) — mission & product hierarchy  

---

## Central question

For every flagship product:

> Why would someone wake up wanting to use this **today**?

If that answer is unclear, the interface has failed.

---

## Shared experience model

Every flagship surface follows:

1. **Why am I here?** — emotion first  
2. **What should I do first?** — one primary action  
3. **What should I discover?** — curiosity, not a peer app  
4. **What should I learn?** — Articles + Waypoint’s Take in place  
5. **What should I do next?** — calm progression  

**Hierarchy law:** One primary action. Up to three secondary actions. Everything else is progressively discoverable.

**Language law:** Prefer outdoor language. Reduce *module, feature, utility, builder, manager*.

**Visual law:** First screen = emotion. Second screen = function. Distinct atmospheric identity per product. Owner photography is the long-term identity system (do not hardcode placeholders as permanent brand).

| Product | Atmospheric identity | Intended owner photography |
|---------|----------------------|----------------------------|
| Homepage / Dashboard | Sky & morning light | Seasonal sky / horizon |
| Scenes | Photography & craft | Owner landscape frames |
| Sheds | Forest / field edge | Woods, edge habitat |
| Volunteer | People & care | Stewardship / community outdoors |

Until distinct compressed owner assets ship per product, use **typography + atmosphere CSS** so products do not share an identical emotional read — and never repeat the same hero multiple times on one page.

---

## 1. Dashboard

### Why wake up for this?

“I want to know what today is like before I go outside.”

### Current journey

Widgets → Weather → Maps → Alerts → Customize

### New journey

```
Today’s Outdoor Brief
        ↓
Where should I go?
        ↓
What conditions matter?
        ↓
What changed?
        ↓
Waypoint’s Take
        ↓
Relevant articles
        ↓
Deeper tools only if needed
```

### User story

As someone stepping into the day, I open Dashboard for a **trusted morning briefing** — not to configure software.

### Primary action

Read **Today’s Outdoor Brief** (How is today?).

### Secondary actions

1. Where should I go? / conditions that matter  
2. What changed?  
3. Open Scenes / Sheds / Volunteer when the brief suggests a path  

### Information hierarchy

| Weight | Content |
|--------|---------|
| P0 | Morning framing + Today’s Outdoor Brief |
| P1 | Conditions that matter (widgets as answers) |
| P2 | Waypoint’s Take + articles |
| P3 | Customize / deeper tools |

### Future opportunities

- Question-spine chrome wrapping live widgets without engine rewrite  
- Explicit “What changed?” strip  
- Distinct sky photography kit  

---

## 2. Scenes

### Why wake up for this?

“I have photographs from yesterday — I want to see them better and grow.”

### Current journey (software)

Library → Coach → Builder → Profile

### New journey

```
Continue yesterday’s work
        ↓
Import today’s photographs
        ↓
Review your shoot
        ↓
Choose your best photographs
        ↓
Learn something new
        ↓
Explore Hidden Landscapes   ← discovery
        ↓
Create
        ↓
Share only if you choose
```

### User story

As a photographer, I follow a **day’s craft path** — not a directory of tools.

### Primary action

**Continue / review today’s shoot** (Photo Coach).

### Secondary actions

1. Import today’s photographs  
2. Choose / organize best frames  
3. Learn something new (Articles beside craft)  

### Information hierarchy

| Weight | Content |
|--------|---------|
| P0 | Emotional stage + continue/review |
| P1 | Import · review · choose best · learn |
| P2 | Hidden Landscapes (discovery) |
| P3 | Create · share (Later) |

### Future opportunities

- True “continue yesterday” from local progress  
- Unified Scenes shell URLs  
- Owner photography as Scenes identity (replace shared placeholder)  

---

## 3. Sheds

### Why wake up for this?

“I wonder where I should search today — and what the woods are saying.”

### Current journey (tools)

Map · GPS · layers · about

### New journey

```
Morning
        ↓
Today’s conditions
        ↓
Where should I search?
        ↓
Field navigation
        ↓
Log discoveries
        ↓
Review season
        ↓
Learn
```

### User story

As a shed hunter, I plan **a day’s hunt**. The map is how I search — not the product story.

### Primary action

**Open today’s search** (field map).

### Secondary actions

1. Today’s conditions (Dashboard handoff / layers)  
2. Log discoveries (private)  
3. Learn (articles / field notes)  

### Information hierarchy

| Weight | Content |
|--------|---------|
| P0 | Morning hunt emotion + Where should I search? |
| P1 | Conditions · field navigation · finds |
| P2 | Learn |
| P3 | Season review · about |

### Future opportunities

- Soft-default overview → map  
- Season review surface  
- Forest-edge owner photography kit  

---

## 4. Volunteer

### Why wake up for this?

“I want to help somehow today — nearby, without guilt or gamification.”

### Current journey (categories)

Overview brochure → categories → profile → impact

### New journey

```
What good can I do today?
        ↓
Nearby opportunities
        ↓
Things matching my interests
        ↓
Impact
        ↓
Stories
```

### User story

As someone with free time and goodwill, I want a **hopeful next step** — not a database of causes.

### Primary action

**See nearby opportunities** (Discover).

### Secondary actions

1. Saved for later  
2. Interests (quiet)  
3. Impact / stories (after action)  

### Information hierarchy

| Weight | Content |
|--------|---------|
| P0 | Hopeful question + nearby CTA |
| P1 | Interests · saved |
| P2 | Impact · stories |
| P3 | About / privacy (quiet) |

### Future opportunities

- Hard redirect overview → Discover  
- Story surfaces after participation  
- Stewardship photography identity  

---

## 5. Homepage (studio door)

### Why wake up for this?

“I want Waypoint — my outdoor companion — not a product catalog.”

### Journey

```
Emotion (Observe. Discover. Understand.)
        ↓
How is today?          ← primary
        ↓
Photograph · Hunt · Help   ← three secondary
        ↓
Waypoint’s Take · Learn while you’re out
```

---

## Wireframes (emotion → function)

### Dashboard

```
┌──────────────────────────────────────┐
│  This morning · How is today?        │  ← emotion
│  [location · trust]                  │
│  Today’s Outdoor Brief               │  ← primary
│  · … · … · …                         │
│  What conditions matter?             │  ← function
│  [widgets as answers]                │
│  Take · Articles                     │
│  Deeper tools (customize) — quiet    │
└──────────────────────────────────────┘
```

### Scenes

```
┌──────────────────────────────────────┐
│  [photograph · craft atmosphere]     │
│  Continue yesterday’s work           │
│  [ Review today’s shoot ]            │
└──────────────────────────────────────┘
  Import → Review → Choose best → Learn
  Discover: Hidden Landscapes
  Later: Create · Share if you choose
```

### Sheds

```
┌──────────────────────────────────────┐
│  Morning · forest atmosphere         │
│  Where should I search?              │
│  [ Open today’s search ]             │
└──────────────────────────────────────┘
  Conditions · Finds · Learn · Season
```

### Volunteer

```
┌──────────────────────────────────────┐
│  Hopeful · stewardship atmosphere    │
│  What good can I do today?           │
│  [ See nearby opportunities ]        │
└──────────────────────────────────────┘
  Interests · Impact · Stories (later)
```

---

## Low-risk improvements in this sprint

| Surface | Change |
|---------|--------|
| Dashboard | Morning briefing language; widgets as “what matters”; quieter deeper tools; question-oriented local nav |
| Scenes | Day’s craft journey copy; discovery vs Later; outdoor language (less “builder”) |
| Sheds | Morning hunt stage + hierarchy (1 primary, 3 secondary) |
| Volunteer | Hopeful stage; slim path; demote category brochure weight |
| Homepage | Emotional companion framing retained / reinforced |
| Docs | This experience-first architecture |

**Preserved:** Dashboard OIE/widgets, Photo Coach, Shoot Review, Sheds map, Volunteer Discover engines.

---

## Remaining opportunities (deferred)

1. Distinct compressed owner photos per product (sky / craft / forest / stewardship)  
2. Dashboard question-spine without widget rewrite  
3. Continue-where-you-left-off state in Scenes  
4. Soft defaults: Sheds → map, Volunteer → Discover  
5. Season review & Volunteer stories surfaces  
6. Unify Scenes URLs  

---

## Owner review (tomorrow)

- [ ] Does each flagship answer “why today?” in the first screen?  
- [ ] Is emotion before function?  
- [ ] Is there one obvious primary action?  
- [ ] Approve deferred photography kit from Bryan’s library  
- [ ] Approve hard-redirect timing for Discover / map  

---

## Rollback

Changes on `recovery/rc3-consolidation` only. No merge. No deploy.
