# Outdoor Intelligence Dashboard

**Source of truth for the Dashboard presentation layer (RC2.5 through Sprint 5 polish).**

Product question: *“I’m heading outside today. What should I know?”*  
Goal: interpretation over information, readable in under 30 seconds.

Related: [`docs/DASHBOARD-V2.md`](./DASHBOARD-V2.md), [`docs/DASHBOARD-V2-IMPLEMENTATION.md`](./DASHBOARD-V2-IMPLEMENTATION.md), [`docs/OUTDOOR-INTELLIGENCE-ENGINE.md`](./OUTDOOR-INTELLIGENCE-ENGINE.md) when present — V2 owns catalog/prefs/take/engine; V3 is the Brief-first presentation shell over the same model.

---

## Philosophy

1. **Interpretation over information** — Today’s Outdoor Brief answers the product question before any widget grid.
2. **Shell first** — HTML paints immediately; providers hydrate incrementally.
3. **Widgets are independent** — one failure never blanks the board (`renderCardSafe`).
4. **Cache first, honesty always** — cached/offline/partial trust labels stay visible.
5. **One data model** — Dashboard and Kiosk share OIP + `dashboardV2Model` / prefs / take / trust.
6. **Calm hierarchy** — whitespace and typography carry structure; decoration stays secondary.

---

## Shell structure

```
Connectivity banner (when offline/cached)
Header (+ live clock in kiosk)
Today’s Outdoor Brief   ← hero (sticky in kiosk)
Widget Area             ← modular grid via layout engine
Customize Dashboard     ← hidden in kiosk
Footer                  ← trust / kiosk hint
```

Entry: `apps/dashboard/index.html` → `home-boot.js` → content/dashboard engines → recovery mounts V2/V3 board.

Feature flags:

| Key | Default | Effect |
|-----|---------|--------|
| `waypoint-dashboard-v3` | **on** | V3 shell (Brief-first). Set `"0"` for V2 board. |
| `waypoint-dashboard-v2` | on | Entire customizable board. Set `"0"` for V1 summary shell. |
| `waypoint-dashboard-v2-kiosk` | off | Persisted fullscreen/kiosk preference. |
| `waypoint-dashboard-v3-kiosk-rotate` | off | Opt-in layout preset rotation in kiosk. |
| `waypoint-dashboard-v3-kiosk-refresh-ms` | `300000` | Kiosk auto-refresh interval (min 60s). |

---

## Folder map

```
apps/dashboard/
  index.html              # Shell host (skeleton first)
  js/home-boot.js         # Boot / OIP hydrate

design-system/js/dashboard/
  v3/                     # Presentation + kiosk polish
    wds-dashboard-v3-categories.js
    wds-dashboard-v3-catalog.js
    wds-dashboard-v3-contract.js
    wds-dashboard-v3-layout.js
    wds-dashboard-v3-layouts.js     # named saved layouts
    wds-dashboard-v3-library.js     # widget library browser
    wds-dashboard-v3-take.js
    wds-dashboard-v3-brief.js
    wds-dashboard-v3-customize.js
    wds-dashboard-v3-shell.js
    wds-dashboard-v3-kiosk.js       # Sprint 5 controller
    wds-dashboard-v3.js
  v2/                     # Model, prefs, take, widget bodies, intel, customize
  wds-dashboard-engine.js
  wds-dashboard-recovery.js
  wds-dashboard-reliability.js

design-system/css/
  wds-dashboard-v3.css    # Brief, layout, mobile, kiosk, a11y
  wds-dashboard-v2.css    # Shared widget / customize styles

kiosk.html + css/kiosk.css + js/kiosk.js
  Standalone wall display — Outdoor Brief strip + condition panels (OIP modules).
  Flagship fullscreen path remains Dashboard → Kiosk (shared engine).
```

API surface (global `WDS`):

| API | Role |
|-----|------|
| `dashboardV3` | Orchestrator — render / bind / flags |
| `dashboardV3Shell` | Header · Brief · widgets · customize · footer |
| `dashboardV3Brief` | Today’s Outdoor Brief builder + reusable summary list |
| `dashboardV3Contract` | Widget card contract (safe render) |
| `dashboardV3Layout` | Order, sizes, densify, DnD hooks, rotation profiles |
| `dashboardV3Layouts` | Named saved layouts / presets (Daily Brief, Photography, …) |
| `dashboardV3Library` | Widget library browser API |
| `dashboardV3Customize` | V3 customize panel (library + layouts) |
| `dashboardV3Take` | Shared Waypoint’s Take component |
| `dashboardV3Kiosk` | Auto-refresh, clock, connectivity, layout presets |
| `dashboardV3Categories` | Category registry |
| `dashboardV2*` / `dashboardV2WidgetIntel` | Model, prefs, take, focus interpreters |
| `outdoorBriefEngine` | Rule-driven Outdoor Brief intelligence (when loaded) |

---

## Widget system

Architecture supports ten categories (not every category is fully populated):

1. Photography  
2. Weather  
3. Hiking  
4. Rivers  
5. Air Quality (`air`)  
6. Astronomy  
7. Wildlife  
8. Travel  
9. Emergency  
10. Favorites  

Every widget card supports title/icon, primary value, secondary details, last updated, loading/error, refresh/expand, and optional Waypoint’s Take bullets. Failures are isolated by `renderCardSafe`.

**Rule:** widgets must not depend on other widgets. Register in `dashboardV2Widgets`, render body in `dashboardV2WidgetRender`, keep `availability` honest.

