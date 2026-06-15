# WDS Motion Philosophy

Motion in Waypoint Studio should feel like **breath**, not **bounce**. Users are often returning from the field — tired, content, reflective. Animation supports orientation and delight without demanding attention.

## Principles

### 1. Calm by default
- Durations: `--wds-duration-calm` (280ms) for UI; `--wds-duration-slow` (480ms) for hero/section reveals
- Easing: `--wds-ease-out` for entrances and state changes
- No elastic, spring, or playful overshoot in core UI

### 2. Respect reduced motion
All WDS CSS includes:

```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}
```

JS must branch on `WDS.core.prefersReducedMotion()` for scroll, parallax, and canvas effects.

### 3. Purpose over decoration
| Motion | Purpose |
|--------|---------|
| Tab switch | Confirm context change |
| Upload drag-over | Afford drop target |
| Hero `is-compact` | Collapse to workspace — user has begun |
| Export preview update | Show pipeline is live |
| Parallax / living scene | **Content** motion — subject of the product |

### 4. Content motion is separate
Living Scene, parallax depth, and map panning are **creative** motion layers. They follow scene presets and user toggles, not global UI timing tokens — but still honor reduced-motion (disable drift, tilt, and auto-animations).

## Token reference

```css
--wds-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--wds-ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);
--wds-duration-instant: 120ms;   /* toggles, chips */
--wds-duration-calm: 280ms;      /* buttons, borders, tabs */
--wds-duration-slow: 480ms;      /* panels, hero compact */
```

## UI patterns

### State change
Use opacity + border-color + background. Avoid scale transforms on buttons (feels "app store").

### Scroll
```js
WDS.core.scrollTo(element, { behavior: "smooth", block: "start" });
```
Falls back to `auto` when reduced motion is preferred.

### Modals
Fade backdrop via CSS; focus first control immediately (no staged delay).

### Lists & galleries
Staggered entrance is **optional** and product-specific. If used, cap at 40ms per item and disable entirely under reduced motion.

### Loading
Prefer skeleton placeholders with subtle opacity pulse (1.5s ease-in-out) over spinners for gallery/map loads. Spinners only for short blocking operations (< 2s).

## Haptics & sound
No default sound. Mobile haptics only when explicitly tied to a successful export or save — never on routine navigation.

## Testing checklist

- [ ] `prefers-reduced-motion: reduce` — no smooth scroll, no parallax drift
- [ ] Keyboard tab through animated panels — focus not lost mid-transition
- [ ] 60fps on tab switch and upload states on mid-tier mobile
- [ ] Hero compact transition does not clip focus rings
