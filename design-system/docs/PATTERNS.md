# WDS HTML Patterns

Reusable markup for Waypoint Studio products. Combine with `wds.css` and optional `WDS.*` JS modules.

## App shell

```html
<a class="wds-skip" href="#main">Skip to content</a>
<div class="wds-app">
  <header class="wds-topbar">…</header>
  <main id="main">…</main>
  <footer class="wds-footer">Waypoint Studio</footer>
</div>
```

## Top bar + brand

```html
<header class="wds-topbar">
  <div class="wds-topbar__inner">
    <a class="wds-brand" href="/">
      <span class="wds-brand__mark" aria-hidden="true"></span>
      <span class="wds-brand__name">ForageCast</span>
    </a>
    <nav class="wds-nav" aria-label="Primary">
      <button type="button" class="wds-btn wds-btn--ghost wds-btn--sm">Sign in</button>
    </nav>
  </div>
</header>
```

## Hero

```html
<section class="wds-hero">
  <div class="wds-hero__hearth" aria-hidden="true"></div>
  <div class="wds-hero__inner">
    <p class="wds-eyebrow">Bring Nature to Life</p>
    <h1 class="wds-display-xl">You made it home.<br><em class="wds-em">Let the day breathe.</em></h1>
    <p class="wds-lead">Quiet tools for photographers returning from the field.</p>
    <div class="hero-actions">
      <button type="button" class="wds-btn wds-btn--primary wds-btn--lg">Unpack a frame</button>
      <p class="wds-caption">JPG, PNG, WebP · 20 MB</p>
    </div>
  </div>
</section>
```

Add `is-compact` after first upload or when entering workspace mode.

## Workspace layout (canvas + sidebar)

```html
<div class="wds-layout">
  <div class="workspace-canvas">…</div>
  <aside class="wds-sidebar" data-awaiting="Choose a frame to adjust the scene.">
  </aside>
</div>
```

Add `is-awaiting` on sidebar until content is loaded.

## Tabs

```html
<nav class="wds-tabs" id="workspace-tabs" role="tablist" aria-label="Studios">
  <button type="button" class="wds-tab is-active" role="tab"
    id="tab-btn-one" data-tab="one" aria-selected="true" aria-controls="tab-one">Living Scene</button>
  <button type="button" class="wds-tab" role="tab"
    id="tab-btn-two" data-tab="two" aria-selected="false" aria-controls="tab-two">Export</button>
</nav>
<section class="tab-panel is-active" id="tab-one" role="tabpanel" aria-labelledby="tab-btn-one">…</section>
<section class="tab-panel" id="tab-two" role="tabpanel" aria-labelledby="tab-btn-two" hidden>…</section>
```

Initialize: `WDS.tabs.init({ tablist: document.getElementById("workspace-tabs") })`

## Buttons

| Class | Use |
|-------|-----|
| `wds-btn wds-btn--primary` | Primary action |
| `wds-btn wds-btn--secondary` | Secondary |
| `wds-btn wds-btn--ghost` | Tertiary / nav |
| `wds-btn--lg` | Hero CTAs |
| `wds-btn--sm` | Dense toolbars |
| `wds-btn--block` | Full width |

## Cards & panels

```html
<div class="wds-panel">
  <header class="wds-panel__header">
    <h2 class="wds-panel__title">Atmosphere</h2>
  </header>
  …
</div>

<button type="button" class="wds-card wds-card--interactive">
  <h3 class="wds-card__title">Mist at dawn</h3>
  <p class="wds-card__desc">Soft lift, cool shadows</p>
</button>
```

## Empty state

```html
<div class="wds-empty">
  <div class="wds-empty__icon" aria-hidden="true">◎</div>
  <h2 class="wds-empty__title">Nothing here yet</h2>
  <p class="wds-empty__text">Unpack a frame to begin.</p>
  <button type="button" class="wds-btn wds-btn--primary">Unpack a frame</button>
</div>
```

## Forms

```html
<div class="wds-field">
  <label class="wds-label" for="title">Title</label>
  <input class="wds-input" id="title" type="text" placeholder="Morning at the creek">
</div>
<input class="wds-range" type="range" min="0" max="100" value="40" aria-label="Intensity">
```

## Upload

```html
<div class="wds-upload">
  <div class="wds-dropzone" id="dropzone">…</div>
  <p class="wds-upload-error" role="alert" hidden></p>
</div>
<input type="file" id="file-input" accept="image/*" hidden>
```

```js
WDS.upload.bind({
  input: document.getElementById("file-input"),
  triggers: [document.getElementById("btn-upload")],
  dropzones: [document.getElementById("dropzone")],
  onFile: handleFile,
  onError: showError
});
```

## Search

```html
<div class="wds-search">
  <svg class="wds-search__icon" … aria-hidden="true"></svg>
  <input class="wds-search__input" type="search" placeholder="Search species…" autocomplete="off">
  <button type="button" class="wds-search__clear" hidden>Clear</button>
</div>
```

## Map chrome

```html
<div class="wds-map">
  <div class="wds-map__canvas" id="map"></div>
  <div class="wds-map__chrome">
    <span class="wds-map__coords">43.6591° N, 70.2568° W</span>
    <span>Terrain · SignalTerrain</span>
  </div>
</div>
```

