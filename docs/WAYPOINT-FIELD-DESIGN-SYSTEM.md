# Waypoint Field Design System

**Status:** Emerging foundation (seeded by Sheds Experience Redesign V1)  
**Audience:** Field apps — Sheds, Fieldry, ForageCast, SignalTerrain, and future outdoor tools  
**Related:** Product Framework · Sheds Experience Redesign V1

---

## Philosophy

Waypoint field apps help people **observe** conditions, **understand** why they matter, and choose their own **direction**.

They are not dashboards with a map attached.  
**The map (or field surface) is the product.** Chrome supports it; chrome never competes with it.

The interface should feel like an experienced partner in the field:

- calm
- clear
- trustworthy
- glove-friendly
- glanceable in bright sun

Never like:

- a website with a map widget
- a developer control panel
- a school assignment
- an engagement feed

---

## First-second story

Opening a field app should answer, within about one second:

1. Where am I?
2. What does today / this moment look like?
3. Where should I look / go / watch first?
4. Why?

Everything else is secondary.

If a user studies the UI for more than a few seconds before knowing what to do, the hierarchy has failed.

---

## Information layers

| Layer | Examples | Exposure |
|-------|----------|----------|
| **Immediate** | You are here · recommendation · primary action | Always visible, minimal |
| **Soon** | Why · confidence · distance · conditions | Collapsed sheet / one tap |
| **Later** | Layers · model weights · history · ethics · export | Tools sheet / deep sheets |

Do not put Later information in the first viewport.

---

## Shared patterns

### Full-bleed field surface

- Map (or equivalent) fills the viewport (`absolute; inset: 0`).
- No stacked app chrome stealing vertical space.
- Safe-area insets respected on all floating UI.

### Floating brand chip

- Small product mark + name.
- Never a full website header.
- Optional quiet context control (status / ethics / season).

### Presence chip (“You are here”)

- One calm location statement.
- Tap to locate / re-locate.
- Tracking appears only when active.

### Intention FABs

- Icon-only, large (≈44–54px), high contrast.
- Prefer goals over implementation: Locate, Track, Tools — not “GPS”, “Layers”, “Settings”.
- One primary accent control at a time.
- Secondary actions live in Tools.

### Story bottom sheet

- Collapsed: day/quality line · destination · confidence phrase.
- Expanded: evidence, distance, wind/snow context, reasoning, optional research.
- Reads as conversation, not database output.
- Grab handle + chevron for affordance; reduced motion supported.

### Confidence without gamification

- Prefer plain language (“Moderate confidence”) over empty stars, scores, or streaks.
- Always distinguish relative guidance from certainty.

### Overlay discipline

- Terrain remains readable.
- Priority / heat washes are soft and optional.
- Legends appear only when the overlay is meaningful.

### Loading & offline

- Soft terrain-toned placeholders — never a broken dark void of gray tiles as the emotional default.
- Offline is honest and short.
- GPS delay is expected; copy stays calm.

### Motion

- Motion communicates focus, continuity, and state change.
- Sheet expand/collapse, locate pulse, overlay fade.
- Never decorative bounce or engagement bait.
- Honor `prefers-reduced-motion`.

### Typography

- Serif for destination / story glance (human, calm).
- Sans for controls and meta.
- Large glance text; avoid tiny metadata in Immediate layer.

### Color hierarchy

- Forest / field palette.
- One accent for focus (destination, primary locate).
- Danger reserved for true problems (denied location, offline risk).
- Avoid purple-on-white, cream/terracotta clichés, and glow-heavy “AI dark mode.”

---

## Accessibility

- 44px minimum touch targets.
- Focus-visible rings on all interactive chrome.
- Screen-reader labels that describe intention (“Locate me”, “Show on map”).
- Expand/collapse controls expose `aria-expanded`.
- Contrast sufficient for outdoor glare (favor solid surfaces over fragile translucency when needed).
- One-handed reach: primary FABs on the right; story sheet at the bottom.

---

## Autonomy language

Prefer: consider · worth watching · relative guidance · your decision · optional.

Avoid unless safety/technical: must · homework · streak · complete today’s task · take action now.

Safety, legality, and wildlife ethics stay clear and direct.

---

## Components to share next

Promote from Sheds into a shared Field kit when a second app needs them:

1. `wds-field-map-shell` — full-bleed map + loading + offline
2. `wds-field-fab-rail` — intention FABs
3. `wds-field-story-sheet` — collapsed/expanded conversation sheet
4. `wds-field-presence` — you-are-here chip
5. `wds-field-confidence` — plain-language confidence
6. `wds-field-tools-sheet` — Later actions
7. Tokens: spacing, blur, accent, safe-area, sheet peek height

---

## Anti-patterns

- Multi-row button decks permanently over the map
- Empty star ratings on first launch
- Exposing model weights before a recommendation
- Competing HUDs (brand + GPS + session + legend + five labeled FABs)
- “Go do this now” obligation copy
- Infinite scroll research feeds over the field surface

---

## Remaining V2 work

- Extract shared CSS/JS modules from Sheds into `design-system/`
- Apply patterns to Fieldry (Record) and ForageCast (Explore)
- Optional haptic / audio cues for destination focus (careful, opt-in)
- Daylight / high-contrast outdoor theme toggle
- Gesture sheet drag (beyond tap expand)
