# Human Experience Architecture

**Product:** Waypoint Studio  
**Branch:** `recovery/rc3-consolidation`  
**Date:** 2026-07-21  
**Status:** Experience law for flagship products — not a visual theme pass  

**Principle:** Users should never have to understand Waypoint Studio’s internal architecture. Every screen should follow how a real person thinks while doing that activity outdoors or with a camera.

If a user thinks *“Which feature do I need?”* — the design has failed.

---

## Shared design rules

| Do | Don’t |
|----|--------|
| Organize by workflow, decisions, observation, discovery, learning | Organize by modules, widgets, databases, directories |
| One obvious next action | Equal-weight card grids for everything |
| Progressive discovery | Expose unfinished tools as peers |
| Answer: Why am I here? What first? What next? What later? | Begin with a feature directory |
| Distinct photography identity per experience | Repeat the same hero on one page |
| Calm hierarchy and whitespace | Tabs + duplicate nav + visual noise |

**Photography note:** `apps/scenes/assets/media/hero.jpg` and `mist-valley.jpg` are currently the **same file**. Until owner photography arrives, use **one** image per page maximum, and prefer typography for secondary paths. Owner photography should become platform identity via `assets/images/home/` and future Scenes media kits (see existing seasonal manifest pattern).

---

## 1. Scenes

### Current experience

- Landing: cinematic stage + “Photo Coach is the heart” + Hidden Landscapes + “Coming later” list.
- Local nav (on child apps): Overview · Library · Photo Coach · Hidden Landscapes · Living Scenes · Scene Builder · Profile · Field guide — **eight peers**.
- Real work happens in Photo Coach (upload / Shoot Review) and Photo Library (import / catalog).
- URLs still split across `/apps/scenes/`, `/apps/photo-coach/`, `/apps/photo-library/`.

### Problems

1. Nav still names **software modules**, contradicting landing hierarchy.
2. Unfinished experiences sit at the same nav level as the working craft loop.
3. Hero often lacks an immediate “what do I do now?” action.
4. Library vs Coach relationship is architectural, not photographic (“where do my files live?” vs “how do I improve?”).
5. Repeated identical photography previously made the hub feel like a stock directory.

### New mental model — photographer’s journey

```
Continue where you left off
        ↓
Import today’s photographs
        ↓
Browse your collection
        ↓
Review your shoot          ← Photo Coach / Shoot Review
        ↓
Improve your photography   ← coaching guidance
        ↓
Explore other ways of seeing  ← Hidden Landscapes (discovered, not equal)
        ↓
Create something new       ← Living Scenes / Scene Builder (later)
        ↓
Manage your profile        ← quiet account/growth
```

### New hierarchy

| Priority | Human step | Surface |
|----------|------------|---------|
| P0 | Review / improve today’s shoot | Photo Coach |
| P1 | Import & browse photographs | Photo Library |
| P2 | Explore other ways of seeing | Hidden Landscapes |
| P3 | Create / profile / experiments | Later — not primary nav |

### Wireframe (landing)

```
┌─────────────────────────────────────────────┐
│  [one photograph — stage]                   │
│  Observe. Discover. Understand how you see. │
│  [ Review today’s shoot ]  browse photos    │
└─────────────────────────────────────────────┘

Your photography today
  1. Import photographs .............. Library
  2. Review your shoot ............... Coach   ← primary
  3. Improve from what you see ....... (same)

When you’re ready
  · Other ways of seeing ............. Hidden Landscapes

Later
  · Living Scenes · Scene Builder · Profile
```

### Reasoning

Photographers think in **shoots and growth**, not product SKUs. Hidden Landscapes is a curiosity branch, not a sibling of “review today’s frames.”

### Estimated effort

| Phase | Effort | Risk |
|-------|--------|------|
| Landing journey copy + single CTA | S | Low |
| Rename/reorder Scenes local nav labels; demote unfinished | S | Low |
| Unified Scenes shell URL (no `/photo-coach` split) | L | Medium |
| Continue-where-you-left-off state | M | Medium |
| Distinct owner photography kit | M | Low (ops) |

**Implemented this sprint (low-risk):** journey-oriented Scenes landing; nav feature labels reordered/demoted unfinished items.

---

## 2. Dashboard

### Current experience

- Landing **is** the working briefing (Today Outside), JS-mounted.
- Local nav: Today · Conditions · Sun & Moon · Safety · Water · Photography (hash anchors).
- Deep widget/OIE systems are strong; IA still reads as **topic modules**.

### Problems

1. Organization by widget/section, not by outdoor questions.
2. Hash nav may drift from live V2/V3 DOM.
3. “Photography” as a peer section competes with Scenes without a clear handoff.
4. Cold start (empty until JS) doesn’t calmly explain the job.
5. Customize/widgets can feel like a dashboard product, not “today outside.”

### New mental model — questions of the day

```
How is today?
Where should I go?
What should I bring?
What should I know?
What changed?
        ↓
   (widgets & Take answer underneath)
```

### New hierarchy

| Priority | Question | Content |
|----------|----------|---------|
| P0 | How is today? | Brief + Waypoint’s Take |
| P1 | Where / what to know? | Conditions, alerts, light |
| P2 | What should I bring / try? | Practical cues |
| P3 | What changed? | Trends / updates |
| Later | Deeper customize | Power users |

