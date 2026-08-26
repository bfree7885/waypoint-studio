# Dashboard Discover Correctness — Final Report

**Date:** 2026-08-26  
**Product test:** If I had not already known about the eclipse, would Waypoint have told me? **YES.** Can I trust it not to say late spring in Pennsylvania in late August? **YES.**

## 1. Starting commit

`4b344a74` — `origin/main` (merge of PR #54, production Dashboard at start of this pass)

## 2. Branch

`cursor/dashboard-discover-correctness-2eb7`  
Based on production `main` only. Does **not** include Sheds V3.2 (`chore/product-direction-reconciliation`) or portfolio-hyperfocus.

## 3. Root cause of “late spring”

Stale editorial content-bundle season/phenology was copied onto the OIP platform with **no date, hemisphere, or freshness guard**, then printed by Today `seasonLine()`.

Westfall Township is inside the Pike County local-bundle footprint. The bundle still said `"season": "late spring"` and a May phenology stage (ephemerals / mountain laurel / morels). Discover treated that as current.

This was **not** a month-mapping bug, latitude inversion, LLM copy, or a need to rewrite “late spring” → “late summer” in JSON.

See `reports/dashboard-discover-correctness/AUDIT.md`.

## 4. Exact stale logic removed/fixed

- `wds-oip-sources.js` no longer writes `bundle.season` / `loc.seasonNote` into `calendar.season`. Those values become `editorialSeason` plus `weekOf` / `editorialValidUntil`.
- `wds-regional-intelligence-engine.js` same: `enrichFromBundle`, `buildFromLocation`, `applyDefaults`.
- `wds-oip-model.js` `applyFallback` no longer promotes index `seasonNote` to live calendar season.
- Clock-only editorial sunrise/sunset (`05:42` / `20:18`) are not copied as live daylight.
- `wds-daylight-utils.js` will not use those clock strings as Open-Meteo fallbacks.
- Pike bundle now carries `weekOf: "2026-05-30"` and `editorialValidUntil: "2026-06-15T00:00:00.000Z"` so the May snapshot **expires** instead of being silently rewritten.
- Today `seasonLine()` runs `WDS.dashboardSeason.displayLine()` so impossible copy cannot render even if a stale package slips through.

The May morel/laurel strings remain in the dated editorial file. They must not appear on an August Dashboard. Guardrails omit them.

## 5. Seasonal guardrail implementation

`design-system/js/dashboard/wds-dashboard-season.js`

- Meteorological season from month + hemisphere (lat)
- Early / mid / late from day-of-month
- Northern vs Southern Hemisphere are opposite
- `guardPackage()` on OIP and RI `normalizePackage`
- Impossible editorial season names are not displayed; calendar is computed

August 25, Pennsylvania → **late summer**. August 25, Chile → **late winter**.

## 6. Phenology handling

Phenology is separate from calendar season.

- Requires `weekOf` or `editorialValidUntil` freshness (max 21 days from `weekOf` if no explicit end)
- Undated phenology is omitted
- Northern-spring biological language (morels, ephemerals, mountain laurel opening, trillium, …) is forbidden outside NH spring
- When omitted: `phenology.status = "omitted"` with `omittedReason` (`stale` / `impossible-for-date` / `season-mismatch`)
- No generic filler replacement

## 7. Natural-event architecture

Bounded catalog + evaluator + compact Discover card:

- `design-system/js/dashboard/natural-events/events.json`
- `design-system/js/dashboard/natural-events/wds-natural-events.js`
- `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-events.js`

Not a celestial calendar, notification system, or event platform.

## 8. Event data source

Curated structured dataset. Eclipse contacts from **NASA GSFC / Fred Espenak EclipseWise** (UT1), corroborated with TimeandDate tables. Sources are stored on the event record. Times are not LLM-invented. Missing/failed catalog → omit events.

## 9. Eclipse implementation

Event id `lunar-eclipse-2026-08-28` (reusable schema: type, windows, magnitude, visibility boxes, sources, horizonHours).

Acceptance display for Pennsylvania (America/New_York, EDT):

- Coming soon on Aug 25: **COMING SOON · THU NIGHT**
- Maximum around **Fri, Aug 28, 12:12 AM** local
- Partial **Thu 10:33 PM – Fri 1:52 AM**
- Umbral magnitude ~0.932

## 10. Location relevance

Visibility uses region boxes (Americas, Europe, Africa) matching the eclipse visibility footprint. Pennsylvania is in. Tokyo / east Asia are out — no local viewing recommendation. Unknown coordinates → not claimed visible.

## 11. Timezone handling

Catalog stores UTC/UT1. Display uses the Dashboard place timezone via `Intl`. UTC is not the primary viewing time. Midnight-crossing (Thu night → Fri morning) is formatted with local weekday + date on each contact.

## 12. Event lifecycle

| State | Rule |
|---|---|
| hidden | Before horizon (default 72h for major) |
| upcoming | Inside horizon, not yet local event day |
| tonight | Local calendar date of start/greatest, or ≤18h until start |
| happening | Now within penumbral window |
| ended | After `windows.end` — not promoted |

## 13. Discover priority changes

Weather Happening Now and natural events are independent. Both can render. An approaching eclipse is not labeled “Right now.” Event card sits above HN with a temporal kicker.

## 14. Quiet-day changes

Quiet means: live weather is hydrated **and** HN is empty **and** no active/upcoming Discover events.

Copy: “No significant weather, sky, or natural events are active or approaching in the near term.”

A quiet **weather** state is no longer treated as a quiet **Discover** state.

## 15. Outside Today changes

Still “What the day looks like.” Lines synthesize sky, notable feels-like, light wind, humid air, cloudy skies, alerts, golden hour/sunset, distinctive moon. Calendar line is computed. Stale phenology omitted.

## 16. Weather duplication changes

Removed temperature dumps (`72°F under …`), next-hour temp, humidity percentages, cloud percentages, and routine “Air quality is Good.” Conditions still shows raw 78°, wind, humidity. Discover interprets.

## 17. Moon audit

- Phase/illumination from Open-Meteo `daily.moonPhase` when live, else `moonPhaseFromDate`
- Graphic clipping is illumination-accurate; `data-phase-key` added for tests
- Lunar eclipses occur at full moon; graphic key `full` matches `phaseValue` 0.5
- Existing waxing/waning visual tests still pass

## 18. Solar/daylight audit

- Sunrise/sunset from live Open-Meteo, formatted in the location IANA zone
- Evening golden hour = sunset − 60 minutes (`wds-daylight-utils.js`) — internally consistent with a 7:43 PM sunset / 6:43 PM golden-hour start
- Editorial May `05:42`/`20:18` cannot override or backfill live clocks

## 19. Provenance

- Today: “Based on Open-Meteo”
- Calendar: computed (not labeled editorial)
- Phenology: labeled editorial only when shown
- Events: “Based on what?” panel lists EclipseWise/NASA, local timezone, magnitude, weather-context uncertainty

## 20. Deepener behavior

`resolveUnderstand` may pass event topics (`lunar-eclipse`). No matching Publishing story exists. **Event shows without a deepener.** Correct. No filler content generated.

## 21. Mobile changes

Event card is compact (kicker, title, short lede, ≤3 facts, Why). CSS tightens padding at ≤48rem (covers 375 / 390 / 430). It does not consume the entire first screen; Conditions remains visible in the 390px fixture.

## 22. Desktop changes

Discover (Outside Today + event) is the intelligence layer. Workspace/Conditions remain instruments. Obvious number duplication on Today was reduced. No full Dashboard redesign.

## 23. Tests and exact results

| Suite | Result |
|---|---|
| `automation/test-dashboard-discover-correctness.mjs` | **PASS** (acceptance A–F, season, events, quiet, moon, solar, provenance, no invented fallback) |
| `automation/test-dashboard-discover.mjs` | **PASS** |
| `automation/test-dashboard-rebuild-phase2.mjs` | **PASS** (100) |
| `automation/test-dashboard-rebuild-phase3.mjs` | **PASS** (96) |
| `automation/test-dashboard-rebuild-intel.mjs` | **PASS** |
| `automation/test-dashboard-rebuild-happening.mjs` | **PASS** |
| `automation/test-dashboard-rebuild-depth.mjs` | **PASS** |
| `automation/test-scenes-publishing.mjs` | **PASS** |
| `automation/test-dashboard-semi-realistic-art.mjs` | **PASS** |
| `automation/test-homepage-front-door.mjs` | **PASS** |
| `automation/test-studio-nav-architecture.mjs` | **PASS** |
| `automation/validate-production-assets.mjs` | **OK** (0 missing; wds.js modules 172) |

CI now runs Discover + Discover correctness.

Hydrated production Westfall verification requires Pages deploy after merge (this agent cannot merge).

## 24. Screenshots

Headless render of the real `renderShell` output for Westfall Township, PA, 2026-08-25 16:00 EDT, live Open-Meteo-shaped platform:

<img alt="Westfall Township Dashboard Discover on August 25 2026 showing late summer calendar and coming-soon lunar eclipse" src="/opt/cursor/artifacts/discover_aug25_westfall_390.png" />

Observed in that fixture:

- **Calendar: late summer** (not late spring)
- No morel / mountain laurel / ephemeral copy
- **COMING SOON · THU NIGHT** deep partial lunar eclipse
- Maximum Fri Aug 28, 12:12 AM local; partial Thu 10:33 PM – Fri 1:52 AM
- Discover sky/light takeaways; Conditions still holds 78° / wind / humidity
- Quiet strip absent

## 25. Known limitations

- Event catalog is curated, not an ephemeris generator
- First paint may omit events until `events.json` fetch completes, then repaints
- Lunar-eclipse visibility uses region boxes, not a per-site Moon-altitude computation
- Golden hour remains the sunset−60min heuristic (labeled estimated when derived)
- Production Westfall hydration is not verified on live Pages in this pass

## 26. Deferred event categories

Solar eclipses, meteor-shower peaks, conjunctions, occultations — schema allows them; only the Aug 2026 lunar eclipse is populated. No wildlife, trail, or phenology live feeds.

## 27. Remaining correctness risks

- Other products (ForageCast / Fieldry / legacy happening-now) may still read bundle phenology if they do not go through `dashboardSeason.guardPackage`
- `regions-index.json` `seasonNote: "late spring"` remains as historical editorial metadata; Discover no longer promotes it as calendar season
- If `events.json` 404s on Pages, the eclipse will be omitted (honest) until the asset is reachable
- Quiet-day still requires live weather hydration (unchanged honesty gate)
