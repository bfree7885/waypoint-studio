# Human Experience Architecture

**Product:** Waypoint Studio  
**Branch:** `recovery/rc3-consolidation`  
**Date:** 2026-07-21  
**Status:** Experience law for the platform — primary deliverable of this sprint  

**Companion (superseded):** `docs/HUMAN_EXPERIENCE_ARCHITECTURE.md` redirects here.

---

## 1. Core design philosophy

Waypoint Studio is not a collection of applications.

It is a **trusted outdoor companion** that helps people **observe, discover, and understand**.

A person never wakes up thinking:

- “I want to use Photo Coach.”
- “I want to open Widget #7.”
- “I need the Library module.”

They think:

- “I want to see what today is like.”
- “I want to import yesterday’s photos.”
- “I wonder where I should hike.”
- “I wonder if conditions are good.”
- “I wonder where I should shed hunt.”
- “I wonder what this mushroom is.”
- “I want to help somewhere today.”

**Law:** If a screen makes someone ask *“Which feature do I need?”* — the design has failed.

Organize around:

| Organize by | Never by |
|-------------|----------|
| Workflow | Software modules |
| Decision-making | Widget directories |
| Observation | Database categories |
| Discovery | Equal-weight feature cards |
| Learning | Tab sprawl |

**Preserve what works.** Strong engines (Today Outside briefing, Photo Coach craft loop, Sheds field map, Volunteer Discover) stay. We reframe the *story* around them — we do not replace proven craft for novelty.

---

## 2. Human mental models

| Moment | Human thought | Studio answer |
|--------|---------------|---------------|
| Morning | How is today? | Dashboard |
| Before leaving | Where / what to bring / what to know? | Dashboard questions + Take |
| After a shoot | What did I make? What should I try next? | Scenes journey → review |
| In the field (sheds) | Where should I search today? | Sheds → day’s hunt → map |
| Free afternoon | What good can I do? | Volunteer → nearby |
| While doing any of the above | Why does this matter? | Articles + Waypoint’s Take *in place* |
| Curiosity later | What else can I explore? | Progressive discovery (Hidden Landscapes, Incubator) |

**Cognitive load rule:** One obvious next action per screen. Everything else is progressively discoverable.

---

## 3. Product journeys (platform spine)

```
Homepage — “What brings you outside?”
    │
    ├─ How is today? ──────────────► Dashboard
    ├─ Photograph ─────────────────► Scenes journey
    ├─ Hunt ───────────────────────► Sheds (day’s hunt)
    └─ Help ───────────────────────► Volunteer (what good today?)

Articles + Waypoint’s Take appear *inside* each journey — not as a fifth equal product.
Incubator stays quiet.
```

---

## 4. Information hierarchy

### Global

| Weight | Surface | Role |
|--------|---------|------|
| P0 | One next action (hero / lead) | Confidence |
| P1 | Primary journey steps | Workflow |
| P2 | Secondary discovery | Curiosity |
| P3 | Later / unfinished | Hidden until useful |
| Quiet | Incubator, supporting prototypes | Reachable, not promoted |

### Product names vs journey language

- **Chrome (primary nav):** keep durable names — Dashboard, Scenes, Sheds, Volunteer, Articles, About. Names are wayfinding, not feature catalogs.
- **Landings & CTAs:** speak human thoughts — “How is today?”, “Review today’s shoot”, “Where should I search?”, “What good can I do today?”

---

## 5. Navigation philosophy

1. **Studio primary nav** = four outdoor companions + Articles (context) + About.
2. **Local nav** = steps in *this* journey, labeled in human language — never a full module directory.
3. **Unfinished peers** do not sit beside working craft (Living Scenes, Scene Builder, Profile → Later).
4. **`startHere`** must match the landing’s primary CTA (Coach, Map, Discover, Today Outside).
5. **No duplicate storytelling:** homepage does not re-list every prototype as equal cards; Incubator is a quiet list.

