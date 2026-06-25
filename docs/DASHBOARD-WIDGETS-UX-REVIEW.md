# Dashboard Widgets — Persona UX Review

Review date: May 2026  
Scope: Milestone 4 customizable outdoor dashboard (`WDS.dashboardEngine`, widget registry, local settings).

---

## Hiker

**Would enable**
- Current Weather, Forecast, Sun
- Trail Conditions, Seasonal Watch
- Photography Conditions (optional — light for ridge shots)
- Fieldry Summary (if logging hikes)

**Immediately useful before leaving home**
- Weather + sun answer “what to wear and when to start.”
- Trail Conditions placeholder sets expectations about mud vs. dry ridges.
- Seasonal Watch frames what’s changing on the trail this week.

**Still missing**
- Live trail reports and elevation-specific mud/freeze data.
- Pack-weight or gear cues tied to forecast.

**Build next**
- Trail conditions provider (user reports + agency alerts).
- Link Trail Conditions widget to weekend investigation prompts.

---

## Birder

**Would enable**
- Seasonal Watch, Wildlife Activity
- Sun, Moon (migration / dawn chorus timing)
- Photography Conditions, Regional News
- Flora (optional — habitat context)

**Immediately useful**
- Seasonal Watch groups active / ending / coming-soon species windows.
- Wildlife Activity surfaces editorial migration and activity notes.
- Sun widget supports early-morning planning.

**Still missing**
- eBird or migration radar hooks (architecture ready via `futureProvider`).
- Species-level deep links into WSKB from widget rows.

**Build next**
- Bird migration provider slice on OIP.
- “Enable birder preset” in dashboard settings (one-click widget bundle).

---

## Wildlife photographer

**Would enable**
- Photography Conditions, Sun, Moon
- Current Weather, Forecast
- Wildlife Activity, Seasonal Watch
- Astronomy (night wildlife / milky way prep)

**Immediately useful**
- Photography Conditions translates cloud cover and golden hour into field guidance.
- Weather widgets give live light and comfort context.
- Collapse/expand keeps the grid calm while scanning light cues.

**Still missing**
- EXIF-adjacent “best window today” summary.
- Ethics reminders on sensitive species (link to WSKB).

**Build next**
- Tie photography widget to live Open-Meteo cloud layers.
- Optional “shoot plan” detail view per widget.

---

## Mushroom hunter (forager)

**Would enable**
- Foraging Conditions, Seasonal Watch
- Flora, Water Conditions
- Forecast, Trail Conditions
- Conservation (habitat stewardship)

**Immediately useful**
- Foraging Conditions lists fruiting outlook with educational framing.
- Rainfall / watershed context in Water Conditions supports moisture reasoning.
- Links to ForageCast keep the dashboard an invitation, not the lesson.

**Still missing**
- Substrate and elevation-specific moisture models.
- County-level fruiting confidence from Fieldry aggregates (privacy-safe).

**Build next**
- ForageCast preview slice on OIP consumed by widget (not bundle-only).
- Pollen / soil temp future widgets without registry changes.

---

## Kayaker

**Would enable**
- Water Conditions, Forecast, Current Weather
- Road Closures, Regional News
- Sun, Conservation

**Immediately useful**
- Water Conditions shows rainfall summary and watershed names when available.
- Weather stack answers wind and storm risk at a glance.

**Still missing**
- USGS gauge levels and “paddle / wait” thresholds.
- Put-in access and shuttle road closure feeds.

**Build next**
- `usgs-gauges` provider on OIP → Water Conditions widget goes live.
- Marine / tides widgets using same registry pattern.

---

## Casual weekend explorer

**Would enable (default layout)**
- Current Weather, Forecast, Sun
- Seasonal Watch, Photography Conditions
- Trail Conditions, Fieldry Summary

**Immediately useful**
- Default widgets answer: *What’s happening? Should I go? Where to look first?*
- Customize dashboard lowers noise — no account required.
- Happening Now aside unchanged for “right now” regional pulse.

**Still missing**
- Drag-and-drop reorder (order persists via settings; UI not built).
- One-line “go / wait” synthesis card (could be a future widget).

**Build next**
- Dashboard presets by activity (hiker, birder, paddler).
- Widget refresh affordance in card header.

---

## Architecture assessment

| Layer | Role |
|-------|------|
| `WDS.dashboardWidgets` | Registry — title, icon, `getData`, `futureProvider` |
| `WDS.dashboardWidgetData` | OIP readers — widgets never call APIs |
| `WDS.dashboardSettings` | Visibility, order, collapse — `localStorage` |
| `WDS.dashboardEngine` | Grid render, mount weather/happening-now, settings panel |

**Known limitations**
- Road closures, live gauges, and moon API are placeholder/editorial until providers land.
- Reorder is persisted in settings but no drag UI yet.
- Fieldry Summary reads device `localStorage` directly (documented exception).
- Grid uses CSS columns, not resizable panels (desktop “multi-column” via span classes).

**Recommended next milestone**
1. OIP provider implementations: USGS gauges, DOT closures, moon phase API.
2. Dashboard presets + optional drag reorder.
3. Widget-level refresh button wired to provider refetch.
4. WSKB deep links from species rows in Seasonal Watch / Flora widgets.