Layout storage: `waypoint-dashboard-v3-layout-v1`  
Named layouts: `waypoint-dashboard-v3-layouts-v1`  
Widget enable/order prefs: `waypoint-dashboard-v2-widgets-v1`

---

## Today’s Outdoor Brief

Prefer `WDS.outdoorBriefEngine.generate` when present; otherwise `WDS.dashboardV2Take.generateWaypointsTake` (deterministic rules — no paid AI).

```js
const brief = WDS.dashboardV3Brief.build({ model });
const html = WDS.dashboardV3Brief.render(brief, { sticky: true }); // kiosk
```

Answers the product question in a short bullet list. In kiosk mode the Brief stays visible (sticky on wide viewports; static on narrow / reduced-motion).

---

## Kiosk mode

### Dashboard fullscreen (flagship)

Toggle via **Kiosk** in the V3 header (`#wdb-v2-kiosk`). Same data model, prefs, trust, and Take engine.

| Behavior | Detail |
|----------|--------|
| Full screen | `requestFullscreen` + `wdb-v3-kiosk` / `wdb-v2-kiosk` document classes |
| Live clock | Updated every second without re-rendering the board |
| Auto-refresh | Default every 5 minutes; pauses while the tab is hidden |
| Always-visible Brief | Sticky Brief + large typography |
| Minimal chrome | Customize / Change location hidden; app shell chrome suppressed |
| Esc | Exits fullscreen |
| Connectivity | Offline/cached banner; reconnect triggers refresh |
| Layout rotation | Architecture via `dashboardV3Kiosk.layoutPresets` / `applyPreset`; prefers `dashboardV3Layouts` when present; auto-rotate opt-in with `waypoint-dashboard-v3-kiosk-rotate=1` |

```js
WDS.dashboardV3Kiosk.applyPreset("dense-conditions");
WDS.dashboardV3Kiosk.setRotationEnabled(true); // opt-in
```

### Standalone `kiosk.html`

Wall/Pi display with auto-refresh, large type, clock, and an Outdoor Brief strip fed from OIP modules (and `dashboardV3Brief` when that module is present). Prefer Dashboard → Kiosk when you want the full customizable widget board on a display.

---

## Customization

Use **Customize Dashboard** to enable/reorder widgets and apply named layouts. Preferences stay on-device. DnD hooks are registered (`data-wdb-v3-dnd-ready`) for a later interaction pass.

---

## Mobile (320–1440)

- Single-column Brief + widgets below ~560px; progressive 2→3→4 column grids.
- Primary actions ≥44px touch targets.
- `overflow-x: clip` on the V3 shell; no intentional horizontal scroll.
- Sticky Brief disabled under 480px and when `prefers-reduced-motion: reduce`.

---

## Accessibility

- Skip link to Today’s Outdoor Brief.
- `aria-pressed` / clear labels on Kiosk toggle; region labelled by dashboard title.
- Connectivity banner uses `role="status"` + `aria-live="polite"`.
- `:focus-visible` rings on primary controls.
- Reduced-motion disables sticky Brief motion and kiosk auto-rotation.

---

## Reliability & performance

| Concern | Approach |
|---------|----------|
| Offline | Banner + cached trust; widgets keep rendering |
| Provider failure | Isolated card errors; Take trust notes |
| Timeouts | Existing mount deadlines in `dashboardReliability` |
| Reconnect | `online` listener → forced OIP refresh in kiosk |
| Re-renders | Payload fingerprint skip when hydratedAt/trust/selection/take unchanged; clock ticks via textContent only |
| Bundle | Kiosk controller is a small additive module in the existing `wds.js` graph |

---

## Tests

```bash
node automation/test-dashboard-v2.mjs
node automation/test-dashboard-v3.mjs
node automation/test-dashboard-reliability.mjs
node automation/test-kiosk-modules.mjs

# With a local server:
python3 -m http.server 8080
node automation/mobile-layout.mjs http://127.0.0.1:8080
node automation/a11y-smoke.mjs http://127.0.0.1:8080
node automation/validate-production-links.mjs
```

QA notes: [`docs/RC25-SPRINT5-QA.md`](./RC25-SPRINT5-QA.md)

---

## Sprint history vs roadmap

| Sprint | Focus |
|--------|--------|
| RC2.5 S1 | V3 foundation — shell, Brief, contract, categories, layout hooks |
| RC2.5 S2–4 | Widget library, brief engine, focus widgets / intel (integrated carefully) |
| **RC2.5 S5** | Experience polish — kiosk display, mobile, a11y, reliability, docs |

### Future (RC3 candidates)

1. Full pointer DnD reorder with live preview.  
2. Enabled layout rotation by default on dedicated displays (with reduced-motion respect).  
3. Deeper Travel / Wildlife live providers.  
4. VoiceOver / NVDA pass on Brief + customize dialog.  
5. Optional mount of full V3 board inside standalone `kiosk.html` (shared engine host).  
6. Shared modal focus-trap primitive for customize.

---

## Best practices

- Prefer interpretation bullets in the Brief; keep widgets scannable.  
- Keep category labels stable; add widgets rather than renaming ids casually.  
- Use `availability` honestly (`live` / `derived` / `planned` / `experimental` / `unavailable`).  
- Do not couple widget modules.  
- Preserve OIP providers, caching, and `dashboardV2Model` contracts when changing UI.  
- Keep `data-wdb-v2-*` hooks where customize/recovery still listen.