---

## 6. Dashboard experience flow

### Current

Working Today Outside briefing (strong). Local nav still reads as topic modules (Conditions, Sun & Moon, Safety…). Widgets are the visible product.

### Problems

- Organized by widgets, not outdoor questions.
- Cold start / customize can feel like “dashboard software.”
- Photography peer section competes with Scenes without a clear handoff.

### New mental model

```
How is today?
      ↓
Where should I go?
      ↓
What should I bring?
      ↓
What should I know before leaving?
      ↓
What changed?
```

Widgets **answer** those questions. Widgets are not the product.

### Hierarchy

| Priority | Question | Content |
|----------|----------|---------|
| P0 | How is today? | Brief + Waypoint’s Take |
| P1 | Where / what to know? | Conditions, alerts, light |
| P2 | What to bring / try? | Practical cues |
| P3 | What changed? | Trends |
| Hand-off | Want to photograph? | → Scenes |
| Later | Customize widgets | Power users |

### Wireframe

```
┌──────────────────────────────────────────┐
│  Today outside                           │
│  How is today?                           │
│  ████ Waypoint’s Take + summary ████     │
│                                          │
│  Where should I go?     [cues]           │
│  What should I know?    [alerts · air]   │
│  What changed?          [since yesterday]│
│                                          │
│  — details when needed —                 │
│  conditions · sun · safety · water       │
│                                          │
│  Photograph today? → Scenes              │
└──────────────────────────────────────────┘
```

### UX rationale

People open Dashboard for **judgment about the outdoors**, not a widget gallery. Keep the OIE engine; change the spine when we touch Dashboard chrome (deferred — medium risk).

### Effort

| Change | Effort | Risk | Status |
|--------|--------|------|--------|
| Document question spine | S | None | Done |
| Question headings / TOC | S–M | Low | Deferred |
| Widget chrome rewrite | L | High | Deferred |

---

## 7. Scenes experience flow

### Current

Journey-oriented landing exists; engines for Coach + Library are strong. URLs still split across `/scenes/`, `/photo-coach/`, `/photo-library/`.

### Problems (remaining)

- Module names can leak in deep screens and mental models.
- No real “continue where you left off” state yet.
- Identical placeholder photography historically undermined identity.

### New mental model — photographer’s journey

```
Continue where you left off
        ↓
Import today’s photographs
        ↓
Review your shoot
        ↓
Organize your collection
        ↓
Learn to see differently
        ↓
Explore hidden landscapes     ← discovered, not equal
        ↓
Create something              ← later
        ↓
Publish if desired            ← later / quiet
```

### Hierarchy

| Priority | Human step | Surface |
|----------|------------|---------|
| P0 | Review / continue shoot | Photo Coach |
| P1 | Import & organize | Photo Library |
| P2 | Learn to see | Coach guidance + Articles |
| P3 | Other ways of seeing | Hidden Landscapes |
| Later | Create / publish / profile | Living Scenes, Builder, Profile |

### Wireframe

```
┌─────────────────────────────────────────────┐
│  [one photograph — stage]                   │
│  Observe. Discover. Understand how you see. │
│  [ Review today’s shoot ]  browse quietly   │
└─────────────────────────────────────────────┘

Your photography today
  1. Continue / Review today’s shoot   ← primary
  2. Import today’s photographs
  3. Organize your collection
  4. Learn to see differently

When you’re curious
  · Explore hidden landscapes

Later
  · Create · Publish · Profile
```

### UX rationale

Photographers think in **shoots and growth**. Hidden Landscapes is a curiosity branch — never a second homepage.

### Effort

| Change | Effort | Risk | Status |
|--------|--------|------|--------|
| Journey landing + demote peers | S | Low | Done / refined |
| Local nav human labels | S | Low | Done |
| Continue-where-you-left-off | M | Med | Deferred |
| Unify Scenes URLs | L | High | Deferred |

