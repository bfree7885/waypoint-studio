# Accessibility Review — Experience System V2 Sprint

**Date:** 2026-07-19  
**Scope:** Platform shared layer + sampled public apps

## Improvements shipped

| Area | Change |
|------|--------|
| Skip links | Sheds map now uses `.wds-skip` (plus `.sheds-skip` alias) |
| Focus | Shared `:focus-visible` rings for buttons, task nav, cards |
| Touch | `--wds-touch-min: 44px` applied to `.wds-btn`, task links, legacy `.btn` |
| Reduced motion | Skeleton shimmer disabled under `prefers-reduced-motion` |
| Screen reader | Error/empty states use `role="alert"` / `role="status"`; hints for offline/cache |
| Utility alias | `.wds-visually-hidden` aligned with `.wds-sr-only` pattern |
| Loading | Optional skeleton + `aria-busy` / `aria-live` in `loadingHtml({ skeleton: true })` |
| Product accents | Missing products get `[data-product]` tokens (helps contrast/theme consistency) |

## Existing strengths retained

- Global `.wds-skip` on almost all public pages
- App shell launcher focus trap
- `WDS.core.announce` live region
- Boot fail `role="alert"`

## Gaps remaining (honest)

1. **Maps** — Leaflet controls still mixed a11y; Sheds HUD needs deeper keyboard path audit
2. **Charts** — Dashboard timelines need text equivalents where only visual
3. **Dialogs** — No single shared modal primitive with focus trap everywhere
4. **Color contrast** — Steepleaf light theme and SignalTerrain cyber surfaces need a dedicated WCAG AA pass
5. **Photo Coach profile/guide** — shell `data-product` may still say `scenes` on some nested pages
6. **Automated axe/Playwright a11y** — not yet in CI for all routes

## Manual checks recommended for owner

- Keyboard: Tab through Apps launcher → product local nav → primary CTA
- VoiceOver (iOS) on Dashboard Today Outside + Fieldry empty capture
- NVDA on ForageCast task nav + error retry
- 320px width: no truncated focus rings; 44px targets hold
