# Dashboard OS M1 Screenshot Index

**Captured:** 2026-07-22 (Milestone 1 closeout)  
**Method:** Chrome headless CDP (`automation/capture-dashboard-os-m1-screenshots.mjs`) against local `apps/dashboard/` with Pike County seeded in `wds-location-v3`. Waited for `data-wdb-os-mode=briefing` with Happening + Do (not “Finding today’s…” / “Updating…”).

| File | What it shows |
|------|----------------|
| `01-desktop-hydrated.png` | Desktop hydrated Outside briefing (Blooming Grove Township / Pike); quiet chrome; no Apps |
| `02-mobile-hydrated.png` | Mobile 390×844 hydrated briefing |
| `03-desktop-loading.png` | Desktop §5.1 loading (“Finding today’s conditions…” + skeletons) |
| `04-mobile-loading.png` | Mobile loading state |
| `05-active-alert.png` | Alert interrupt band + safety-shaped Matters/Do (**console-injected** synthetic alert; visual only — no audio) |
| `06-partial-data.png` | Partial trust + narrowed Matters/Do (**console-injected** after real place hydrate) |
| `07-location-detail-panel.png` | Screen Spec §3.10 Location panel |
| `08-conditions-detail-panel.png` | Conditions environmental detail panel |
| `09-sources-panel.png` | Sources / trust panel |
| `10-after-scroll-dayarc-look-closer.png` | After-scroll region: notice / Look closer gateways (Day arc peek also in composition above) |

## Injection methods

- **Alert (05):** `WDS.dashboardOSRender.renderScreen` with synthetic `alert` + safety Matters/Do. No `Audio` / tones (IQ-4).
- **Partial (06):** Same path with `trust.status=Partial`, honesty-oriented matters, reduced gateways.
- **Loading (03/04):** Prefer real boot skeleton with seeded place; if hydrate races ahead, forced `mode:loading` via render API (called out if used).

## Live audit snapshot (desktop hydrated)

See `audit-desktop.json` from capture run: `cards=0`, `tabs=0`, `gauges=0`, `apps=false`, `quietChrome=true`, `volunteer=false`, composition word count typically ≤90.