---

## 8. Sheds experience flow

### Current

Overview framed as day’s hunt; map is the working product. Local nav: Where to search · About today’s hunt.

### New mental model — a day’s hunt

```
Where should I search?
Why here?
What are today’s conditions?
What have I already found?
What can I learn?
What should I do next? / Review my season
```

### Hierarchy

| Priority | Step | Surface |
|----------|------|---------|
| P0 | Where should I search? | Field map |
| P1 | Conditions / why here | Map layers + Dashboard handoff |
| P2 | Finds | Private log |
| P3 | Learn / season | Education + season review |

### Wireframe

```
Sheds — today’s hunt
  [ Open today’s search ]  ← map

  Where to search?  → map
  Conditions?       → layers / Dashboard
  Finds?            → private
  Learn             → field notes
  Season            → later

  About (quiet)
```

### UX rationale

Hunters plan a **day**, not a GIS stack. Map stays the engine.

### Effort

| Change | Effort | Risk | Status |
|--------|--------|------|--------|
| Hunt framing + nav | S | Low | Done |
| Soft-default overview → map | S–M | Low–Med | Deferred |
| Season review surface | L | Med | Deferred |

---

## 9. Volunteer experience flow

### Current

Question-first hero; Discover is the real job; nav reordered toward the question.

### New mental model

```
What good can I do today?
        ↓
Nearby opportunities
        ↓
My interests (quiet)
        ↓
My impact (after action)
```

### Hierarchy

| Priority | Step | Surface |
|----------|------|---------|
| P0 | What good today? | Discover |
| P1 | Nearby / saved | Saved |
| P2 | Interests | Quiet profile |
| P3 | Impact | After participation |

### Wireframe

```
What good can I do today?
  [ See nearby opportunities ]

  Saved for later
  About (quiet)
  Impact (after you’ve helped)
```

### UX rationale

Volunteer succeeds when the first screen **answers the question**, not when it explains the platform.

### Effort

| Change | Effort | Risk | Status |
|--------|--------|------|--------|
| Question-first overview + nav | S | Low | Done |
| Hard redirect `/` → Discover | S | Low–Med | Deferred |

---

## 10. Articles integration

Articles are **not** another primary product in the journey sense.

They are **context** — learning that appears during Dashboard, Scenes, Sheds, and Volunteer.

| Do | Don’t |
|----|--------|
| Surface related reading beside Take | Force a detour to “the Articles app” to learn |
| Keep Articles in primary nav for browsing | Make Articles equal weight to the four outdoor companions on the homepage grid |
| Tie article links to the current question | Dump category databases as the first screen |

**Homepage role:** quiet “Learn while you’re out” — not a feature card competing with How is today?

---

## 11. Waypoint’s Take philosophy

Waypoint’s Take is a **knowledgeable outdoor companion**.

| Is | Is not |
|----|--------|
| Calm, honest, thoughtful | AI theater |
| Educational interpretation | Expert talking down |
| Pattern across products | A chatbot product |
| Always labeled | Undifferentiated “advice” |

**Always distinguish:**

1. **Observed facts** — what was measured or seen  
2. **Interpretation** — what it might mean  
3. **Suggestions** — what someone might try  
4. **Uncertainty** — what we don’t know  

Tone: companion on the trail — never a lecture hall, never a hype engine.

---

## 12. Wireframes (cross-platform)

### Homepage

```
┌─────────────────────────────────────────────┐
│  [full-bleed outdoor photograph]            │
│  Waypoint Studio                            │
│  Observe. Discover. Understand.             │
│  [ See today’s outdoors ]                   │
└─────────────────────────────────────────────┘

What brings you outside?
  ┌─────────────────────────────────────┐
  │  How is today?                      │  ← one lead
  │  See today’s outdoors → Dashboard   │
  └─────────────────────────────────────┘

  Then
  · Photograph — review a shoot → Scenes
  · Hunt — where should I search? → Sheds
  · Help — what good today? → Volunteer

Waypoint’s Take (companion)
Articles (context, quiet)
Incubator (quieter still)
```

