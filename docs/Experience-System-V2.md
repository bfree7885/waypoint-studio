# Experience System V2

**Status:** Implemented in working tree — **do not commit / do not push until requested**  
**Version:** Platform UI `2.0.0` · CSS `wds-experience-v2.css`

## Mission

Make Waypoint Studio feel like one professionally designed platform through shared visual language, navigation philosophy, loading/error/empty patterns, accessibility, and mobile behavior — without adding product features.

## What shipped

### Shared layer

| Asset | Role |
|-------|------|
| `design-system/css/wds-experience-v2.css` | Cards, empty pages, badges, focus/touch, reading width, Steepleaf/ST nav aliases, Sheds skip, skeleton cohesion |
| `design-system/css/wds-tokens.css` | Accents for `dashboard`, `waypoint-volunteer`, `landscape-interpretation`, `studio-home`, `photo-coach`, `photo-library`; `--wds-touch-min` |
| `design-system/js/platform/wds-platform-ui.js` | v2 helpers: `emptyPageHtml`, richer `errorHtml` / `loadingHtml` (skeleton + hints + cache honesty) |
| `wds.css` + `wds-dashboard-home.css` | Import Experience System V2 |

### Adoption fixes

- Removed redundant `wds-app-shell.css` links on studio pages and Dashboard (already imported)
- Photo Coach + Scene Builder markup migrated from `.btn` → `.wds-btn`
- Dashboard critical skeleton aligned to shared shimmer tokens
- Landscape Interpretation fonts ride `--wds-font-*` rails
- Sheds map: `wds-skip` + Experience System CSS (immersive HUD retained)
- Boot shell uses token fonts/colors (no light `#555` / `#222` defaults)
- Platform UI light-mode hardcoded fallbacks cleaned toward tokens

## Design principles

1. **Consistency over novelty** — one card, badge, button, and empty-page language
2. **Progressive honesty** — loading/error states explain cache, retry, and next step
3. **Accessibility by default** — 44px targets, focus-visible, reduced motion, skip links
4. **Product accents stay** — `[data-product]` themes products; structure stays shared

## How apps should use it

```js
// Empty guidance
WDS.platformUi.emptyPageHtml({
  eyebrow: "Fieldry",
  title: "No observations yet",
  text: "Capture your first field note when you are outside.",
  actionHref: "#capture",
  actionLabel: "Start a note"
});

// Error with cache honesty
WDS.platformUi.errorHtml({
  kind: "offline",
  text: "Live weather paused.",
  cached: true,
  retry: true
});
```

```html
<article class="wds-xcard">
  <header class="wds-xcard__head">
    <h3 class="wds-xcard__title">Title</h3>
    <span class="wds-badge wds-badge--live">Live</span>
  </header>
  <p class="wds-xcard__body">…</p>
</article>
```

## Related docs

- `Accessibility-Review.md`
- `Design-System-Changes.md`
- `Platform-Consistency-Report.md`
- `Mobile-Review.md`
- `Remaining-UX-Debt.md`
