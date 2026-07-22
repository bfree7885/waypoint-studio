# 03 — Dashboard Architecture

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [01-product-vision.md](./01-product-vision.md), [02-information-architecture.md](./02-information-architecture.md)

---

## Product definition

**Dashboard** is a **customizable outdoor workspace**: modular widgets, a **Today Outside** summary, information-first layout, observational language, extremely fast, user-configurable, and **kiosk-capable**.

It answers: *What do I want to see about outside near me — and what does today look like at a glance?*

It does **not** answer by forcing a single locked briefing composition (Outdoor OS). It does **not** merge Scenes or Sheds into the workspace.

---

## Architectural stance vs historical eras

| Era | Stance | Rebuild rule |
|-----|--------|--------------|
| Recovery / V2 / V3 | Widget grids, tabs, customize, kiosk hooks | **Reuse ideas and proven infra patterns**; do not treat old DOM/IA as binding |
| Outdoor OS | Anti-widget briefing; Happening → Matters → Do | **Do not revive as canonical presentation** |
| 2026 Rebuild | Widgets + Today Outside + observational + kiosk | **This document** |

Preserve (as infrastructure to evaluate at implementation time): Outdoor Intelligence providers, progressive hydrate, place prefs, trust chips, performance lessons.  
Retire as product law: Manifesto “one job briefing,” Screen Spec absolute anti-widget rules, Outdoor OS compose/render as the only home.

---

## First viewport (workspace)

The home surface is **one workspace composition** with two cooperating regions — not a wall of equal chrome, not a manifesto briefing stack.

```
┌─────────────────────────────────────────────────────────┐
│ Shell: brand · product switch · place · trust · actions │
├─────────────────────────────────────────────────────────┤
│ TODAY OUTSIDE (summary region)                          │
│  Place · time context                                   │
│  Short observational summary of the day                 │
│  Optional alert interrupt (safety-critical only)        │
├─────────────────────────────────────────────────────────┤
│ WIDGET WORKSPACE                                        │
│  User-ordered modular widgets (defaults provided)       │
│  Progressive hydrate per widget                         │
└─────────────────────────────────────────────────────────┘
```

**Today Outside** orients. **Widgets** inform. Neither replaces the other.

---

## Today Outside summary

### Job

A compact, honest summary of outdoor conditions **near the user’s place**, written in observational language. It is a **summary**, not a full product and not a homework coach.

### Contents (baseline)

- Place label + time context (local clock / day part — honest about unknown place)
- Short prose or structured lines: air, light, sky, notable water/air quality when available
- Trust micro-state (Live / Cached / Partial / …)
- Safety alerts only when they genuinely interrupt (severe weather, AQI hazard, etc.)
- Optional “best light / calm window” as **observation**, not “Do this” command voice

### Non-goals

- Mandatory three-act Outdoor OS narrative (Happening / Matters / Do)
- Replacing the widget workspace
- Fabricating richness when providers fail — say what is unknown

### Language

Prefer: “Air quality is moderate here.” / “Light softens after late afternoon.”  
Avoid: “You should go now.” / quiz tone / urgency hacks.

---

## Widget model

### Principles

1. **Modular** — each widget is an independent unit: id, title, category, size, data contract, render, trust.
2. **User-configurable** — visibility, order, size (within allowed sizes), collapse where useful.
3. **Information-first** — primary surface shows facts/estimates clearly; interpretation is secondary and labeled.
4. **Independent hydrate** — one slow provider must not block the shell or sibling widgets.
5. **Honest empty** — Pending / Unavailable / Educational-fallback clearly labeled — never fake live numbers.
6. **Detail on demand** — expand or open a sheet; do not force every instrument into the summary.

### Widget contract (logical)