### Wireframe

```
Today outside
  How is today?     ████ Take + summary ████
  Where to go?      [places / trails cues]
  What to know?     [alerts · air · water]
  What changed?     [since yesterday]

  — details expand —
  conditions · sun · safety · water

  Want to photograph? → Scenes
```

### Reasoning

People opening Dashboard want **judgment about the outdoors**, not a widget gallery. Widgets remain the engine; questions are the UI spine.

### Estimated effort

| Phase | Effort | Risk |
|-------|--------|------|
| Question-framed section headings / TOC | S–M | Low |
| Fix or prune broken hash nav | S | Low |
| Photography → Scenes handoff CTA | S | Low |
| Re-architect widget chrome around questions | L | High — defer |

**Implemented this sprint:** documentation + nav/label guidance only (no Dashboard engine rewrite).

---

## 3. Sheds

### Current experience

- Overview page: “Open field map” CTA + foundation marketing.
- Real product: `map/` GPS/field workflow.
- Local nav: Overview only; map is a separate chrome world.

### Problems

1. Brochure gate before the day’s hunt.
2. Organized as map/tools, not “what do I do in the field today?”
3. Finds / learning / season review not first-class in IA.
4. Leaving studio nav on the map breaks orientation.

### New mental model — a day’s hunt

```
Where should I search?
What are today’s conditions?
What have I found?
What should I learn?
Review my season.
```

### New hierarchy

| Priority | Step | Surface |
|----------|------|---------|
| P0 | Where should I search? | Field map |
| P1 | Today’s conditions | Map layers / Dashboard handoff |
| P2 | What have I found? | Private finds |
| P3 | Learn / season | Education + season review |

### Wireframe

```
Sheds — today’s hunt
  [ Open today’s search ]  ← map

  Where to search?   → map
  Conditions?        → layers / Dashboard
  Finds?             → private log
  Learn              → field notes
  Season             → later summary

  About Sheds (quiet)
```

### Reasoning

Hunters plan a **day**, not a GIS stack. Map stays the engine; the story is the hunt.

### Estimated effort

| Phase | Effort | Risk |
|-------|--------|------|
| Local nav: Field map + Overview | S | Low |
| Overview copy as day’s-hunt framing | S | Low |
| Soft-default to map with About link | S–M | Low–Med |
| Season review surface | L | Med |

**Implemented this sprint:** nav adds Field map; overview framing toward day’s hunt (light copy).

---

## 4. Volunteer

### Current experience

- Overview brochure → Discover as the real job (“What good can I do today?”).
- Local nav: Overview · Discover · Saved · Profile · Impact (peers).

### Problems

1. Double gate before the product’s one question.
2. Profile/Impact compete before the user has acted.
3. Feels category/database-ish when long capability lists dominate.
4. startHere already points to Discover — landing doesn’t.

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

### New hierarchy

| Priority | Step | Surface |
|----------|------|---------|
| P0 | What good can I do today? | Discover |
| P1 | Nearby / saved | Saved |
| P2 | Interests | Profile (quiet) |
| P3 | Impact | After participation |

### Wireframe

```
What good can I do today?
  [ See nearby opportunities ]  ← Discover

  Saved for later
  About Volunteer (quiet)
  Impact (after you’ve helped)
```

### Reasoning

Volunteer succeeds when the first screen **answers the question**, not when it explains the platform.

### Estimated effort

| Phase | Effort | Risk |
|-------|--------|------|
| Nav order: Discover first; rename labels | S | Low |
| Overview → short gate or redirect to Discover | S | Low–Med |
| Empty Saved/Impact → push to Discover | S | Low |
| Full IA rewrite of Discover filters | M–L | Med |

**Implemented this sprint:** nav reordered/relabeled toward the question; overview CTA strengthened (no hard redirect yet — reversible).

---

## Cross-product implementation roadmap

| Priority | Change | Products | Risk |
|----------|--------|----------|------|
| 1 | Journey landings + demote equal cards | Scenes ✓ | Low |
| 2 | Nav labels follow human language | All ✓ partial | Low |
| 3 | Align hubs with startHere (Discover / Map / Coach) | V / Sheds / Scenes | Low–Med |
| 4 | Question spine on Dashboard | Dashboard | Med |
| 5 | Owner photography system expansion | All | Low (content) |
| 6 | Unify modules / unify Scenes URLs | Scenes | High — later |

---

## Owner review checklist

- [ ] Approve Scenes journey as the IA spine (not module names)
- [ ] Approve Dashboard question spine (widgets underneath)
- [ ] Approve Sheds “day’s hunt” vs map-as-product naming
- [ ] Approve Volunteer Discover-as-home direction
- [ ] Provide distinct owner photographs for Scenes / home / Sheds
- [ ] Decide when to hard-redirect Volunteer `/` → `discover.html` and Sheds `/` → `map/`

---

## Rollback

Experience doc and nav/landing copy are reversible via git on `recovery/rc3-consolidation`. No production deploy in this sprint. Deep engines (OIE, map, Coach analysis) intentionally untouched.
