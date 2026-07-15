# Sheds Field Intelligence — Reliability Intervention Report

**Date:** 2026-07-15  
**Branch:** `main` @ pre-commit working tree  
**Scope:** Investigation + map-first mobile rebuild + critical reliability fixes + automated evidence  
**Commit status:** **Not committed. Not pushed.** Owner review required.

---

## 1. Executive summary

The owner screenshot reflected a real structural failure: **desktop-era chrome (large plan card + many equal-weight toolbar buttons) permanently consumed the mobile viewport**, leaving only a map strip. Skip-to-map used `.wds-skip` without WDS CSS, so it stayed visible. Secondary panels/features largely worked in code, but the field experience was not usable one-handed.

This intervention rebuilds the **map-first mobile shell**, moves secondary tools into a **More** sheet, makes the suggestion **expandable**, hardens sheet/geo UX, and expands automated tests with **CDP mobile screenshots**.

Sheds is now **substantially more usable on phone viewports** (map ~63% of height; no suggest/toolbar overlap in measured layout). Full adversarial coverage of every Phase 3–12 scenario is **not complete** in this pass; remaining gaps are listed honestly below.

---

## 2. Root causes

| Area | Symptom | Root cause | Severity |
|------|---------|------------|----------|
| Mobile layout | Map reduced to strip; controls dominate | Plan card + five status pills lived in header; eight toolbar actions + legend wrapped over the map | Critical |
| Overlap | Suggestion card covered Locate/Track | Absolute-positioned suggest dock used fixed `--sheds-toolbar-h` smaller than real wrapped toolbar | Critical |
| Skip link | Always visible | `.wds-skip` without shared WDS CSS | High |
| Control hierarchy | Unclear field workflow | All actions same visual weight | High |
| Escape/sheets | Validate stuck open | `closeAllSheets` omitted validate sheet | Medium |
| Privacy copy | “Private” overstated | Tile/Open-Meteo requests still leak approximate location; copy now documents this | Medium |
| Leaflet sizing | Partial tiles after chrome changes | Missing/`late` `invalidateSize` after layout | Medium |
| Geo honesty | “Finding…” before ask | Boot state mixed with pending locate; labels shortened and idle state clearer | Low–Med |
| Land cover claims | Weights UI imply available inputs | Land cover already marked unavailable; still listed under weights as influence prefs | Known model limit |

---

## 3. Repairs completed

### Layout
- Compact header (brand + Status + two pills)
- Map canvas flex-grows; suggest + toolbar **in-flow** (no overlay collision)
- Primary: Locate · Track · Add note · More
- Secondary in tools sheet: Map & model · Explain · History · Validate · Ethics · Export · Recenter

### Map / geo
- Drag sets `followUser=false`; **Recenter on me** when needed
- Map click debounce; sheets invalidate map size
- Location pill states shortened and honest (denied / overview / located)

### Suggestion
- Collapsed glance: direction · distance · band · area
- Expanded: body, why (details), coverage actions, session note

### Records / honesty
- Ethics expanded (property, wildlife, habitat, privacy, **map providers**, model honesty)
- Export payload includes `privacyNote`
- Escape closes **all** sheets including validate + tools
- Model note v1.1

### Accessibility
- `.sheds-skip` visually hidden until focus
- `aria-expanded` on Status, plan toggle, More
- Focus restore after sheet close

---

## 4. Model integrity (unchanged scorer; honesty UI)

| Input | Source | Status |
|-------|--------|--------|
| Season timing | Date + latitude rules | Active |
| Slope / aspect / microform | Elevation grid → Open-Meteo DEM | Active when fetch succeeds |
| Snow / cold soft | Open-Meteo forecast | Soft / optional |
| Observations / coverage / searches | localStorage | Active |
| Land cover / vegetation layers | — | **Unavailable** (labeled) |
| Certainty language | Contracts in bio model | Guarded |

Existing unit tests still prove heat changes with weights, missing inputs lower confidence, coverage/search effects, etc.

---

## 5. Test results

```text
node automation/test-sheds-map.mjs                 → 34 PASS
node automation/test-sheds-planner.mjs             → 37 PASS
node automation/test-sheds-biological-model.mjs    → 33 PASS
node automation/test-sheds-integration-v1.1.mjs    → 30 PASS
node automation/test-sheds-map-cdp.mjs             → PASS
SHEDS_CDP=1 node automation/test-sheds-field-ux.mjs → 19 PASS
```

Mobile metrics (390×844 after ethics ack):

- `mapShare`: **0.631**
- `suggestToolbarOverlapPx`: **0**
- `topHeight`: 96px

---

## 6. Visual evidence

`reports/sheds-field-ux-2026-07/`

- `01-fresh-load.png`
- `02-tools-sheet.png`
- `03-suggest-expanded.png`
- `04-ethics.png`
- `05-desktop.png`
- `mobile-390x844-metrics.json`

---

## 7. Files changed

| File | Purpose |
|------|---------|
| `apps/shed-hunting/map/index.html` | Map-first markup, tools sheet, ethics honesty |
| `apps/shed-hunting/css/sheds-map.css` | Flex field chrome; skip link; safe areas |
| `apps/shed-hunting/js/sheds-map-app.js` | Sheet stack, follow/recenter, plan UI, invalidateSize |
| `automation/test-sheds-map.mjs` | New structural asserts |
| `automation/test-sheds-planner.mjs` | UX CSS/HTML asserts |
| `automation/test-sheds-field-ux.mjs` | New UX + CDP evidence harness |
| `docs/SHEDS-FIELD-RELIABILITY-2026-07.md` | This report |

---

## 8. Remaining limitations

- **No Playwright suite** covering full obs/edit/delete/track/export/offline matrix on device yet (stores covered in Node; CDP is smoke + layout).
- **History** still a text dump — usable, not polished.
- **Auto ethics** on first visit still covers the map until acknowledged (intentional).
- **Headless Chrome** denies geolocation — Locate path not fully exercised in CDP (status shows denied truthfully).
- **Shared platform location/WOS/ethics modules** still not wired into the map (local reimplementation remains).
- **Species / finds / forecast** routes remain foundation `ready: false`.
- **Screen-lock / background geolocation** browser limits unchanged — document-level only.
- **Production URL / deploy verify** not run in this session (local automation only).
- Visual tile fill can still look sparse at continental zoom until user zooms to a property.

---

## 9. Deployment verification

**Not performed.** Owner should verify `/apps/shed-hunting/map/` on staging/production after publish; build marker remains `local` in map HTML until release pipeline stamps it.

---

## 10. Commit recommendation

```text
Rebuild Sheds field map as a map-first mobile experience with honest privacy and tools sheet.

Collapse secondary actions into More, stack suggestion above the action bar without overlay, and add CDP layout evidence so phone field use is usable again.
```

Do not commit until the owner reviews screenshots and remaining limitations.