| Field | Purpose |
|-------|---------|
| `id` | Stable key |
| `title` | Human label |
| `category` | Grouping for catalog/customize (conditions, light, air, water, alerts, learning, …) |
| `size` | e.g. `sm` \| `md` \| `lg` \| `anchor` |
| `defaultVisible` / `defaultOrder` | Sensible first-run layout |
| `getData(ctx)` / providers | Async-capable; returns typed payload + trust |
| `render` | Presentational only |
| `detail` | Optional deeper view |
| `kiosk` | Flags: show in kiosk, refresh policy, chrome density |

### Catalog direction (illustrative, not a locked inventory)

Rebuild implementation will define the shipping catalog; historical V2/V3 catalogs are reference only. Expected families:

- **Conditions** — temperature, sky, precip, wind
- **Light** — sun/moon, golden/blue observational windows
- **Air** — AQI and related honesty
- **Water** — rivers/gauges where relevant to place
- **Alerts** — official alerts
- **Day context** — short arc / timeline (optional widget, not mandatory OS day-arc)
- **Learning** — optional educational widgets; off by default in “morning field” presets

Do not reintroduce Scenes shoot-review or Sheds map as core Dashboard widgets. Cross-link chips are enough.

### Customize

- Enter/exit customize mode without losing place context
- Add from catalog, remove, reorder, resize within constraints
- Presets: e.g. Morning field · Photographer light · Minimal · Kiosk wall
- Reset to defaults
- Persist layout **local-first** (no account required)

---

## Performance architecture

**Extremely fast** is a product requirement, not a nice-to-have.

1. **Shell first** — brand, place chrome, Today Outside skeleton, widget frames paint before providers settle.
2. **No single-flight gate** — do not wait for all providers to render the workspace.
3. **Per-widget settle** — each widget shows loading → live/cached/unavailable independently.
4. **Cache honestly** — cached data labeled; stale thresholds visible in trust UI.
5. **Avoid layout thrash** — reserved widget geometry; skeletons match final size where practical.
6. **Kiosk refresh** — timed revalidation without full document reload; pause when document hidden if appropriate.

Targets (baseline for implementation planning; tune in perf reviews):

- First meaningful shell: immediate on local assets
- Today Outside text: progressive; prefer useful partial within a short budget
- Interactive customize: available without full hydrate

---

## Kiosk mode

First-class Dashboard capability:

| Concern | Behavior |
|---------|----------|
| Chrome | Minimal; hide customize unless unlocked |
| Layout | Kiosk preset or last kiosk layout; large type optional |
| Refresh | Automatic, calm, labeled |
| Interaction | Touch-friendly; optional idle dim |
| Privacy | No surprise location prompts on a public display — place must be pre-set |
| Failure | Honest offline / partial — never invent |

Kiosk is not a separate product; it is a presentation mode of the same workspace + Today Outside.

---

## Data & engines

Logical layers (greenfield names; map to existing code only at implementation):

```
Place context
    ↓
Provider bus (weather, air, water, alerts, astronomy, …)
    ↓
Dashboard model (normalize + trust)
    ├── Today Outside composer (summary only)
    └── Widget data adapters
            ↓
        Workspace render + Customize + Kiosk
```

Outdoor Intelligence Platform and prior dashboard engines are **candidates to adapt**, not sacred presentation stacks. Outdoor OS `dashboard/os/*` is historical presentation.

---

## Accessibility

- Keyboard customize (reorder/add) with visible focus
- Widget titles as headings; summaries not only color
- Alert interrupts announced appropriately
- Reduced motion respected for refresh/transitions
- Contrast for outdoor/kiosk viewing

---

## Explicit non-goals (Dashboard)

- Rebuilding Outdoor OS as the home
- Merging Scenes coaching into the workspace
- Making the map the home (that is Sheds)
- Engagement farming, streaks, artificial scarcity
- Fabricated hometown content
- Binding agents to archived Manifesto/Screen Spec

---

## Approval note

Implementation should retire current Outdoor OS product path only after owner approval of this baseline and an explicit rebuild implementation mandate.
