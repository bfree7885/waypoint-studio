# Dashboard V2 — Accessibility

## Implemented

- Semantic headings: `h2` Today Outside, `h3` section titles
- Skip link to briefing (`#wdb-v2-brief-title`)
- `aria-live="polite"` on location line
- Overview panels: `<button>` with focus-visible styles (not div-only)
- Timeline: ordered list with text times (not color-only)
- Activity suitability: text label + class (not color alone)
- Trust table in `<details>` to reduce noise
- `prefers-reduced-motion`: disables smooth scroll on timeline
- Touch targets ≥44px on mobile header actions

## Screen reader

- Official alerts include severity, effective/expire times, area
- Limiting factors prefixed with screen-reader-only "Limiting:"

## Remaining gaps

- [ ] Live region announcement when briefing upgrades from cached → live
- [ ] Chart equivalents if hourly charts added later
- [ ] Full keyboard path through horizontal timeline (arrow buttons)

## Manual checks recommended

VoiceOver (iOS) and NVDA (desktop) on briefing + tab panel switch.
