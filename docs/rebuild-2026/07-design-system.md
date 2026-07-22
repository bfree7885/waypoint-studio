# 07 — Design System

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [01-product-vision.md](./01-product-vision.md)  
**Code home (existing):** `design-system/` (WDS)

---

## Role in the rebuild

The **Waypoint Design System (WDS)** is the shared visual and interaction language for Dashboard, Scenes, and Sheds. It is **not** a fourth product and **not** a license to merge product IA.

Rebuild UI must:

- Share tokens, typography scale, trust patterns, focus, motion preferences
- Keep **product-specific composition** (workspace vs craft tools vs map)
- Prefer extending WDS over one-off CSS islands — without forcing Outdoor OS briefing components back into Dashboard

---

## North star

Tools should feel like returning from a day outdoors: warm, quiet, precise, respectful of subject and place.

Align with Product Standards: calm, trustworthy, honest, welcoming, curious, encouraging, thoughtful.

---

## Product accents (rebuild portfolio)

| Product | Character | Guidance |
|---------|-----------|----------|
| **Dashboard** | Clear field instruments; calm workspace | Information density without chrome noise; kiosk-legible type |
| **Scenes** | Sage / stillness / light | Craft focus; image-first; quiet coaching chrome |
| **Sheds** | Antler tan / forest field | Map-first; outdoor contrast; glove-friendly controls |

Avoid generic AI-default looks (purple-on-white gradients, cream+terracotta clichés, broadsheet hairline denseness) unless an existing WDS token set already defines the product — then **preserve WDS**, do not invent a parallel system.

---

## Shared building blocks

| Block | Use across products |
|-------|---------------------|
| **App Shell** | Global brand + product switch; local nav hooks |
| **Trust chips** | Live / Cached / Partial / Offline / Unavailable |
| **Honest loading** | Skeletons / progressive regions — never fake data |
| **Place control** | Transparent permission and place picker patterns |
| **Buttons / forms / focus** | Shared a11y baseline (visible focus, 44px targets where touch) |
| **Motion** | Intentional, sparse; honor `prefers-reduced-motion` |
| **Typography** | WDS fonts — expressive but shared; do not introduce random third stacks per page |

---

## Composition rules by product

These are **rebuild composition rules**, not Outdoor OS Absolute Rules.

### Dashboard

- Workspace = Today Outside region + widget grid (see [03-dashboard-architecture.md](./03-dashboard-architecture.md))
- Widgets may use light containment **for interaction and scanning**; avoid decorative card spam
- Customize mode visually distinct but calm
- Kiosk: large type, low chrome, high contrast option

### Scenes

- Image is the hero of craft tools
- Hub: one job — choose a module; avoid dashboard-of-stats
- Coaching UI: readable critique, no grade theater

### Sheds

- Full-bleed map plane; floating chrome
- Sheets and FABs — not stacked marketing sections on the field view
- Legend and GPS status glanceable outdoors

### Do not apply

- “One composition briefing only / zero widgets” (Outdoor OS) to Dashboard rebuild
- Scenes gallery-card aesthetics as Sheds map chrome
- Sheds FAB rail as Dashboard navigation

---

## Observational language in UI copy

Shared microcopy standards:

- Describe conditions and uncertainty; do not assign homework
- Label estimates and models
- Empty states teach what is missing, not shame the user
- Alerts: rare, safety-justified, calm severity

Product-specific copy systems may extend this; they must not contradict Product Standards.

---

## Accessibility baseline

- Semantic landmarks and headings per surface
- Keyboard access to customize (Dashboard), library (Scenes), map controls (Sheds — with known canvas limits disclosed)
- Color not the sole channel for trust or severity
- Reduced motion; zoom-friendly layouts
- Kiosk and outdoor sunlight contrast considered for Dashboard and Sheds

---

## Performance & progressive enhancement

- CSS/JS from WDS should not block first product paint
- Product pages work with core content even if secondary enhancements fail
- No design-system import that re-enables retired Outdoor OS presentation by default

---

## Token & theme practice

- Prefer CSS variables from WDS
- `data-product` (or successor) scopes accent without forking entire CSS
- Dark/night atmospheres only when product-justified (e.g. time-of-day Dashboard) — not as default aesthetic cosplay

---

## Relationship to archived visual specs

Aurora/RC3 and Outdoor OS screen specs are **historical**. When rebuild implementation starts:

1. Follow this document + product architecture docs
2. Consult archived specs only for archaeology
3. Update `design-system/README.md` product table to Dashboard · Scenes · Sheds as core portfolio when implementation lands (not required in this docs-only baseline beyond this pointer)

---

## Explicit non-goals

- A new parallel design system beside WDS
- Using design-system work to smuggle Outdoor OS components as Dashboard default
- Pixel-preserving Recovery/V2/V3 chrome as sacred
