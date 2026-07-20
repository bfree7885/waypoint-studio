# Design System Changes — Experience System V2

## Files created

- `design-system/css/wds-experience-v2.css`
- `automation/test-experience-system-v2.mjs`
- `docs/Experience-System-V2.md` (+ sibling review docs)

## Files modified (shared)

| File | Change |
|------|--------|
| `wds-tokens.css` | Product accents + touch token |
| `wds.css` | Import experience-v2 |
| `wds-dashboard-home.css` | Import platform-ui, boot, experience-v2 |
| `wds-platform-ui.css` | Token-first colors (less light `#555/#222/#fff` fallbacks) |
| `wds-platform-boot.css` | Token fonts/colors |
| `wds-platform-ui.js` | v2.0.0 empty/error/loading helpers |

## Files modified (apps / studio)

| File | Change |
|------|--------|
| Studio HTML (index, about, contact, privacy, support, knowledge, settings) | Drop redundant app-shell CSS |
| `apps/dashboard/index.html` | Drop duplicate shell CSS; skeleton uses shared shimmer |
| `apps/photo-coach/*` | `.wds-btn` + CSS dual selectors + shell product id |
| `apps/waypoint-scenes/*` | `.wds-btn` in HTML/JS |
| `apps/landscape-interpretation/css/lie.css` | Fonts via `--wds-font-*` |
| `apps/shed-hunting/map/index.html` | Experience CSS + shared skip |

## Not changed (by design)

- Product-specific visual themes (ForageCast educational light, Steepleaf green, etc.)
- Sheds immersive map HUD layout
- OIP / weather provider logic
- University private Scholar UI
