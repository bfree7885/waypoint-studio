# Outdoor Intelligence Dashboard — V3 Foundation

**Source of truth for the Dashboard presentation layer (RC2.5 Sprint 1).**

Product question: *“I’m heading outside today. What should I know?”*  
Goal: interpretation over information, readable in under 30 seconds.

Related: [`docs/DASHBOARD-V2.md`](./DASHBOARD-V2.md), [`docs/DASHBOARD-V2-IMPLEMENTATION.md`](./DASHBOARD-V2-IMPLEMENTATION.md), `docs/dashboard-v2/*` — V2 owns the Sprint 3 catalog/prefs/take/engine; V3 is an optional presentation shell over the same model.

---

## Shell structure

```
Header
Today’s Outdoor Brief   ← hero (bullet intelligence summary)
Widget Area             ← modular grid via layout engine
Customize Dashboard
Footer                  ← trust / performance note
```

Entry: `apps/dashboard/index.html` → `home-boot.js` → content/dashboard engines → recovery mounts V2/V3 board.

Feature flags:

| Key | Default | Effect |
|-----|---------|--------|
| `waypoint-dashboard-v3` | **off** | Opt-in V3 shell (Brief-first). Set `"1"` to enable; unset/`"0"` keeps the Sprint 3 V2 board. |
| `waypoint-dashboard-v2` | on | Entire customizable board. Set `"0"` for V1 summary shell. |

---

## Folder map

```
apps/dashboard/
  index.html              # Shell host (skeleton first)
  js/home-boot.js         # Boot / OIP hydrate

design-system/js/dashboard/
  v3/                     # ★ V3 presentation foundation
    wds-dashboard-v3-categories.js
    wds-dashboard-v3-catalog.js   # runtime bridge/remap + stubs
    wds-dashboard-v3-contract.js
    wds-dashboard-v3-layout.js
    wds-dashboard-v3-brief.js
    wds-dashboard-v3-shell.js
    wds-dashboard-v3.js
  v2/                     # Model, prefs, take, widget bodies, customize
    wds-dashboard-v2-*.js
  wds-dashboard-engine.js
  wds-dashboard-recovery.js
  …

design-system/css/
  wds-dashboard-v3.css    # Mobile-first V3 shell
  wds-dashboard-v2.css    # Shared widget / customize styles
```

API surface (global `WDS`):

| API | Role |
|-----|------|
| `dashboardV3` | Orchestrator — render / bind / flags |
| `dashboardV3Shell` | Header · Brief · widgets · customize · footer |
| `dashboardV3Brief` | Today’s Outdoor Brief builder + reusable summary list |
| `dashboardV3Contract` | Widget card contract (safe render) |
| `dashboardV3Layout` | Order, sizes, densify, DnD hooks |
| `dashboardV3Categories` | Category registry |
| `dashboardV2*` | Preserved model, prefs, take, widget HTML bodies |

---

## Categories

Architecture supports all ten (not every category is fully populated):

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

Register extras:

```js
WDS.dashboardV3Categories.register({
  id: "custom",
  label: "Custom",
  order: 110,
  icon: "dot",
  description: "Optional extension category"
});
```

Widget catalog lives in `WDS.dashboardV2Widgets` (category ids must match the registry).

Legacy ids `alerts` → `emergency`, `seasonal` → `wildlife` via `normalizeId`.

---

## Widget contract

Every widget card supports:

| Field | Purpose |
|-------|---------|
| `title` / `icon` | Identity |
| `primaryValue` | Glanceable number/phrase |
| `secondaryDetails` | Short supporting lines |
| `lastUpdated` | Freshness |
| `loading` / `error` | Isolated states |
| refresh / expand | Per-widget actions |
| Waypoint’s Take section | Optional 1–3 local bullets |

```js
WDS.dashboardV3Contract.renderCardSafe({
  id: "wx-current",
  category: "weather",
  title: "Current Conditions",
  primaryValue: "58°F",
  secondaryDetails: ["Partly cloudy", "Wind 6 mph"],
  availability: "live",
  lastUpdated: new Date().toISOString(),
  expandTab: "weather"
});
```

**Rule:** widgets must not depend on other widgets. Failures are caught by `renderCardSafe` so one module cannot blank the board.

---

## How to add a widget

1. **Register** in `design-system/js/dashboard/v2/wds-dashboard-v2-widgets.js`:

```js
{
  id: "wildlife-dawn",
  category: "wildlife",
  name: "Dawn Chorus",
  description: "Morning wildlife listening window.",
  availability: "planned", // or live | derived | experimental
  defaultEnabled: false,
  defaultOrder: 80,
  tab: "today",
  size: "md" // sm | md | lg | xl
}
```

2. **Render body** in `wds-dashboard-v2-widget-render.js` (`renderBody` switch).  
   Planned widgets can rely on the default planned empty state.

3. **Honesty:** never invent live provider numbers for `planned` widgets.

4. **Optional:** add a default to `DEFAULT_ENABLED` only if it belongs in the curated starter set.

5. Run tests: `node automation/test-dashboard-v3.mjs`

---

## Layout registration

```js
const layout = WDS.dashboardV3Layout.load(selectedIds);
layout.sizes["wx-current"] = "lg";
layout.order = ["wx-current", "photo-conditions", ...];
WDS.dashboardV3Layout.save(layout);

// Future DnD
WDS.dashboardV3Layout.registerDnDHooks(root, {
  onReady(el) { /* Sprint 2+: bind pointers to [data-layout-item] */ }
});
```

Storage key: `waypoint-dashboard-v3-layout-v1`  
Widget enable/order prefs remain: `waypoint-dashboard-v2-widgets-v1`

---

## Today’s Outdoor Brief

Built from `WDS.dashboardV2Take.generateWaypointsTake` (deterministic rules — no paid AI).

```js
const brief = WDS.dashboardV3Brief.build({ model });
const html = WDS.dashboardV3Brief.render(brief);

// Reuse elsewhere
WDS.dashboardV3Brief.renderSummaryList(["Pack a shell", "UV is elevated"], {
  title: "Quick cues",
  id: "trip-cues"
});
```

---

## Performance principles

1. **Shell immediate** — HTML skeleton paints before providers finish.  
2. **Widgets independent** — each card renders from shared model; failures isolated.  
3. **Cache first** — trust/cache layer (`dashboardV2Trust`) may show cached readings.  
4. **Slow providers never block the page** — OIP hydrates incrementally via existing engines.  
5. **Mobile-first** — Brief first, single-column scroll, no horizontal overflow, ≥44px touch targets on primary actions.

---

## Best practices

- Prefer interpretation bullets in the Brief; keep widgets scannable.  
- Keep category labels stable; add widgets rather than renaming ids casually.  
- Use `availability` honestly (`live` / `derived` / `planned` / `experimental` / `unavailable`).  
- Do not couple widget modules (no imports of sibling widget state).  
- Preserve OIP providers, caching, and `dashboardV2Model` contracts when changing UI.  
- When refactoring presentation, keep `data-wdb-v2-*` hooks where customize/recovery still listen.

---

## Tests

```bash
node automation/test-dashboard-v2.mjs
node automation/test-dashboard-v3.mjs
```

---

## Sprint 1 scope vs later

**Done (foundation):** shell, Brief hero, contract, categories, layout hooks, mobile CSS, docs, tests.  
**Sprint 2+:** full drag-and-drop saved layouts, richer per-widget Take, Travel/Wildlife live providers, deeper cleanup of legacy V1 tab chrome.