### Scenes / Sheds / Volunteer / Dashboard

See sections 6–9.

---

## 13. UX rationale (summary)

| Old pattern | Why it fails | New pattern |
|-------------|--------------|-------------|
| Feature grids | Forces “which app?” | One next action + journey |
| Equal cards | No confidence | Hierarchy + progressive discovery |
| Module nav | Software architecture | Human step labels |
| Articles as peer product | Leaves the workflow | Context in place |
| Repeated stock heroes | Generic software | One photo + owner kit long-term |
| Widget-first Dashboard | Dashboard as product | Questions; widgets answer |

**Conservative boundary:** Do not rewrite OIE, Coach analysis, map GPS, or Discover filters for aesthetic novelty. Reframe and demote only.

---

## 14. Low-risk UI improvements implemented

| Surface | Change |
|---------|--------|
| **Documentation** | This file — full experience law |
| **Homepage** | Lead journey (“How is today?”) + secondary human paths; less equal-card directory |
| **Scenes overview** | Photographer journey order refined; Hidden Landscapes curiosity; Later demoted |
| **Primary / local nav** | Human labels for Scenes / Sheds / Volunteer features; `startHere` aligned |
| **Sheds / Volunteer landings** | Day’s hunt / What good today? framing (prior + retained) |

No backend, API, or database work. No production deploy.

---

## 15. Medium / high-risk recommendations deferred

| Recommendation | Risk | Why defer |
|----------------|------|-----------|
| Dashboard question-spine chrome rewrite | Med–High | Touches live briefing DOM |
| Hard redirect Volunteer → Discover, Sheds → map | Med | Breaks overview/about habit |
| Unified Scenes URL shell | High | Routing / deep links |
| Continue-where-you-left-off state | Med | Needs local progress model |
| Season review product surface | Med | New surface |
| Owner photography kit rollout | Low ops / Med content | Needs Bryan’s assets |
| Renaming primary nav product labels | Med | Wayfinding regression |

---

## 16. Implementation roadmap

| Phase | Work | When |
|-------|------|------|
| **0 — Done** | Experience architecture doc; home hierarchy; Scenes journey; nav language | This sprint |
| **1 — Next** | Dashboard question headings without widget rewrite; Scenes Continue stub (last session link) | After owner review |
| **2** | Soft defaults: Volunteer Discover, Sheds map; empty-state pushes | After Phase 1 |
| **3** | Owner photography system (home + Scenes + Sheds identities) | Content-led |
| **4** | Unify Scenes routes under one shell | Dedicated routing sprint |
| **5** | Season review / publish flows | Only when craft loops are calm |

---

## Photography system (identity)

- Do **not** hardcode placeholder assets into experience architecture as permanent identity.
- Until owner photos land: **one** image per major page; no repeated heroes.
- Long-term: Bryan’s photography becomes the platform identity (`assets/images/home/`, Scenes media kits).
- Note: `apps/scenes/assets/media/hero.jpg` and `mist-valley.jpg` have been identical — treat as one asset until replaced.

---

## Owner review checklist (tomorrow morning)

1. Approve homepage lead = “How is today?” (not four equal cards).
2. Approve Scenes photographer journey as IA spine.
3. Approve Dashboard question spine for a later chrome pass.
4. Approve Sheds day’s hunt + Volunteer question-first.
5. Confirm Articles stay context, not a fifth homepage peer.
6. Confirm Waypoint’s Take companion voice (facts / interpretation / suggestions / uncertainty).
7. Decide hard-redirect timing for Discover / map.
8. Provide distinct owner photographs per experience.

---

## Rollback

All changes live on `recovery/rc3-consolidation` only. Revert via git. Engines intentionally untouched. Do not merge or deploy from this sprint alone.