Map tiles and engines are product-specific; WDS provides frame, coords typography, and bottom chrome.

## Education / lesson page

**Canonical template:** Waypoint Education Framework (WEF). Every lesson uses the same eleven sections — see [education/SECTIONS.md](../education/SECTIONS.md).

```html
<div id="learn-curriculum" aria-label="Learn"></div>
<script src="design-system/js/wds-education.js"></script>
<script>
  WDS.education.renderCurriculum(
    document.getElementById("learn-curriculum"),
    MyCurriculum
  );
</script>
```

Legacy Scenes content (`steps`, `fieldExercise`, `reflection`, `challenge`) passes through `{ legacy: true }`.

### Section markup (rendered output)

```html
<article class="wef-lesson" id="lesson-id">
  <header class="wef-lesson-header">
    <div class="wef-domain-tags">…</div>
    <h4 class="wef-lesson-title">Lesson title</h4>
  </header>
  <div class="wef-lesson-sections">
    <section class="wef-section wef-section--what">…</section>
    <section class="wef-section wef-section--why">…</section>
    <!-- identify, howItWorks, fieldObservations, mistakes, ethics, safety, related, challenge, quiz -->
  </div>
</article>
```

### Simpler step block (manual / partial)

```html
<article class="wds-lesson">
  <h3 class="wds-lesson__title">Reading the light</h3>
  <ol class="wds-steps">
    <li><span class="wds-step-num">1</span> Notice where shadow softens.</li>
  </ol>
  <div class="wds-field-block wds-field-block--exercise">
    <span class="wds-field-label">In the field</span>
    Find one subject lit from behind.
  </div>
  <div class="wds-field-block wds-field-block--reflection">
    <span class="wds-field-label">Reflection</span>
    What mood does backlight suggest?
  </div>
</article>
```

## Species page

```html
<header class="wds-species-hero">
  <div>
    <p class="wds-eyebrow">Species</p>
    <h1 class="wds-species-name">Amanita muscaria</h1>
    <p class="wds-species-common">Fly agaric</p>
    <div class="wds-species-meta">
      <span class="wds-tag">Toxic</span>
      <span class="wds-tag">Coniferous woods</span>
    </div>
  </div>
  <figure>…</figure>
</header>
```

## Gallery & collection

```html
<header class="wds-collection-header">
  <div class="wds-collection-rule" aria-hidden="true"></div>
  <h1 class="wds-display-lg">Back from the field</h1>
  <p class="wds-lead">Frames waiting for the wall.</p>
</header>

<div class="wds-gallery wds-gallery--masonry">
  <div class="wds-gallery__item">
    <button type="button" class="wds-gallery__hit" data-search-text="creek morning">
      <img class="wds-gallery__img" src="…" alt="Creek at morning" loading="lazy">
    </button>
  </div>
</div>
```

## Export page

```html
<div class="wds-panel">
  <h2 class="wds-panel__title">Share</h2>
  <div class="wds-export-stage">
    <canvas id="export-canvas"></canvas>
    <p class="wds-export-empty">Choose a frame to preview export.</p>
  </div>
  <button type="button" class="wds-btn wds-btn--primary wds-btn--block">Save PNG</button>
</div>
```

## Chips / filters

```html
<button type="button" class="wds-chip is-active" aria-pressed="true">All</button>
<button type="button" class="wds-chip" aria-pressed="false">Landscapes</button>
```

## Toggle

```html
<label class="wds-toggle">
  <input type="checkbox" checked>
  <span class="wds-toggle__track"><span class="wds-toggle__thumb"></span></span>
  <span class="wds-body">Gentle drift</span>
</label>
```

## Modal

```html
<div class="wds-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="wds-modal__backdrop"></div>
  <div class="wds-modal__dialog">
    <h2 id="modal-title" class="wds-display-md">Frame detail</h2>
    …
  </div>
</div>
```

Use `WDS.core.trapFocus(dialog)` on open.

## Iconography

- **Style:** 1.5px stroke, rounded caps, 24×24 viewBox
- **Weight:** Single-weight line icons; no filled sets mixed with outline
- **Color:** `currentColor` — inherits `var(--wds-text-tertiary)` for decorative, `var(--wds-text)` for interactive
- **Size utility:** `wds-icon` — `width/height: 1.25rem`

Decorative icons: `aria-hidden="true"`. Meaningful icons: pair with visible text or `aria-label`.

## Accessibility checklist

- Skip link to main content
- `:focus-visible` ring using `--wds-focus`
- Tab panels: `role`, `aria-selected`, `aria-controls`, roving `tabindex`
- Errors: `role="alert"` on upload/validation messages
- Live updates: `WDS.core.announce()`
- Color contrast: text on `--wds-bg` meets WCAG AA for body and UI labels
- Touch targets: minimum 44×44px on mobile for primary controls

## Mobile behavior

- Tabs scroll horizontally with hidden scrollbar
- Sidebar stacks below canvas under 1024px
- Hero padding reduces; tab labels may shrink to `wds-text-xs`
- Bottom-safe areas: add `padding-bottom: env(safe-area-inset-bottom)` in product CSS when using fixed nav
