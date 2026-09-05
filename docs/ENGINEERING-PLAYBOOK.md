# Waypoint Studio Engineering Playbook v1.0

Canonical session operating model for agents and humans. A concise Cursor rule
mirrors the hard gates in `.cursor/rules/engineering-playbook.mdc`.

Product philosophy (trust, privacy, education, AI honesty) lives in
`docs/PRODUCT_STANDARDS.md` and `.cursor/rules/product-standards.mdc`.

**Product / Dashboard architecture authority (2026 Rebuild):**
`docs/rebuild-2026/` (awaiting owner approval). Outdoor OS Manifesto,
Screen Spec, Reset, and Recovery/V2/V3 vision docs are **superseded** and
archived at `docs/archive/pre-rebuild-2026/` — historical only; do not
treat them as binding.

---

## Mission

Every engineering session should leave the codebase more reliable, easier to
maintain, faster, more accessible, better documented, and better tested.

## Core Principles

- Privacy first.
- Local-first whenever practical.
- Honest loading states.
- Never fabricate data.
- Progressive enhancement.
- Mobile-first responsive design.
- Accessibility by default.
- Shared design system.
- Simplicity over cleverness.
- Leave the codebase better than you found it.

## Workflow

1. Understand the objective.
2. Investigate the existing implementation.
3. Identify root causes.
4. Implement the smallest correct fix.
5. Improve architecture when justified.
6. Add/update tests.
7. Review UX.
8. Review accessibility.
9. Review performance.
10. Search for similar defects.
11. Update documentation.
12. Produce a final report.

## Engineering Roles

Operate through these perspectives in each work block:

- Senior Engineer
- UX Engineer
- Performance Engineer
- Accessibility Engineer
- QA Engineer
- Reliability Engineer
- Security Reviewer
- Documentation Reviewer

## Quality Gates

- Root cause identified.
- Regression prevented.
- Tests pass.
- No new console errors.
- Desktop and mobile verified.
- Accessibility reviewed.
- Performance reviewed.
- Documentation updated.

## Architecture Standards

Prefer modular code, progressive rendering, independent components, graceful
degradation, and reusable utilities. Avoid duplicate logic, blocking
initialization, monolithic files, and hidden coupling.

## UX Standards

Render immediately. Use honest loading states. Avoid layout shifts. Fail
gracefully. Never appear frozen.

## Accessibility Standards

Review keyboard navigation, focus, ARIA, reduced motion, contrast, touch
targets, and screen readers.

## Performance Standards

Review startup, duplicate requests, rerenders, layout shifts, bundle impact,
blocking JavaScript, and caching.

## QA Standards

Test desktop, mobile, refresh, navigation, slow network, offline, empty data,
partial data, provider failures, and rapid interaction.

## Reliability Standards

When one defect is found, inspect the rest of the codebase for the same
architectural pattern and add regression tests when appropriate.

## Documentation

Document objectives, root causes, files changed, tests added, remaining
limitations, and recommendations.

## Commit Rules

- Never commit automatically.
- Never push automatically.
- Always wait for owner review.

Leave unrelated dirty tree noise alone (`data/*`, generated status/debug pages,
importer desktop stubs, local audit PDF renders) unless the owner asks to
include them.

## Final Report

Include:

- Objective
- Root causes
- Improvements
- Tests
- Remaining risks
- Recommendations
- Session start/end if observable
- Runtime if measurable; otherwise explicitly state unavailable

---

## Lessons Learned

### 2026-09-05 — SignalTerrain V0.9 unlisted field-test host

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.9.md`

- Studio Pages is `main` → `waypointstudio.org` only. Do not dispatch `pages.yml` from a feature branch.
- New GitHub repo creation 403’d. Existing isolated Pages project is `waypoint-studio-site` (no CNAME).
- `SHEDHUNTING_DEPLOY_TOKEN` can write **only** to `sheds-site` (blob 201). It cannot create repos or push `waypoint-studio-site` (403). Do not publish SignalTerrain to Sheds.
- Intended URL: `https://bfree7885.github.io/waypoint-studio-site/apps/summit-signal/`. Unlisted, not authenticated. **Not live** until contents:write exists on that companion repo.

### 2026-09-05 — SignalTerrain V0.9 field-test host inspection (not deployed)

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.9.md`

- Studio production is GitHub Pages from `main` only (`pages.yml`). There is no branch/preview URL.
- One Pages project = one custom domain. A phone field-test cannot be isolated without a companion Pages repo (Sheds pattern) or a main merge.
- Dispatching `pages.yml` from a feature branch overwrites waypointstudio.org with the unmerged tree. Do not do that.
- GitHub Pages here is unlisted at best, never authenticated. Do not call it private.
- Stop when deploy requires merging to production main. Record the inspection; do not improvise a host.

### 2026-09-05 — SignalTerrain V0.8 field-test access + Maps handoff

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.8.md`

- Inspect and Start hike here are different actions. Marker click must not call the router.
- Close/hide of the summit sheet must not call `clearSelection()`. Phone map inspection needs the route, AZ, and plan to stay in memory.
- Surface existing OSM `access`/`fee` tags as “Mapped … tag: value”. Never translate `access=yes` into legal parking.
- Maps handoff is coordinates only. Do not geocode a feature name (it can resolve to the summit).
- Unnamed parking stays unnamed. Copy Plan includes start coordinates without access-legality claims.

### 2026-09-05 — SignalTerrain V0.7 Activation Plan + Field Readiness

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.7.md`

- Synthesize existing summit/access/route/AZ/GPS evidence into one Activation Plan model. Do not duplicate provider payloads in the DOM.
- Field Readiness is information completeness (`KNOWN` / `UNKNOWN` / `UNAVAILABLE` / `VERIFY` / `NOT INTEGRATED`), never a score or “valid activation.”
- Mapped OSM parking stays a candidate (`VERIFY`). Do not say parking is confirmed or legal.
- Personal checklist is localStorage, per summit, with an explicit reset. It is not SOTA required equipment.
- Provider failures must leave the rest of the plan standing.

### 2026-09-05 — SignalTerrain V0.6 Route to Activation Zone

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.6.md`

- Keep Route to Summit as an explicit mode. Do not silently prefix the V0.3 route and call it an AZ destination.
- AZ-entry candidates must come from the Valhalla geometry × calculated AZ, not a centroid, vertex, or straight-line nearest point.
- Cache Route-to-AZ separately from Route-to-Summit; the V0.3 route id does not include destination mode.
- Prefix elevation must re-smooth clipped 3DEP samples. Do not scale summit gain by distance.
- If AZ-route gain equals summit-route gain (short remaining spur vs sample spacing), report that honestly.

### 2026-09-05 — SignalTerrain V0.5 second W2/GC Activation Zone

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.5.md`

- Prove the existing AZ engine on a second real catalogue summit before adding workflow features. Do not special-case the new summit in the algorithm.
- Hunter Mountain’s 25 m contour is a southeast plateau/spine, not a Slide-like cone. A 500 m DEM window clips it; the same 10 m analysis grid with a larger labeled window lets the contour close.
- Neighbour-snap-before-elevation-conflict (`cb627c08`) stays in the engine even when the second summit seeds on the nearest cell.
- Keep at least one loaded W2 summit without an AZ fixture so unsupported-region stays testable.

### 2026-09-04 — SignalTerrain V0.4 Activation Zone

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.4.md`

- The SOTA AZ is a closed contour at Vertical Distance below the summit (GR v1.21, normally 25 m), never a radius.
- Threshold uses the SOTA catalogue elevation. DEM is geometry + a discrepancy check; do not silently rewrite the SOTA record.
- 4-connected flood fill from the summit cell; discard disconnected above-threshold blobs (neighbouring peaks).
- Thin ridges and single-cell peaks need a cell-edge outline, not interpolated marching squares. The polygon is still a closed contour of qualifying terrain, never a radius.
- Keep the V0.3 route geometry; only report whether it enters the polygon.
- Never say “activated” because GPS is inside the polygon.

### 2026-09-04 — SignalTerrain V0.3 hike routing + 3DEP

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.3.md`

- Do not auto-start a route from nearest parking. Start hike here is the user confirmation.
- FOSSGIS Valhalla is development-only. Default to a labeled real route fixture; `?route=live=1` is opt-in; production must self-host.
- Never substitute Haversine for a failed hike. Elevation failure must keep a valid route.
- A 3 m rise threshold on ~30 m 1 m-lidar samples undercounts real climbing. Use a moving average, then sum all smoothed deltas.
- Route polylines must be visually heavier/cyan than OSM path fragments.
- Label formatters (`formatDurationEstimate`) must not throw if an older cached `ss-geo.js` is in the browser. A valid Valhalla route must still display. Cache-bust V0.3 scripts (`?v=0.3`).

### 2026-09-04 — SignalTerrain V0.2 OSM access layer

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.2.md`

- Selected-summit Overpass/fixture queries beat region-wide OSM dumps. 5000 m around Catskills peaks captures CR-47 parking that 2500 m would miss.
- Empty successful OSM results are not the same as unavailable, and neither means “no trail exists.”
- Draw OSM ways as they are. Do not stitch hiking relations into a fake summit route.
- Straight-line to parking/trailhead must be labeled straight-line, never hike distance.
- Access failure must not block the SOTA map. CI must use a labeled real OSM fixture, not live Overpass.
- When inserting a helper such as `maybeFocusAccess`, keep `function loadAccessForSummit` as its own declaration. A missing function header is a parse error that takes down the whole map, including SOTA markers.
- Desktop summit-detail sheet sits on the right. Layer chips must stay on the left of the map (next to zoom), not `right: 12px`, or the sheet covers the toggles.

### 2026-09-04 — SignalTerrain V0.1 (SOTA rebrand of Summit Signal)

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.1.md`

- **SignalTerrain (SOTA/outdoor, unpublished) is a new product definition and is not the retired SignalTerrain Cyber product.** Keep the SOTA app at `/apps/summit-signal/`. Do not occupy `/apps/signalterrain/` or `/side-trails/signalterrain/`. Do not overwrite `docs/SIGNALTERRAIN-*.md`. Do not import `design-system/signalterrain/**` or `wds-signalterrain-*`.
- Use collision-safe internals (`SignalTerrainSota*`, `signalterrain-sota-*`, `data-product="signalterrain-sota"`). Do not take the retired cyber package’s identifiers.
- Public-portfolio tests still treat the string `SignalTerrain` as a discontinued *public* name. Do not weaken those lists so the unpublished SOTA app can appear on homepage/nav/About. The name belongs in the unpublished app and development docs only.
- SOTA API/data terms must be reviewed before public launch or commercialization. Do not assume commercial API use is permitted. Keep attribution and the independent-app disclaimer. Do not implement billing.
- CSS classes / DOM ids (`ss-*`) and the `/apps/summit-signal/` path were retained to avoid a destructive rename of a working map.

### 2026-09-04 — Summit Signal V0.1 foundation (superseded name)

**Branch:** `cursor/summit-signal-v0-1-9f7b` · **Doc:** `docs/signal-terrain/V0.1.md` (was `docs/summit-signal/V0.1.md`)

- New Waypoint field apps can live under `/apps/` without becoming public architecture peers. Use `noindex`, robots Disallow, and keep them out of primary nav, homepage, About/Support, and the sitemap.
- Do not couple a new map product to Shed Hunting modules. Vendor Leaflet independently; reuse public Esri tile URLs, not `sheds-tile-provider.js`.
- SOTA live APIs are useful, but CORS and reliability argue for a **labeled fixture of real retrieved records** plus a provider that can switch to live later. Never invent summit or hike facts to fill the map.
- Planning placeholders (trailhead, parking, route, gain, time, activation zone) establish product direction only when they are explicitly **not yet integrated**. Empty is honest; guessed AllTrails-like numbers are not.
- SOTA Activation Zone is a ~25 m vertical contour. Do not draw a pretty circle or guessed polygon without a DEM. Keep an empty overlay layer instead.
- CI smoke `hScroll` on ForageCast / SignalTerrain is usually the **homepage after a silent redirect**, not those apps. Do not patch retired-app CSS for it. Skip overflow when `currentPath` is no longer the URL under test; studio-home still owns `/` overflow.
- Dashboard intel `toolLinks` for golden hour / dark sky are empty because Scenes is unpublished. Happening Now already asserts that. Do not restore Scenes CTAs to make `test-dashboard-rebuild-intel.mjs` green.
- `test-profile-migration.mjs` can miss a CDP page target after a long CI Chrome sequence. Wait for `webSocketDebuggerUrl`, use an unused port, and retry more than once. Do not treat that flake as a Kansas-migration product regression.

### 2026-08-28 — Dusk-desert color reconciliation

**Branch:** `cursor/dusk-desert-color-system-3501` · **Doc:** `docs/SOUTHWEST-COLOR-SYSTEM.md`

- Purple-dominant aubergine grounds read as a boutique brand, not a field tool. Keep plum undertones in espresso surfaces; do not let purple own `--wp-bg` or borders.
- `--wp-brand` (terracotta) must drive the header square. `--wp-accent` is product pairing and will recolor the mark if the square binds to it.
- Cream on terracotta fails WCAG (~2.8:1). `--wp-on-accent` stays charcoal. Desert purple `#79506F` fails as small text on charcoal — supporting borders only.
- Explore should not become a filled orange (or purple) pill. Raised espresso + terracotta border keeps the signature without shouting.
- Publishing/DFD purple accents made editorial surfaces look like another software product. Terracotta + ochre on cream type keeps them in the family.
- Brand color and data color stay separate: Dashboard instrument hues (precip/AQI/alert) and map layers must not be forced into terracotta.

### 2026-08-22 — Civic Trails discontinued; OpenRoad PA catalog entry

**Branch:** `cursor/openroad-pa-replace-civic-efa3`

- Public presentation is the catalog + HTML surfaces — remove discontinued products from those without deleting historical docs, icons, or external repos.
- Early-stage Side Trails need an honest status (`in-development` → “In development”) and a lightweight placeholder page; do not imply a live dataset.
- Accountability products measure facts and change-over-time; never ship “fraud scores” or accusatory framing without evidence.

### 2026-08-17 — About page principles (monetization-safe)

**Branch:** `cursor/about-page-principles-efa3`

- About must not promise “no advertising forever”; refuse selling data, deception, sponsor control of conclusions, and intrusive formats instead.
- Remove personal “Built by a person” attribution from About; contact stays on Support/Contact.

### 2026-08-16 — Global Southwest palette cleanup

**Branch:** `cursor/southwest-palette-cleanup-efa3` · **Doc:** `docs/SOUTHWEST-COLOR-SYSTEM.md`

- Authoritative brand hex lives on `--waypoint-*`; `--wp-*` derives; apps must not invent parallel navy/neon tables.
- DFD sage accent made the library feel like a separate site — bind editorial surfaces to purple/orange inside the same family.
- Dashboard instrument **data** hues (precip/AQI/alert) stay; only chrome/framing remaps to aubergine + orange/gold.
- Prefer remapping local `:root` aliases (`--forest`, `--accent-sage`) to tokens over mass hex search-replace inside maps/photos.

### 2026-08-16 — DFD measurement mode scorecard

**Branch:** `cursor/dfd-measurement-mode-efa3`

- Prefer a fill-in scorecard + 5–10 min owner checklist over new analytics infrastructure.
- Document honest gaps: `DFD_*` queue may have no dashboard consumer; YouTube→Waypoint is not automatic without referrers/UTMs.
- Video #2 stays on a ~3–5 day window; near-zero early metrics must not delay the second data point or trigger a pivot.

### 2026-08-16 — Mount Hood YouTube Video #1 wire

**Branch:** `cursor/dfd-mount-hood-youtube-efa3` · ID `ue74ge9Bz7U`

- Setting `youtubeVideoId` + re-running `scripts/dfd/render-stories.mjs` is sufficient; do not hand-edit story HTML.
- Keep other stories at `youtubeVideoId: null` until their public IDs exist; renderer swaps pending copy for embed + VideoObject automatically.
- `DFD_VIDEO_PLAY` is pointerdown on `.dfd-video__frame` (once); `DFD_YOUTUBE_CLICK` is `data-dfd-track` on the iframe — preserve both without redesign.

### 2026-08-16 — DFD public launch (integrate → Pages → measure)

**Branch:** `cursor/dfd-public-launch-efa3` · **Docs:** `docs/deep-forest-dispatch/DFD-LAUNCH-REPORT.md`, `OWNER-LAUNCH-ACTIONS.md`

- Cumulative DFD content lived on Batch #3 tip; merge that tip into a launch branch off `main` rather than cherry-picking each PR.
- Production deploy is GitHub Pages on `push` to `main` (`.github/workflows/pages.yml`); verify live `waypointstudio.org` URLs after the Actions run — do not assume green commit = live.
- Final YouTube masters/thumbnails are not in-repo; packages document owner-local paths and keep `youtubeVideoId: null` until real public IDs exist.
- Search Console is not implied by analytics hooks — document owner verify + sitemap submit only.
- After launch: stop content production; measure at baseline / 2w / 30d / 60d / 90d without arbitrary failure thresholds.

### 2026-08-16 — DFD Article Production Batch #3 (First-10 complete)

**Branch:** `cursor/dfd-article-batch-3-efa3` · **Review:** `docs/deep-forest-dispatch/batch-3/OWNER-REVIEW.md` · **Portfolio:** `docs/deep-forest-dispatch/DFD-INITIAL-PORTFOLIO-REPORT.md`

1. **Force the evidence gate on change stories** — Columbia kept; title adjusted to “nearly 40 years” to match 1986–2024 Landsat, not a round marketing number.
2. **Empty Waypoint CTAs are valid** — remote terminal-basin / heritage-island stories need not invent instrument links; tests must allow zero connections.
3. **Partial vs complete** — Lake Eyre teaching moment: registered fill stages beat “the desert becomes a sea every year.”
4. **STOP after First-10** — portfolio diagnostic is not a backlog generator; next phase is publish → measure.

### 2026-08-16 — DFD Article Production Batch #2

**Branch:** `cursor/dfd-article-batch-2-efa3` · **Review:** `docs/deep-forest-dispatch/batch-2/OWNER-REVIEW.md`

1. **Evidence gate before prose** — for migration/change stories, lock location + multi-date registered imagery + published rates before drafting; do not fake motion with arrows on one frame.
2. **Landscape paradoxes need system maps** — Okavango lag is distance *and* slow fan propagation; a travel map beats “it takes months” as the sole explanation.
3. **Geology honesty beats clickbait** — Richat must reject impact without claiming a single finished “carving” cartoon; uncertainty belongs on-page.
4. **Hero ≠ first evidence frame** — if a compare uses Year A, do not also hero Year A; readers notice the replay.
5. **Do not invent process** — reuse the existing quality gate and render pipeline; production batches are content, not CMS work.

### 2026-08-16 — DFD Batch #1 editorial + visual QA

**Branch:** `cursor/dfd-article-batch-1-efa3` · **Review:** `docs/deep-forest-dispatch/batch-1/OWNER-REVIEW-V2.md`

1. **Diagrams must appear early** — burying the original visual after mechanism prose makes the page feel like a blog with an infographic taped on.
2. **Never duplicate the hero in the first body figure** — readers notice; it reads as padding.
3. **Shared section templates are AI-slop** — identical Explore further / Connect to Waypoint / Show me outlines across siblings fail the reader test even when science is fine.
4. **Six equal comic panels read as PowerPoint** — prefer one spatial explainer plus minimal stages.
5. **≤2 Waypoint CTAs, observational copy** — third links and “detector” disclaimers still feel promotional if stacked.
6. **Codify the floor** — `DFD-ARTICLE-QUALITY-GATE.md` is now a required workflow step, not optional taste.

### 2026-08-16 — DFD Article Production Batch #1

**Branch:** `cursor/dfd-article-batch-1-efa3` · **Review:** `docs/deep-forest-dispatch/batch-1/OWNER-REVIEW.md`

1. **Strategy branch ≠ library branch** — production must sit on the DFD library infra (render pipeline + CSS/JS) and carry strategy docs as reference; do not invent a third page template.
2. **Original value is a hard gate** — each article needs a Waypoint diagram that carries the causal chain (causeway→salinity→color; drainage sequence; standing wave), not stock filler between paragraphs.
3. **Catalog `published` shows cards immediately** — for “build but don’t deploy” batches, decide explicitly whether PR preview should list stories (`published`) or hide them (`draft`/`review`) before merge.
4. **CDP screenshots must attach to a page target** (`/json/list` type=page), not the browser-level websocket; unique `--user-data-dir` avoids Chrome SingletonLock failures.
5. **Tool links must be real products only** — Dashboard dew point/wind context and Scenes/Photo Coach are fine; inventing fog forecasts or lenticular detectors fails Product Standards.

### 2026-08-14 — Moving Scenes Attack 3 ship (transport + asset false positive)

**PR:** https://github.com/bfree7885/waypoint-studio/pull/37 · **prod SHA:** `2f02e6e6`

1. **GitHub HTTPS can reset mid-ship** — retry `git fetch`/`git push` with unrestricted network; prefer API+credential fill when `gh auth` is unset.
2. **Docs HTML template literals trip asset/link validators** — `src="fixtures/${file}"` is parsed as a real missing path; use string concat or static markup in owner galleries.
3. **Bugbot Autofix may land on the PR branch while CI is red** — fetch/merge remote feature tip before pushing local CI fixes; re-run Moving Scenes automation (now 58 PASS after assist/library fixes).

Append new engineering lessons after every work block so the playbook
continuously improves.

### 2026-08-07 — Side Trails discovery release

**Artifact:** `docs/releases/side-trails-discovery-owner-review.md`  
**Branch:** `release/side-trails-discovery`

1. **Quiet Home hid architecture nav** — config already listed Side Trails, but
   `data-quiet-chrome` suppressed the whole primary row. Keep Explore hidden; keep
   the seven-item architecture nav visible with calm quiet styles.
2. **Homepage deepeners ≠ studio-home.js** — Rebuild Home mounts
   `wds-dashboard-rebuild-deepeners.js`; teaser cards must land there (and CSS), not
   only in the older `js/studio-home.js` directory surface.
3. **Prefer smallest GS stack for discovery** — home-dashboard + direct-entry cover
   the primary board; skip unfinished live-data/entity/story and skip homepage GS
   teasers when the board is sample/demo only.
4. **Site-root absolute primary hrefs** — nested `/articles/` + apps-era
   `data-shell-depth` invented peer-relative dead links; directory-segment depth +
   `/side-trails/` absolute paths fix discovery from every shell page.
5. **Local static servers need the release cwd** — an orphan listener on the port
   can serve stale deepeners without Side Trails; restart from the worktree before
   screenshot/DOM gates.

### 2026-08-07 — Global Signals direct entry (dashboard first)

**Artifact:** `docs/global-signals/direct-entry-owner-review.md`  
**Branch:** `feature/global-signals-direct-entry`

1. **Integrate the home-dashboard tip before link surgery** — otherwise “direct
   entry” only moves traffic onto an empty marketing page. Base from `origin/main`,
   merge `feature/global-signals-home-dashboard`, then audit entry points.
2. **Homepage Side Trails is nav-config driven** — catalog URL alone is not enough;
   add `global-signals` to `homeSideTrails` + `productLanding`/`startHere` so Home
   lists open the dashboard without a detour.
3. **Park mission copy on `/about/`** — keep `/side-trails/global-signals/` as the
   board; footer “About” is secondary. Do not restore hero marketing on the primary route.
4. **Superseded shells get redirects, not “coming soon”** —
   `global-dashboard/` → `../` once a real dashboard exists; leave unfinished modules
   as honest empty shells only when they are still planned work.
5. **Assert entry matrix in automation** — catalog URL, nav `homeSideTrails`, About
   studio link, primary `gsh-board`, and redirect meta/`location.replace` in one
   `test-global-signals-direct-entry.mjs` so regressions cannot reintroduce friction.

### 2026-08-07 — Global Signals home application dashboard

**Artifact:** `docs/global-signals/home-dashboard-owner-review.md`  
**Branch:** `feature/global-signals-home-dashboard`

1. **Dashboard ≠ landing.** Once modules exist, `/side-trails/global-signals/`
   must open into composed intelligence — not mission copy or a module catalog.
   Keep “coming soon” shells off the entry surface even if routes still exist.
2. **Integrate sibling feature tips before wiring links.** Conservative merges of
   Explorer, Graph, Explain, Countries, Industries, and Citizen Impact avoid
   dashboard deep-links into empty shells.
3. **Curated `home.json` + module JSON composition** beats inventing a live risk
   engine; featured picks must resolve to existing ids and keep sample/demo labels.
4. **Foundation smoke tests that require every roadmap href on the landing freeze
   product progress** — graduate assertions when the entry experience becomes a
   board (require live module links; assert placeholders are *absent*).
5. **Relationship search belongs on the home board** as a first-class entry
   (`?entity=`), not a buried module CTA.

### 2026-08-07 — Global Signals Industry Intelligence

**Artifact:** `docs/global-signals/industry-intelligence-owner-review.md`  
**Branch:** `feature/global-signals-industry-intelligence`

1. **Curated baseline ≠ live news.** Dense industry pages can feel like a real
   intelligence platform while still labeling `mode: curated-baseline` and never
   fabricating breaking events as Observed.
2. **Stable entity IDs enable parallel modules.** `gsi_*` / `gsc_*` / `gsci_*` /
   `gsa_*` soft-links let Country Intelligence, Citizen Impact, and Relationship
   Explorer land on other worktrees without colliding on this branch.
3. **Articles taxonomy aliases matter.** Map `Logistics → Shipping` so sample
   briefs interconnect without renaming existing Articles strings.
4. **Detail-page relative depth.** Cross-module links from
   `/industries/<slug>/` need `../../articles/` (not `../articles/`) — catch in
   interconnect tests.
5. **Seed script + JSON** keeps 11 full pages maintainable; regenerate via
   `scripts/build-industry-intelligence-seed.mjs` rather than hand-editing
   megabytes of duplicated HTML.

### 2026-08-07 — Global Signals Relationship Graph (primary)

**Artifact:** `docs/global-signals/relationship-graph-owner-review.md`  
**Branch:** `feature/global-signals-relationship-graph`

1. **Radial-from-focus + neighbor list beats force-directed for literacy** — stable equal-angle rings and progressive expand keep “why this edge” readable; physics layouts obscure evidence.
2. **Assemble edges only from curated source datasets** — Relationship Explorer, Citizen Impact cause chains, Industry `topDependencies` / `citizenImpacts`, and Country citizen pathways. Do not invent hops to fill the graph.
3. **Mobile must drop the canvas when cramped** — stacked expand panels preserve edge facets; hiding SVG under `40rem` is a readability choice, not a missing feature.
4. **Promote Graph without deleting Cascade Explorer** — keep `/relationships/` as the linear companion; elevate `/relationship-graph/` as the primary CTA and update “coming soon” suite assertions accordingly.
5. **Negative UI copy still trips library-name tests if the regex includes the denied phrase** — keep asserting `cytoscape|d3.force|…`, not `force-directed`, when the page honestly rejects that layout.

### 2026-08-07 — Global Signals Explain This

**Artifact:** `docs/global-signals/explain-this-owner-review.md`  
**Branch:** `feature/global-signals-explain-this`

1. **Signature explainer = curated match + graph walk, never an LLM** — prompts / keywords / aliases / labels are enough for V1 demos and keep trust boundaries testable.
2. **Prefer curated cascades; BFS only as fallback** — deterministic Taiwan / drought / tariff stories screenshot cleanly; BFS must still refuse to invent edges.
3. **Waypoint’s Take is sourced or absent** — pull `waypointsTake` from linked industry JSON only; honest empty beats paraphrased filler.
4. **Label seed extensions that exist only for demo prompts** — `gsn_travel` / `gsc_airlines` carry `provenance: explain-this-seed-extension` so owners can accept or relocate them.
5. **Soft-link parallel modules by stable IDs** — inline linked excerpts now; deep-link `gsc_*` / `gsi_*` / citizen section anchors so Countries / Industries / Citizen Impact can land later without rewiring Explain This.

### 2026-08-07 — Global Signals Relationship Explorer

**Artifact:** `docs/global-signals/relationship-explorer-owner-review.md`  
**Branch:** `feature/global-signals-relationship-explorer`

1. **Cascade UX ≠ graph UX** — ship an ordered downward path with edge facets first; leave force-directed / network canvas for Relationship Graph so owners can review literacy without layout noise.
2. **Reuse Articles confidence / horizon normalizers with `predicted: true` on every edge** — prevents Observed leaking into dependency hops even when seed JSON is wrong.
3. **Curated `cascades[].edgeIds` beats ad-hoc BFS for V1 demos** — deterministic Taiwan → … → Consumer Products stories are easier to test and screenshot than algorithmic walks.
4. **Selectable roots must cover every advertised entity type** — product copy that lists Country…Weather Event needs at least one selectable of each, or the picker feels incomplete.
5. **Negative UI copy can trip “must not mention X” tests** — assert against library names (`cytoscape`), not the phrase “force-directed” when the page honestly denies that pattern.

### 2026-08-07 — Global Signals Citizen Impact (eight-category sample/demo shell)

**Artifact:** `docs/global-signals/citizen-impact-owner-review.md`  
**Branch:** `feature/global-signals-citizen-impact`

1. **Align Citizen Impact to Articles confidence/horizon + Rel Explorer `gsn_*` ids**
   instead of inventing a parallel schema — soft-link Explorer routes only when
   they exist on main; otherwise document intended join keys.
2. **Treat statement-level impact claims as predicted surfaces** — coerce Observed
   away the same way Articles path hops do; reserve Observed for established facts.
3. **Graduate foundation smoke tests when a module leaves “Coming soon”** —
   `test-global-signals.mjs` must exclude Citizen Impact once the live shell ships,
   same lesson as Articles Sprint 1.
4. **Eight owner-requested categories beat shipping the full eleven-card design
   grid unfinished** — keep the broader design doc directional; V1 UI matches the
   brief.
5. **Reuse GS landing chrome (`gs-landing` + IBM Plex)** for module pages; keep
   outdoor Articles / WCS skins out of Side Trails.

### 2026-08-07 — Global Signals Country Intelligence

**Artifact:** `docs/global-signals/country-intelligence-owner-review.md`  
**Branch:** `feature/global-signals-country-intelligence`

1. **Clean slug pages + shared mount beat query-only detail for country sets** —
   thin `/countries/<slug>/index.html` shells keep shareable URLs while one JS
   module owns normalize/render; still accept `?id=` for Articles parity.
2. **Reuse Articles confidence/horizon normalizers with a `predicted` flag** —
   country risks and citizen-impact links must coerce Observed → Unknown the
   same way impact-path hops do.
3. **Cross-module hrefs must be depth-aware** — links from `/countries/<slug>/`
   need `../../articles/` and `../../citizen-impact/#…`; dataset-relative
   `../citizen-impact` is wrong on slug pages.
4. **Foundation smoke tests that assume every non-Articles module is
   “Coming soon” must be updated when Country Intelligence graduates** —
   otherwise CI freezes new modules in placeholder state.
5. **Soft-link stable ids even when sibling modules are still shells** —
   `gsa_*` article ids, citizen category anchors, and `relationship-graph`
   routes keep parallel worktrees integrable without schema forks.

### 2026-08-07 — Homepage Side Trails section (deepeners teaser)

**Artifact:** `docs/releases/homepage-side-trails-section-owner-review.md`  
**Branch:** `feature/homepage-side-trails-section`

1. **Homepage Side Trails belongs in Rebuild deepeners after Scenes/Sheds**, not a
   marketing `studio-home.js` surface — root Home remains the outdoor workspace.
2. **Homepage card hrefs can differ from catalog Open URLs** when the product
   requires the working app (`/apps/signalterrain/`) or an outlink (Civic Trails
   GitHub) rather than the Side Trails product landing alone.
3. **Keep Side Trails visually lighter than primary deepen panels** so Home does
   not read as a second flagship catalog.

### 2026-08-07 — Global Signals Sprint 1 release (cherry-pick onto newer main)

**Artifact:** `docs/releases/global-signals-sprint-1-release.md`  
**Branch:** `release/global-signals-sprint-1`

1. **When feature branched from an older main tip, cherry-pick the five unique
   commits onto current `origin/main`** — preserves newer production work
   (here: outdoor Articles feed refresh `4fd33cc`) without a reverse-merge.
2. **Pre-existing SignalTerrain suite failures on main do not block an additive
   GS release** when the changed file set does not touch those surfaces and the
   failures reproduce on `origin/main` alone.
3. **`pages.yml` + live SHA verification remain mandatory** — production was
   still on Side Trails `70412af` while main already held the articles refresh.

### 2026-08-06 — Global Signals Articles Sprint 1 (five commit slices)

**Artifact:** `docs/global-signals/articles-owner-review.md`  
**Branch:** `feature/global-signals-articles-sprint-1`

1. **Slice commits beat monoliths for reviewable GS work** — route shell → cards →
   Take → metadata → path/detail keeps each push owner-reviewable and avoids
   shipping half-built parallel schemas.
2. **`sample-demo` mode must be a first-class dataset flag**, not a footnote —
   banner + mode field prevent demo briefs from being misread as live news.
3. **Confidence normalizers need a `predicted` flag** — Observed is facts-only;
   impact-path hops must coerce Observed → Unknown.
4. **Reuse Global Signals landing chrome** (`gs-landing` + IBM Plex) for module
   pages; do not fork outdoor Articles WCS skin into Side Trails.
5. **Foundation smoke tests that assert “Coming soon” on every module** must be
   updated when the first module graduates to a live shell — otherwise CI locks
   the product in placeholder state.


### 2026-08-06 — Side Trails release integration (ordered rebase)

**Artifact:** `docs/releases/side-trails-integration-owner-review.md`  
**Branch:** `release/side-trails-integration`

1. **Merge Side Trails production + ST IA first**, then cherry-pick nav/articles/GS unique commits — parallel lineages conflict if merged whole.
2. **Nav architecture can reintroduce SignalTerrain into `portfolio.foundations`** — re-assert `sideTrails` after rebase.
3. **`GITHUB_TOKEN` pushes do not retrigger Pages** — always `workflow_dispatch` `pages.yml` after main updates that must go live.

### 2026-08-06 — Articles design modernization (Take + shared nav)

**Artifact:** `docs/articles/articles-modernization-owner-review.md`  
**Branch:** `feature/articles-design-modernization`

1. **Reuse WCS page chrome for Articles** — `wcs-page` / `wcs-hero` + shared shell
   beats a one-off dark `was-home` skin; drop duplicate pill menus when primary
   nav already carries Dashboard → About.
2. **Waypoint’s Take is a component, not a card subsection** — shared
   `wds-take.js` / `.wds-take` markup; Articles must call `renderArticleHtml` and
   keep Summary visually plain.
3. **Honest empty beats fake editorial** — when Take is missing, unavailable, or
   only repeats Summary, render restrained empty; never invent Takes on live RSS.
4. **Side Trails publishing is schema extension, not a CMS** — document
   reserved `origin` / `projectId` / `projectLabel` and `dataUrl` overrides;
   do not fork the feed renderer.
5. **Align Home RC1 nav asserts when architecture labels change** — Dashboard /
   Side Trails / Support belong in `studioPrimaryNav` and smoke tests together.

### 2026-08-06 — Studio nav architecture alignment

**Artifact:** `docs/product/waypoint-studio-nav-architecture-owner-review.md`  
**Branch:** `feature/studio-nav-architecture-alignment`

1. **One architecture contract, many surfaces** — `studioPrimaryNav` alone is not enough; About, Support, 404, incubator, sitemap, product-registry, and platform-catalog drift independently and must be audited together.
2. **Quiet Home is an exception, not a second architecture** — do not force Side Trails/Support into quiet first viewport; document the exception and keep secondary/global directories honest.
3. **Demote, don’t delete** — Volunteer / SignalTerrain / ForageCast remain reachable under Side Trails, Incubator, or supporting tiers; primary peers must match the seven-item set.
4. **Keep nav-registry and embedded JS in sync** — `wds-app-nav-config.js` is the runtime embed; edit both or regenerate from `nav-registry.json`.
5. **Smoke-test labels as the contract** — assert exact primary label set and absence of old peer names on directory HTML, not only JSON keys.

### 2026-08-06 — SignalTerrain IA move into Side Trails

**Artifact:** `docs/product/signalterrain-side-trails-move-owner-review.md`  
**Branch:** `feature/signalterrain-move-to-side-trails`

1. **Catalog membership ≠ architecture placement** — listing SignalTerrain on Side Trails
   is incomplete until nav `homeIncubator`, platform catalog tier, and product-registry
   portfolio also stop treating it as an incubator/foundation peer.
2. **Preserve both URLs** — keep `/apps/signalterrain/` working and keep
   `/side-trails/signalterrain/` as the product landing; dual entry beats broken bookmarks.
3. **Assert non-peer explicitly in smoke tests** — check `homePrimary` /
   `studioPrimaryNav` / `homeIncubator` do not list SignalTerrain beside Dashboard/Scenes.
4. **Incubator should point, not host** — after the move, Incubator keeps a “Looking for
   SignalTerrain?” pointer rather than a peer product section.
5. **Use a fresh worktree from the Side Trails tip** when other worktrees carry unrelated
   dirty WIP so the IA move does not ship mixed branches.

### 2026-08-06 — Side Trails production integration (simple landing)

**Artifact:** `docs/product/side-trails-production-integration-owner-review.md`  
**Branch:** `feature/side-trails-production-integration`

1. **Production Side Trails stays a short card list** — Civic Trails + SignalTerrain
   only for the first ship; omit search, filters, categories UI, and dashboards
   even if earlier catalog drafts had them.
2. **Soft-exclude Global Signals from the primary set** until product explicitly
   adds it; keep the catalog subset honest rather than carrying research WIP.
3. **Open → landing for SignalTerrain** (`/side-trails/signalterrain/`), GitHub
   for Civic Trails; do not modify `apps/signalterrain/` in the integration block.
4. **Branch from `origin/main` in a fresh worktree** and cherry-pick only the
   Side Trails + landing commits so Global Signals / design-doc WIP never rides
   the production review branch.
### 2026-08-06 — Global Signals Side Trails project
### 2026-08-06 — Global Signals Citizen Impact Dashboard (design only)

**Artifact:** `docs/product/global-signals-citizen-impact-owner-review.md`  
**Branch:** `feature/global-signals-citizen-impact`

1. **Citizen framing is a lens, not a news desk** — ask “what could this mean for
   ordinary people?” with conditional language; never guarantee outcomes.
2. **Impacts are graph paths** — category cards without origin nodes / edge paths
   are orphan claims and must not publish.
3. **Empty categories are success** — filling eleven cards without evidence
   violates trust; quiet days beat fabricated household drama.
4. **Cross-link sibling engines early** — Relationship Engine, Cascading Impact
   Explorer, and Articles share the same citizen-literacy end nodes; document
   deep-link contracts before any runtime.
5. **No surveillance framing** — citizen nodes are impact literacy, never
   dossiers or targeting.

### 2026-08-06 — Global Signals Cascading Impact Explorer (design only)

**Artifact:** `docs/product/global-signals-cascading-impact-owner-review.md`  
**Branch:** `feature/global-signals-cascading-impact` (consolidated into foundation)

1. **Cascades need four edge facets** — reason, confidence, evidence, and timeframe
   on every hop; never imply certainty.
2. **Expand-on-demand beats wall graphs** — first hop limited; deeper branches open
   intentionally so literacy stays calm.
3. **Examples are patterns, not forecasts** — tariff and conflict cascade specimens
   teach structure without live prediction theater.
4. **Reuse Relationship Engine honesty** — cascade views are projections over
   evidenced edges, not a second invented graph.

### 2026-08-06 — Global Signals Side Trails foundation

**Artifact:** `docs/product/global-signals-owner-review.md`  
**Branch:** `feature/global-signals-foundation`

1. **Intelligence platform ≠ news site ≠ financial advice** — state boundaries on
   the landing and in docs so the product cannot drift into feed or trading theater.
2. **Catalog + landing + honest placeholders together** — new Side Trails projects
   need JSON card, public story page, and empty module shells in the same block.
3. **Relationships before headlines** — citizen impact is the through-line; keep
   sections focused on why links matter.
4. **Consolidate WIP on one foundation branch** — finish partial Global Signals
   files rather than forking duplicate landings across sibling worktrees.
5. **Schematic specimens must say mock** — labeled SVG art prevents owners from
   mistaking foundation review for live intelligence.

### 2026-08-06 — SignalTerrain Intelligence Map (design only)

**Artifact:** `docs/product/signalterrain-intelligence-map-owner-review.md`  
**Branch:** `feature/signalterrain-intelligence-map-design`

1. **No evidence → no marker** — geographic drama without citations violates trust.
2. **Dossier is the product of a click** — summary/evidence/timeline/CVEs/advisories/news/recs
   beat floating tooltips that hide provenance.
3. **Extend Cyber Map ethics** — coarse precision and never-precise-victim stay mandatory
   when adding BGP/DNS/cloud/attack layers.
4. **Clustering is aggregation, not invention** — clusters must dissolve to sourced children.

### 2026-08-06 — Global Signals Relationship Engine (design only)

**Artifact:** `docs/product/global-signals-relationship-engine-owner-review.md`  
**Branch:** `feature/global-signals-relationship-engine`

1. **Everything is a node** — Global Signals literacy starts from typed entities
   (ports, tariffs, weather, citizens-as-impact, …), not headline cards.
2. **Five facets on every edge** — why, strength, confidence, direction, and time
   delay; strength ≠ confidence; delay is a class, not fake precision.
3. **Cascades are views over evidenced hops** — 1°/2°/3° narration must not invent
   intermediate nodes; confidence should degrade along a chain by default.
4. **Citizens mean impact literacy, never surveillance** — third-order household
   effects explain kinds of impact, not people.
5. **Leave unrelated Side Trails landing WIP unstaged** when the ask is design-only
   docs + push.

### 2026-08-06 — Dynamic Defensive Posture Engine (architecture only)

**Artifact:** `docs/product/signalterrain-dynamic-defensive-posture-owner-review.md`  
**Branch:** `feature/signalterrain-posture-engine-arch`

1. **Name the daily delta explicitly** — “What should I do differently today?” is a
   posture diff, not a static best-practices list.
2. **Separate climate drivers from context** — zero-days / ransomware / KEV / advisories
   are climate; stack / region / industry are context filters.
3. **Quiet days are success** — inventing filler recommendations violates trust.
4. **Relate, don’t silently fork** — cross-link Adaptive Defense Advisor and
   recommendation schemas so future implementation has one contract.

### 2026-08-06 — SignalTerrain dashboard mockup (no implementation)

**Artifact:** `docs/product/signalterrain-dashboard-mockup-owner-review.md`  
**Branch:** `feature/signalterrain-dashboard-mockup`

1. **Mockups need a persistent SAMPLE banner** — owners must never confuse layout
   review with live intelligence.
2. **Use SAMPLE CVE/actor labels** — realistic density without inventing real
   attribution or victim sets.
3. **Ship screenshot SVGs beside the HTML mockup** — reviewable without a browser
   walkthrough script.

### 2026-08-06 — SignalTerrain public landing (no app functionality)

**Artifact:** `docs/product/signalterrain-landing-owner-review.md`  
**Branch:** `feature/signalterrain-landing`

1. **Product page ≠ app** — keep `/side-trails/signalterrain/` as marketing/story;
   leave `/apps/signalterrain/` as the existing experience.
2. **Schematic illustrations only** — label threat map / timeline / globe / posture
   art as non-live so we never imply fabricated incidents.
3. **Point Side Trails CTA at the landing** when the ask is product introduction,
   not deep-link into live briefs.

### 2026-08-06 — Side Trails catalog (SignalTerrain second project)

**Artifact:** `docs/product/side-trails-signalterrain-owner-review.md`  
**Branch:** `feature/side-trails-signalterrain`

1. **Side Trails ≠ Incubator** — Side Trails is a catalog of sister experiments;
   Incubator remains Coming later. Link between them; don’t merge the IA.
2. **Catalog-only cards** — never hardcode project titles/CTAs in HTML when the
   contract is JSON-driven; tests should assert the shell stays empty of titles.
3. **Integrate without rebuilding** — listing SignalTerrain means CTA to the
   existing app path, not a new cyber feature surface in the same block.
4. **Use a clean worktree from `origin/main`** when the primary workspace has
   unrelated dirty WIP so Side Trails ships without noise.

### 2026-07-24 — Sprint 6 polish merge-gate recovery

**Artifact:** `docs/rebuild-2026/platform-polish-rc2-owner-review.md`  
**Branch:** `integration/dashboard-rc25-sprint6`  
**Backup:** `backup/dashboard-rc25-sprint6-pre-reconcile`

1. **When polish already sits on main’s tip, cherry-pick the product commit
   only** — tip-SHA docs churn and unrelated walkthrough commits dilute the
   merge package; keep backup of the original branch tip.
2. **Canonical merge-gate path can reuse a filename** — rewrite
   `platform-polish-rc2-owner-review.md` as the Sprint 6 gate when that is the
   agreed owner path; point supporting `OWNER-REVIEW.md` at it so links stay
   honest.
3. **Stash unrelated dirty trees before integrate** — privacy/RC2 HTML must
   not ride the polish cherry-pick; restore later on a non-integration branch.
4. **Re-verify baseline failures on `origin/main`** before blaming the sprint
   (`home-rc1` support assert + stale `today-outside` Outdoor OS suite).

### 2026-07-23 — Dashboard RC2.5 Sprint 6 (experience polish)

**Artifact:** `docs/dashboard-rc25-sprint6/OWNER-REVIEW.md` (supporting);  
merge gate: `docs/rebuild-2026/platform-polish-rc2-owner-review.md`
**Branch:** `polish/dashboard-rc25-sprint6` → `integration/dashboard-rc25-sprint6`

1. **Family grouping beats category noise** — Quiet ENVIRONMENTAL / ASTRONOMY /
   PHOTOGRAPHY labels + default order (Conditions→Air→Alerts→Astronomy→Light)
   make related instruments read as one system without a redesign.
2. **Skeletons > “Settling…”** — Keep screen-reader settling copy; show
   shimmer lines for visual calm and CLS-safe pending frames.
3. **Soften category glow for premium density** — Luminous borders stay; reduce
   neon bloom so cards feel like morning instruments, not admin neon.
4. **Empty states need a title + guidance** — “Your workspace is empty” plus
   one honest next step outperforms a single flat sentence.

### 2026-07-23 — Mobile tile editing (iPhone Customize)

**Artifact:** `docs/dashboard-mobile-tile-editing/OWNER-REVIEW.md`  
**Branch:** `fix/mobile-tile-editing`

1. **Do not transplant Outdoor OS quiet-chrome wholesale onto Rebuild Home** —
   `[data-product="dashboard"] .was-local { display: none }` hid the only
   Workspace · Customize entry. Soften labels; keep feature nav.
2. **Customize needs an in-page entry as well as local nav** — phone users
   benefit from a ≥44px Customize control beside the Workspace heading.
3. **Draft before persist** — live preview in memory (`beginDraft` /
   `commitDraft` / `discardDraft`) gives honest Save/Cancel without a second
   prefs store; leaving Customize without Save discards.
4. **CDP verify must wait for mount** — probing before `[data-wdb-r]` paints
   falsely reports missing controls even when scripts are correct.

### 2026-07-23 — Photography Library RC1 owner review (design only)

**Artifact:** `docs/rebuild-2026/photography-library-rc1-owner-review.md`  
**Status:** Awaiting owner approval — no implementation this block.

1. **Public photography needs a Featured gate, not “approved = public”** —
   `photo_pipeline` approve/`data/media/catalog.json` and identity
   `manifest.json` are different layers; Home/Scenes heroes must read
   owner-curated Featured only, never all imports.
2. **Three parallel photo systems already exist** — identity slots,
   private disk library + pipeline, browser IndexedDB Photo Library.
   RC1 must designate one public SoT and treat the others as private or
   cutover shims, not invent a fourth disconnected rotator.
3. **Baseline screenshots ≠ after shots** — reuse
   `platform-color-correction/` and `platform-visual-regression/` captures
   labeled current state; never fake implementation screenshots in a
   design-only review.

### 2026-07-23 — Photography + widget color correction

**Artifact:** `docs/rebuild-2026/platform-photography-and-widget-color-correction-owner-review.md`  
**Evidence:** `docs/rebuild-2026/platform-color-correction/`

1. **Unsplash stand-ins are not “restored photography”** — identical MD5
   across `hero.jpg` / seasons / Scenes mist-valley meant prior “restore”
   only swapped SVG for stock; field JPGs under `apps/waypoint-scenes/assets/`
   were the real recovery target.
2. **Gallery metadata can lie** — `photography-data.js` titled `image0.jpeg`
   “Elk at Dawn” but pixels are a bog-bridge forest trail; caption from
   pixels + EXIF camera, never invent subjects or Mucarri credits.
3. **Category color fails if only a 1–3px top edge changes** — use full
   perimeter border + wide outer glow + tint wash + label/pill accents via
   centralized `--category-*` tokens; prove with screenshots at normal scale.
4. **Capture location seeding must use `wds-location-v3` + prompted flag** —
   v1-only seeds leave the region modal covering Featured Photography.

### 2026-07-23 — Platform photography + visual regression

**Artifact:** `docs/rebuild-2026/platform-photography-and-visual-regression-owner-review.md` (**SUPERSEDED**)  
**Evidence:** `docs/rebuild-2026/platform-visual-regression/`

1. **Missing photography was a manifest rewire, not deleted binaries** —
   `b264a13` SVG identity slots orphaned JPGs still on disk; restore by
   pointing manifests/HTML at existing paths before hunting archives.
2. **Named photographer credits need repo evidence** — Anthony Mucarri appears
   in production anecdotes but nowhere in git/EXIF; do not invent attribution.
3. **Product landings can override shared shell into “old site” feel** —
   Scenes moss/olive and Sheds forest wash defeated navy foundation; keep
   product accents on CTAs/nav/stage only.
4. **Category presence is additive CSS** — strengthen border/glow/tint/label
   via `--wdb-r-cat-*` without touching widget geometry or trust-chip semantics.
   *(Follow-up: prior “stronger” treatment still failed owner distance test —
   see correction lesson above.)*

### 2026-07-23 — Home RC1.2 footer production delivery check

**Artifact:** `docs/rebuild-2026/home-rc1.2-footer-production-incident.md`  
**Evidence:** `docs/rebuild-2026/home-rc1.2-footer-production/`

1. **Green Pages + matching `build-info` is not enough alone for footer claims** —
   also inspect rendered `.was-footer` link labels/hrefs and the live
   `wds-app-shell.js` hash; the footer is JS-composed, not static HTML.
2. **Do not open a delivery incident until Pages verify finishes** — `00cddd3`
   deployed in ~1 minute; a check during that window looks like “push didn’t
   ship” when the pipeline is healthy.
3. **Primary nav ≠ trust footer** — Home · Scenes · Sheds · Articles · About in
   chrome is expected; only the shared `renderFooter()` KEEP list is the RC1.2
   contract.

### 2026-07-22 — Home RC1.2 footer simplification

**Artifact:** `docs/rebuild-2026/home-rc1.2-footer-owner-review.md`
**Evidence:** `docs/rebuild-2026/home-rc1.2/`

1. **Footer SoT is `renderFooter` in the shared app shell** — there is no
   separate Home footer config; simplifying Home’s trust footer correctly
   updates every quiet/shell host. Prefer that over forking Scenes/Sheds.
2. **Footer tests drift from labels** — contact-platform still asserted
   “Report bug / Request feature / support.html” after UI had moved to
   “Something wrong? / Suggest an idea”; assert against the footer function
   body and the KEEP list, not stale synonyms.
3. **Terms can be a honest placeholder** — match Privacy page shell/CSS lightly;
   say it is unfinished rather than inventing a faux legal document.

### 2026-07-22 — Home RC1.1 navigation & duplicate mode fix

**Artifact:** `docs/rebuild-2026/home-rc1.1-navigation-owner-review.md`
**Evidence:** `docs/rebuild-2026/home-rc1.1/`

1. **Duplicate modes confuse more than they help** — Workspace and Kiosk
   shared the same Rebuild surface; removing user-facing Kiosk (nav, chrome,
   Customize preset label) while keeping the module for hash/tests is enough.
2. **Nav config and nav-registry drift** — `wds-app-nav-config.js` is runtime
   truth; keep `nav-registry.json` in sync when editing features/`startHere`.
3. **Deepener sample copy can reintroduce “Dashboard”** — fix
   `articles/manifest.json` summaries and sample CTAs when Home is the public
   name, not only shell/nav strings.

### 2026-07-23 — Home RC1 final production audit

**Artifact:** `docs/rebuild-2026/home-rc1-final-audit.md`
**Evidence:** `docs/rebuild-2026/home-rc1-audit/`
**Re-verify:** same-day refresh re-ran Home/P1/P2/P3/constitution/routes + CDP
captures; verdict unchanged (**READY TO SHIP**, no blockers).

1. **Local READY TO SHIP ≠ live Home** — production `/` can still be
   marketing `studio-home` while local hosts pass every RC gate; constitution
   delivery honesty requires ordinary-URL multi-UA verify after deploy.
2. **Shorter default grids peek deepeners** — five RC1 defaults (vs Phase 2’s
   six) can let “Latest Articles” enter the first desktop/tablet viewport;
   phone stacking still keeps deepeners below fold. Measure fold with seeded
   prefs, not screenshot height alone.
3. **Sample editorial can reintroduce banned product names** — Home chrome
   may be clean while `articles/manifest.json` summaries still say Dashboard /
   Fieldry; scan deepener-visible copy, not only shell/nav.

### 2026-07-22 — Home Implementation RC1

**Artifact:** `docs/rebuild-2026/home-implementation-rc1-owner-review.md`
**Vision lock:** `docs/rebuild-2026/home-vision-lock-owner-review.md`

1. **Strategy A beats redirect for “Home is the app”** — root `index.html` as a
   thin Rebuild host sharing `apps/dashboard/js/home-boot.js` keeps one
   implementation without teaching users a subdirectory.
2. **Root match patterns must be exact** — `/?$` as a RegExp matches every path
   because `/` is optional; use `^/$` (and `^/index\\.html$`) so About/Support
   do not detect as Home.
3. **Deepeners belong in workspace paint only** — Customize/Kiosk stay instrument-
   focused; append-only sections must not compete with Phase 2 chrome.
4. **Banned-word chrome scans catch honest copy** — “not a homework list” failed
   Phase 1 banned-term checks; prefer “to-do list” / “assignment” avoidance in
   product chrome.
5. **Production `/` stays marketing until deploy** — local Home RC1 success ≠
   public delivery; keep dual-URL verify after ship.

### 2026-07-23 — Dashboard public delivery incident

**Artifact:** `docs/rebuild-2026/dashboard-public-delivery-incident.md`
**Harness:** `automation/verify-dashboard-production.mjs`

1. **Ordinary URL is authoritative** — cache-bust / `Cache-Control: no-cache` curl
   proves origin capability, not what Android Chrome or a frozen tab serves.
2. **Name the surface** — `/` (studio-home) and `support.html` (“Outdoor overview”)
   are not `/apps/dashboard/`; conflating them falsely indicts Dashboard deploy.
3. **HTTP beats meta** — Dashboard HTML meta `no-cache` does not override Pages/Fastly
   `cache-control: max-age=600`; assert response headers every time.
4. **Multi-hash gate** — a delivery verifier must fail on more than one ordinary HTML
   body hash and on Recovery/Outdoor OS markers, not only on route HTTP 200.
5. **SW absence is testable** — probe `/sw.js` etc. and repo `serviceWorker.register`;
   do not hand-wave. Manifest `start_url: "/"` still steers PWAs to homepage.

### 2026-07-22 — Dashboard Phase 3 (widget library & personalization)

**Artifact:** `docs/rebuild-2026/dashboard-phase3-owner-review.md`
**Screenshots:** `docs/rebuild-2026/phase3/`

1. **Extend prefs carefully, never rename the key** — add `favorites` /
   `gridColumns` with defaults inside `normalize()` so
   `waypoint-dashboard-rebuild-prefs-v1` loads without a migration.
2. **Library taxonomy ≠ widget `category`** — keep instrument categories for
   card accents; map `libraryCategory` for Customize filters (Weather,
   Photography, …) so Phase 1/2 CSS stays intact.
3. **Lazy hydrate must eager-fill the viewport** — IntersectionObserver alone
   can leave above-the-fold widgets on “Settling…” in headless; fill laid-out
   frames immediately and keep reserved min-height / content-visibility for CLS.
4. **Columns via data attributes, not a new grid system** — `data-columns` on
   the existing 12-col workspace preserves Phase 1 card chrome while remembering
   1/2/3 preference.
5. **Ban instructional Today voice in the composer and tests** — extend the
   filter beyond “you should” to “great day for” / “don’t forget” or coaching
   reappears as soon as lines get richer.

### 2026-07-22 — Dashboard Phase 2 (first four live widgets)

**Artifact:** `docs/rebuild-2026/dashboard-phase2-owner-review.md`
**Screenshots:** `docs/rebuild-2026/phase2/`

1. **OIP once, widgets many** — hydrate via `outdoorIntelligence.get`, then
   registry adapters; never let each widget fetch providers (duplicates cache
   and invents race trust).
2. **Primary weather can 429** — Open-Meteo daily limits return placeholders;
   Dashboard boot recovers with NWS for live conditions while still refusing
   to publish placeholder numbers as Live.
3. **Moon times are often absent** — label illumination Computed and moonrise
   Not reported; never invent rise/set.
4. **Today Outside is a composer, not a coach** — max eight observational
   bullets from implemented widgets; ban recommendation voice in the line
   builder and in tests.
5. **Keep ph-* ids for prefs continuity** — replacing placeholders in place
   preserves `waypoint-dashboard-rebuild-prefs-v1` without a migration.

### 2026-07-22 — Dashboard Phase 1 polish (presentation)

**Artifact:** `docs/rebuild-2026/dashboard-phase1-polish-owner-review.md`
**Screenshots:** `docs/rebuild-2026/phase1-polish/{before,after}/`

1. **Duplicate nav is a composition bug** — when app shell already owns
   Workspace/Customize/Kiosk, an in-shell actions bar reads as unfinished
   prototype; keep one source of truth.
2. **Developer empty copy blocks product feel** — “Instrument not connected
   yet” / “Phase 1 shell” teach engineering, not outdoors; use Waiting +
   “will appear here” while staying honest (no fake numbers).
3. **Compact Today Outside ≠ empty Today Outside** — a short premium panel
   with honest bullets orients without becoming an editorial weather page;
   Workspace must still dominate the viewport.
4. **Anticipate categories with placeholders only** — expand catalog
   families (Astronomy, Photography, Rivers, …) for layout readiness without
   starting Phase 2 provider work.

### 2026-07-22 — Dashboard Rebuild Phase 1 shell

**Artifact:** `docs/rebuild-2026/dashboard-phase1-owner-review.md`
**Code home:** `design-system/js/dashboard/rebuild/`

1. **Replace the entry, archive the era** — `/apps/dashboard/` mounts Rebuild
   shell; Outdoor OS modules may remain loadable without being product law.
2. **Shell without providers** — Phase 1 paints workspace + Today Outside
   container before OIP; do not reintroduce contentEngine Outdoor OS boot.
3. **Placeholders must stay honest** — registry `ph-*` widgets return
   Unavailable; never invent numbers to “look finished.”
4. **Stop at framework** — do not continue into real widgets until owner
   approves Phase 1 review.

### 2026-07-22 — Waypoint Studio 2026 Rebuild architecture baseline (docs)

**Artifact:** `docs/rebuild-2026/` (+ archive `docs/archive/pre-rebuild-2026/`)

1. **Owner reversal must be written as new authority** — otherwise agents
   correctly keep rebuilding Outdoor OS from Manifesto/Screen Spec/Reset.
2. **Newer is not canonical** — Outdoor OS shipped after Recovery/V2/V3 and
   still lost to the Rebuild decision (widgets + Today Outside + three products).
3. **Do not merge eras** — briefing philosophy and widget workspace are
   different products; archive the old vision rather than hybridizing it.

### 2026-07-22 — Outdoor OS M3 publish gate (legacy fallthrough)

**Artifact:** `docs/dashboard-os-m3-publish/`
**Branch:** `integration/dashboard-os-m3`

1. **Preferring OS is not enough if OS fails to register.** Outside must
   short-circuit to an honest unavailable state — never Recovery/widget-grid
   fallthrough — regardless of localStorage V2/V3 flags.
2. **Keep V2 modular tests at RC3 counts** when modules remain for shared
   models/kiosk; document the 58 baseline instead of deleting coverage.
3. **Day Arc fold is content-dependent.** Audit viewports; do not compress
   Happening/Matters/Do to force Day Arc above the fold.

### 2026-07-22 — Outdoor OS M3 reconciliation onto RC3 origin/main

**Artifact:** `docs/dashboard-os-m3-reconcile/OWNER-REVIEW.md`
**Branches:** `backup/dashboard-os-m3-pre-reconcile`, `recovery/dashboard-os-m3-reconcile`,
`integration/dashboard-os-m3`

1. **Cherry-pick OS onto origin/main, never rewrite production tip first.**
   Preserve Pages/nav/Scenes infra; resolve Dashboard entry to Outdoor OS.
2. **modify/delete on legacy render ≠ automatic delete.** Keeping
   `wds-dashboard-v2-render.js` for V2/V3/kiosk while engine prefers OS is valid;
   update tests to assert product path, not file absence.
3. **Quiet chrome must merge with Explore, not replace it.** Outside uses
   `data-quiet-chrome`; other apps keep RC3 primary nav + Explore.
4. **Test count rises when RC3 modular suites are retained** (V2 ~21 → 58) —
   document, don’t “fix” by deleting coverage.

### 2026-07-22 — Outdoor OS Milestone 3 (professional polish + production verify)

**Artifact:** `docs/dashboard-os-m3-review/OWNER-REVIEW.md`
**Harness:** `automation/capture-dashboard-os-m3-screenshots.mjs`,
`automation/capture-dashboard-os-m3-production-compare.mjs`

1. **Production status ≠ git status.** Live `meta[name=waypoint-build]` +
   `data/build-info.json` + Pages workflow SHA are the source of truth; local
   HEAD can be ahead/behind/diverged without production knowing.
2. **`:focus-visible` won’t show in CDP `.focus()` screenshots.** Keyboard Tab
   is the real a11y proof; document the headless limitation instead of chasing
   rings that never paint under programmatic focus.
3. **Timeline `timeLabel` falling back to `detail` glues prose into Day Arc
   clocks** (“Diffuse light” → `diffuselight`). Compact only labels that look
   like clocks; never strip spaces from arbitrary strings.
4. **Panel craft is mostly host state + focus restore**, not new IA — backdrop,
   trap, inert sheet, restore opener, reduced-motion instant path.
5. **GitHub Pages can succeed while CI fails** by design in this repo — do not
   treat CI green as a deploy prerequisite when reporting production SHA.

### 2026-07-22 — Dashboard owner fixes (Contact shell + observational Best window)

**Artifact:** `docs/dashboard-owner-fixes/OWNER-REVIEW.md`

1. **Product-scoped footer links beat shared studio-root Contact.** Quiet Outside
   felt like an “old site exit” when Contact jumped to depth-0 studio Contact.
   Prefer in-product `apps/dashboard/contact.html` when `product === dashboard`.
2. **Explicit `options.app = null` must not fall through `|| detectApp()`.**
   Falsy null re-detects from `location.pathname` and breaks studio-vs-product
   footer tests; use `hasOwnProperty` (or equivalent) for optional app override.
3. **Label renames without generator rewrites leave homework copy alive.**
   “Best window” UI + night/default string banks + `dashboardOSCopy` bans must
   ship together or the next hydrate regenerates “Do this” / “then rest”.
4. **Owner voice is observational possibility, not softened imperatives.**
   “Take a walk” → “Conditions favor a walk…”; safety stays clear without
   assignment verbs (Finish / Postpone / You should).

### 2026-07-22 — Outdoor OS Milestone 2 closeout (owner decisions)

**Artifact:** `docs/dashboard-os-m2-review/OWNER-REVIEW.md`
**Harness:** `automation/capture-dashboard-os-m2-scenarios.mjs` (32 fixtures)
**Tests:** `automation/test-dashboard-os-interpret.mjs` (79)

1. **“Good photo” ≠ Do photography.** Without an activity-preference UI, ordinary
   calm days must default to a general outdoor walk; photography only when
   excellent/notable light advantage is evidenced (R1/D6).
2. **Flood Watch ≠ Flood Warning.** Precautionary crossings language for Watch;
   escalate only for Warning / active flooding — never “stay home” by default.
3. **Derived dew point must never read as observed.** Prefer provider dew; else
   calculate only from fresh temp+RH; mark derived; qualitative copy; skip stale.
4. **Material vs minor provider conflict.** Material → uncertainty in triad
   without provider names; minor → silence. Sources owns identity.
5. **Practical timing windows beat clock precision.** Map activity hours to
   bands (early morning … near sunset); exact sunrise/sunset OK; ban 8:13–9:47.
6. **Drought alone is not an avoid-outdoors signal.** Combine with heat/fire/UV
   only when those signals exist; still recommend going out with water.

### 2026-07-22 — Outdoor OS Milestone 2 (Waypoint Intelligence)

**Artifact:** `docs/dashboard-os-m2-review/OWNER-REVIEW.md`
**Harness:** `automation/capture-dashboard-os-m2-scenarios.mjs` (22 fixtures → 32 at closeout)

1. **Interpretation belongs in a PriorityRanker module, not compose string pasting.**
   Compose keeps place/trust/day-arc; `dashboardOSInterpret` owns Happening /
   Matters / Do with traces. UI unchanged.
2. **`/rise/` does not match `"rising"`.** Trend matchers need `ris(e|ing)` (or
   similar) — substring intuition fails on morphology.
3. **Trajectory “clearing” support must lose to hazards.** Otherwise snow/wind/
   conflict days get “clouds thin later” nonsense. Gate clearing on low signal
   weight.
4. **Photo opportunity must not pad Matters under rain/storm/fog** — suppress
   light signals when hazard owns the day; keep photo only for air+light
   *conflict* naming.
5. **Activity hourly windows can recommend 9pm walks.** Prefer daylight golden
   hour for photography Do; clamp late-PM activity windows toward late
   afternoon / golden → superseded by practical bands in closeout (D8).
6. **Scenario harness > manual copy review.** Fixture → interpret → JSON/MD
   makes ranking regressions obvious and reproducible for owner review.

### 2026-07-22 — Outdoor OS Milestone 1.5 (readability / hierarchy / presence)

**Artifact:** `docs/dashboard-os-m1.5-review/OWNER-REVIEW.md`
**Scope:** CSS + minimal scan copy only; IA/interaction locked.

1. **Capture before screenshots before touching CSS.** Night vs day atmosphere
   changes the review story — note capture TOD when comparing before/after.
2. **Hierarchy is mostly weight, measure, and gap — not new chrome.** A 2px
   Do accent rail beats a CTA pill; quieter Sources/gateways beat more labels.
3. **Shell background can box the briefing.** When Outside sets night
   atmosphere, quiet shell/body must follow (`:has([data-wdb-os-atmosphere])`)
   or the screen reads as a dark card on a light page.
4. **Compact day-arc times in compose** (`2p` vs `2:00 PM`) is scanability,
   not IA — keep Spec §1.3 [H] beat format in the composer, not CSS.

### 2026-07-21 — Outdoor OS Dashboard architecture reset (docs only)

**Artifact:** `docs/OUTDOOR-OS-DASHBOARD-RESET.md`
**No implementation** in this block.

1. **Layering briefing UI on a widget/tab IA does not yield an Outdoor OS.**
   Recovery tabs + V2 overview panels still communicate “instrument console.”
   Preserve OIP/providers/rule engines; treat grid/tab chrome as disposable.
2. **Playbook concessions that legitimize multi-widget-after-briefing** encode
   the failed product compromise — revise when rebuilding presentation.
3. **Success metric shift:** first viewport must answer happening → matters →
   do; “widgets live” is infrastructure health, not product success.

### 2026-07-14 — Scene Builder dimming & dashboard progressive hydrate

**Commits:** `bccb8d4`, `1a2d851`
**Session report:** `docs/SESSION-STABILIZATION-2026-07-14.md`

1. **`display:` author rules beat UA `[hidden]`.** Any full-viewport overlay
   with `display: flex|grid|block` needs an explicit
   `.selector[hidden] { display: none !important; }`. After fixing one surface,
   sweep siblings (compare mount, location prompt mount + inner dialog, modal,
   columns gated only inside a media query).
2. **Progressive shell must not refetch.** Widget mounts that call
   `getForecast` / `OIP.get` during first paint race the content engine, bump
   generations, and waste Open-Meteo quota. Shell mounts should wait for
   `platform.meta.hydratedAt` (or an explicit `allowDirectFetch` opt-in).
3. **Second `innerHTML` wipe destroys perceived performance.** Prefer
   in-place hydrate (briefing/banner + `refreshDashboard`) after OIP arrives.
4. **Do not settle Loading → Unavailable before hydrate.** Gate
   `settleStaleMounts` on package readiness so progressive cards are not
   falsely terminal.
5. **Cold start needs a non-lying location.** National provisional shell is
   fine; inventing Kansas/engine publish coordinates is not.
6. **Page-level `aria-live` on the whole dashboard** announces hydrate storms —
   keep live regions on status fragments, not the content root.
7. **Duplicate script includes** (nav/shell already pulled by `wds.js`) risk
   double-binding; load platform modules once.
8. **Regression insurance:** static pattern tests plus a short CDP smoke for
   overlay coverage and shell-ready timing beat reliance on manual repro alone.

### 2026-07-24 — Dashboard RC2.5 Sprint 6 polish deploy

**Merge:** `3d28fb6` (integration `e6a76d9` onto `a349e68`)
**Report:** `docs/rebuild-2026/platform-polish-rc2-deployment-review.md`

1. **Verify the exact approved integration tip before merge.** Owner gate was
   `e6a76d9`; silently accepting a newer tip is forbidden.
2. **Local `main` can diverge while `origin/main` is correct.** Sync with
   local `reset --hard origin/main` only — never force-push main to “fix”
   a stale local tip.
3. **Pages injects `build-info` — do not fabricate pre-push.** Product gate is
   live `data/build-info.json` + ordinary HTML fingerprint, not workflow green
   alone.
4. **Documented follow-ups do not block merge** when baselines are disclosed
   (`home-rc1` support assert; stale Outdoor OS today-outside suite).

### 2026-07-25 — Dashboard production tile layout repair

**Branch:** `fix/dashboard-production-tile-layout`  
**Report:** `docs/rebuild-2026/dashboard-production-tile-layout-repair-owner-review.md`

1. **Family headers in a shared 12-col grid create orphan thirds.** Nest each
   family in its own equal-column grid so a single Astronomy/Light tile fills
   the row instead of `span 4` beside empty tracks.
2. **Ambiguous size tokens (`sm`/`half`/`compact`) fight equal-width UX.** Prefer
   an explicit `standard|wide|featured` model with legacy migration.
3. **Coming-soon tiles must leave the selectable catalog**, not hide behind CSS.
4. **Mobile full-width needs a breakpoint that covers real phones**
   (`max-width: 47.99rem`) with `minmax(0, 1fr)` and `grid-column: 1 / -1` on
   every variant — including loading skeletons.
5. **Bust Home HTML asset queries** when Rebuild CSS/JS layout contracts change
   (`dash-tile-layout-1`), then verify live Pages `build-info` + cache-bust URL.

### 2026-08-07 — Sheds Today’s Search + observation heatmaps

**Branch:** `feature/sheds-todays-search`  
**Report:** `docs/SHEDS-TODAYS-SEARCH-OWNER-REVIEW.md`

1. **Separate epistemic layers on one map.** Biological heat = *estimated
   opportunity*; observation heat = *observed activity* from private notes only.
   Mixing them silently destroys trust — label the mode in the legend and briefing.
2. **Empty observed heat is a feature.** Never seed demo sightings for first-run
   polish. Tests must assert zero priorities with zero observations.
3. **Today’s Search needs facts vs analysis vs uncertainty tags.** Weather numbers
   are facts; dawn/dusk preference and fence-line wind notes are analysis; missing
   pressure/location are uncertain. Confidence text must name the gaps.
4. **Patterns need a sufficiency gate.** Do not whisper “your deer usually…” from
   two notes. Require a minimum count + distinct days, then say when insufficient.
5. **Rich Open-Meteo fetch stays fail-soft.** Sunrise/pressure/precip improve the
   briefing; if the request fails, seasonal + note-based copy must still render.

### 2026-08-08 — Sheds map tile reliability

**Branch:** `fix/sheds-map-reliability`  
**Report:** `docs/sheds/map-reliability-owner-review.md`

1. **Wrong Subresource Integrity on Leaflet CSS is a silent map-killer.** The
   browser blocks the stylesheet; JS still runs; tiles stay `position: static`
   and leave large gray gaps that look like “failed tiles.” Verify SRI digests
   or vendor Leaflet locally (preferred for Pages).
2. **OSMF public raster (`tile.openstreetmap.org`) is not a production basemap.**
   It may return HTTP 200 placeholder PNGs with `x-blocked` (“Access blocked”).
   Migrate to a production-capable CDN (CARTO / Esri / keyed provider) and keep
   attribution honest.
3. **DOM tile coverage sampling beats screenshot-only QA** for headless CDP
   (composited transforms can under-paint in captures). Gate on viewport sample
   hits + host allowlist (no OSMF public hosts).
4. **Optional keyed tile URLs belong in deploy inject / secrets**, never in
   committed HTML (`WAYPOINT_MAP_TILE_CONFIG` → `waypoint-map-tiles` meta).

### 2026-08-09 — Global Signals industry loader termination

**Branch:** `fix/gs-shipping-industry-loader`

1. **Silent `if (WDS…) mount` with no else is an infinite loader.** Static HTML
   says “Loading Shipping…”. If the deferred module 404s/parses wrong, DOMContentLoaded
   still fires and the page never leaves loading. Auto-boot inside the module plus an
   8s watchdog that errors when `WDS.globalSignals.industries` is missing.
2. **Fetch without timeout can hang at “Loading industry…” forever.** Use AbortController
   / race timeout and always map failure to `data-gsi-state=error|empty|ready`.
3. **Resolve industry JSON from script base + nested relative + absolute candidates.**
   GH Pages nested routes and missing trailing slashes break single relative `../../../../data/...`
   assumptions; try multiple candidates before failing honestly.
4. **Live impacts are optional and must not invent Shipping activations.** Overlay
   `live-impacts.json` when present; empty/missing → honest empty Live developments
   section while structural baseline still renders.

### 2026-08-09 — Agent Ops Product Board foundation

**Branch:** `feature/agent-ops-product-board`  
**Surface:** `ops/product-board/`

1. **Recover before inventing.** Waypoint already had an Engineering OS
   (`engineering/orchestrator`, agents, backlog, gates). Agent Ops work should
   extend that substrate; `docs/ai-agents/` is Scenes-era and obsolete for runtime.
2. **Subscriber Ready ≠ tests pass.** Encode a formal gate with P0–P2 blockers,
   repair-queue checks, required commands, and manual attestations that stay
   `manual_required` until honestly recorded — never auto-APPROVE.
3. **Failed review must route.** Visual/red-team/QA failure creates a fix-status
   work item and blocks the gate; “write report and stop” is a process defect.
4. **Prefer a clean worktree** when the main checkout is dirty with unrelated
   HTML/docs noise; keep Agent Ops commits free of dirty-tree staging.

### 2026-08-10 — Subscriber Ready executable gate

**Branch:** `feature/agent-ops-product-board`  
**Surface:** `ops/product-board/` (gate + evidence + Commercial + Red Team)

1. **Exact verdicts matter.** Use only `NOT READY` | `CONDITIONALLY READY` |
   `SUBSCRIBER READY`. Synonyms like `NOT_SUBSCRIBER_READY` break board consumers
   and weaken the standing bar.
2. **P0/P1 are automatic hard stops; P2 is not a free pass.** Open P0–P1 (or
   repair queue) ⇒ `NOT READY`. Open P2 may yield `CONDITIONALLY READY` but never
   `SUBSCRIBER READY`. Do not weaken this.
3. **Commercial + Red Team must be independent modules.** Tests-pass alone must
   bottom out at conditional/not-ready until commercial cancel-risk review and an
   adversarial Red Team disproof pass are recorded. Red Team must never
   auto-accept engineering self-certification.
4. **Evidence belongs in board state.** Persist machine-readable packages under
   `ops/product-board/state/evidence/<runId>/` (commands, probes, commercial,
   red-team, Playwright capability honesty). A gate without evidence is theater.
5. **Policy criterion IDs are not probe failures.** Matching
   `primary-workflows` attestation-pending as “primary workflow broken” falsely
   forces `NOT READY`; keep workflow-broken detection separate from attestation ids.

### 2026-08-10 — Sheds Subscriber Ready pilot (Product Board)

**Branch:** `feature/agent-ops-product-board`  
**Surface:** `apps/shed-hunting/`, `ops/product-board/`

1. **Campaign scope must not weaken severity.** Filter backlog/probes by
   campaign tag; in-scope P0–P2 still block. Do not lower the bar to pass.
2. **Wrong HTTP root silently audits the wrong product.** Confirm the static
   server cwd before browser review — another worktree on the same port can
   make Today’s Search appear “missing.”
3. **Expanded bottom sheets need Leaflet chrome rules.** Attribution/zoom at
   peek-height will float through expanded copy; use `:has([data-expanded])`
   to hide/lift controls and add an overlap CDP assertion.
4. **Ethics copy must match the real tile provider.** Claiming OSM/OpenTopoMap
   while shipping CARTO/Esri is a trust defect, not copy polish.

### 2026-08-10 — Sheds live-input cold-start escape (adversarial)

**Branch:** `adversarial/sheds-subscriber-ready`  
**Surface:** Today’s Search / Open-Meteo / Product Board gate

1. **GPS-denied + zoom &lt; 9 skipped live weather.** Heat early-return never
   called Open-Meteo; status still said “uses map center when possible.” Paying
   users saw Limited briefing / weather unavailable on the default continental
   view — a P1 honesty + primary-workflow defect.
2. **Why the board missed it.** Prior SUBSCRIBER READY leaned on attestations;
   browser-smoke was optional and failed on missing `ws`; Red Team did not treat
   optional live/browser gaps as disproof; static probes never asserted
   map-center weather fetch on cold start.
3. **Repair + system fix.** `ensureWeatherForView()` fetches for GPS or map
   center even when heat is skipped; glance softens “Best window” without weather;
   new CDP cold-start test; sheds campaign forces `browser-smoke`; probe
   `probeLiveInputColdStart`; Red Team Attack 6 flags optional live gaps.

### 2026-08-10 — Sheds dual false-positive SUBSCRIBER READY (visual/dynamic)

**Branch:** `fix/sheds-board-false-positive`  
**Surface:** Product Board gate + Sheds map chrome / location markers  
**Owner:** Rejected prior SUBSCRIBER READY @ `d5f1692` (second false positive)

1. **Root cause of both board passes.** Policy attestations could pass with thin
   notes (“CDP screenshots”); dimension criteria auto-`covered`; Commercial/Red
   Team rubber-stamped attestation theater; no required screenshot *analysis*,
   no dynamic marker-stability sampling, no commercial visual gate (pricing
   support + finished vs prototype), and production visual defects were never
   asserted. Escaped class: generating screenshots ≠ review.
2. **Production defects missed.** Dual similar lime dots (user pulse + search
   target); CSS `transform:scale` pulse oscillating screen bounds under stable
   GPS; truncated/cramped status + Today’s Search; unexplained FAB icon stack;
   ethics sheet showing Leaflet zoom through copy; map dominating product
   hierarchy.
3. **Board permanent repair.** `visual-review.mjs` + `dynamic-visual.mjs` +
   `commercial-visual.mjs`; gate criteria `screenshot-analysis`,
   `dynamic-visual`, `production-inspection`; attestation anti-theater rules;
   Red Team attacks 7–10; sheds remap + `automation/test-sheds-visual-board.mjs`;
   dimensions no longer auto-covered; fail-review routes visual/dynamic P0s.
4. **Sheds location SOT.** Explicit `LOCATION_KIND` (USER_GPS /
   USER_APPROXIMATE / SEARCH_TARGET / MAP_CENTER); distinct user vs amber “Next”
   search marker; GPS jitter filter; opacity-only pulse; labeled FAB rail;
   sheets hide map chrome at z-index 2400.

### 2026-08-10 — Sheds commercial chrome + visual harness reliability (b20cf0f)

**Surface:** Sheds map field chrome + Product Board visual CDP harness  
**Production:** `b20cf0f` — gate **SUBSCRIBER READY** with screenshot_analysis +
dynamic_visual + commercial visual + production inspection evidence.

1. **Harness false fails.** Case-sensitive `"Today" in "TODAY’S SEARCH"` failed
   hierarchy checks while UI was fine; overflow:hidden sheet containers flagged
   as truncation; sticky Chrome `--user-data-dir` served stale `a193fa1` assets
   after deploy. Fix: case-insensitive Today+Confidence; truncate only visible
   copy / confidence-vs-peek; ephemeral profile + `Network.setCacheDisabled` +
   probe cache-bust query.
2. **Commercial chrome.** Horizontal labeled zoom pair; remove square FAB squash
   at ≤480px; raise mobile sheet peek so Confidence fits; legend max-width clears
   FAB rail; HUD drops duplicate accuracy/target lines (briefing owns next cue).
3. **Gate env.** `browser-smoke` (live-weather coldstart) needs `npm install` for
   root `ws`. Sheds-scoped axe on production `b20cf0f` returned 0 serious/critical.
4. **Do not** restore SUBSCRIBER READY from attestations alone — required visual
   evidence packages must green on the live build SHA.

### 2026-08-10 — SignalTerrain real-data pipeline (first production dashboard)

**Surface:** SignalTerrain Side Trails dashboard + cyber live engine  
**Goal:** Replace mockup-primary CTA with real read-only KEV / NVD / CISA advisory intelligence.

1. **Pipeline.** `signalterrain-cyber-live-engine` v1.4 writes `live.json`, `health.json`, and
   curated `dashboard.json`. Scheduled refresh via `.github/workflows/signalterrain-cyber-refresh.yml`
   (every 6h). KEV→NVD enrichment is rate-limited and optional-key-friendly.
2. **Honesty.** Panels use REAL / CACHED REAL / SOURCE UNAVAILABLE / NO CURRENT DATA. No fabricated
   threat level or world attack map. Failure retains last-known-good rather than wiping.
3. **Product entry.** Landing CTA is **OPEN SIGNALTERRAIN** → `side-trails/signalterrain/dashboard/`.
   Schematic threat/world maps removed from the landing primary story.
4. **Tests.** `automation/test-signalterrain-real-data-pipeline.mjs` rejects sample markers in the
   production ST data path and asserts KEV/NVD/advisory contracts.

### 2026-08-10 — SignalTerrain product reality (click-depth honesty)

**Surface:** Entire user-reachable SignalTerrain product path  
**Issue:** Real dashboard shipped, but deeper nav (app shell, explorer, advisor, brief, topics) reverted to sample/mock intelligence.

1. **Root cause.** Product nav and peer strips still pointed at sample-backed HTML/JS (`brief.html`, `advisor.html`, topics/graph/summary, explorer sample graph + world map layers, workspace silent sample fallback).
2. **Repair.** Nav/features → live dashboard + live.html panels; explorer/knowledge/workspace load `data/cyber/graph.json` only (teaching via `?teaching=1`); advisor/brief redirect to live unless teaching; world map is honest NO CURRENT DATA in live mode; mockups/teaching removed from ordinary product nav; archive section isolated.
3. **Gate.** `automation/test-signalterrain-click-depth.mjs` is the permanent depth 0–3 release gate.

## Lessons Learned — Design System 2.0 (2026-08-10)

- Prefer a single `--wp-*` semantic layer with `--wds-*` aliases over a parallel token file that drifts.
- Remap legacy neon names (`--wds-lime`) to muted accents so residual `var(--wds-lime)` call sites stop leaking lime without a mass rewrite.
- Product identity belongs on `[data-product]` accents drawn from one Southwestern palette — do not flatten apps to one accent.
- SignalTerrain/Global Signals may keep distinctive chrome; shared surfaces should still resolve through tokens so ST agents can adopt without fighting the shell.
- Replace hardcoded lime/navy hex fallbacks and Inter on major routes when migrating visual identity.

## Lessons Learned — Homepage front door (2026-08-10)

- `/` must be a studio front door; outdoor Dashboard belongs at `/apps/dashboard/` — do not boot `home-boot.js` on the root.
- When splitting Home from Dashboard, update `studioPrimaryNav` Dashboard href and shell `aria-current` so `/` does not mark Dashboard active.
- Mobile primary nav on the front door must not stack into a directory — prefer horizontal scroll over wrapping all architecture links.
- Smoke “studio app cards” can use a hidden gate mount; visible IA should stay editorial pathways, not identical SaaS cards.

## Lessons Learned — ONE APP + Dashboard instrument panel (2026-08-10)

- **ONE APP = ONE PRODUCT SURFACE:** app bodies are not mini Studio homepages; cross-product discovery stays in global nav. Document in `docs/APP-SURFACE-ARCHITECTURE.md` and gate with `test-app-surface-isolation.mjs`.
- Dashboard deepeners that promoted Scenes/Sheds/Articles/Side Trails violated the rule after Homepage became the portfolio door — strip them; keep only Dashboard-native briefing (Take).
- When `/` stops being Dashboard, update stale RC1 asserts (`detectApp /`, `dashboard.html` redirect, product-name Home) or they silently fight the architecture.
- Corrupt `$HOME` (e.g. HTML dumped into env) makes every `git` path resolve to ENAMETOOLONG — fix `HOME=/home/bryan` before blaming the repo.

## Lessons Learned — Dashboard depth attack (2026-08-11)

- A tile marked `live: false` never calls `buildWidgetPayload` — Alerts sat empty while OIP already fetched NWS. Wire `live: true` + adapter, or the catalog lies.
- Do not set `estimated = (dl.status === "live")` for daylight — that inverted honesty labels.
- Depth without forecast tiles cannot answer “what happens soon”; hourly precip/UV adapters from existing `weatherRef` beat inventing new providers.
- Derived tiles (Before you go / How it feels) must use trust `derived` and never coach (“you should”).
- Customize library filters need group headers when the catalog grows past a handful — otherwise Add Tile becomes a flat scroll.

## Lessons Learned — Dashboard visual refinement (2026-08-11)

- Enlarged UI icons read as generic widgets; field-guide SVGs with shared horizon/stroke and `viewBox="0 0 96 56"` read as one instrument panel when parked in negative space (`.wdb-r-widget__atmosphere`).
- Rainbow category outlines (`#4da3e0` / `#8fd14a` / full-card glow) fight Aubergine/Bone/Sand — map categories to muted `--wp-*` and drive presence via quiet borders + state `data-illum` washes instead.
- Document illustration / illumination / surface rules in `docs/DASHBOARD-VISUAL-LANGUAGE.md` so depth attacks do not reintroduce neon.

## Lessons Learned — Dashboard visual target (2026-08-11)

- Eliminating neon entirely made cards blend into aubergine — restore **crisp edge + soft outer diffusion** via `--wdb-r-glow` semantic domain colors (not RGB gaming hexes).
- Atmospheric SVG scenes behind data (with overlay) beat tiny line icons for outdoor instrument feel; keep art data-honest (alerts calm when clear; moon phase real).
- Mobile Customize must **omit** column controls entirely (not disabled 2/3) — phones are always one column; force `columns=1` in workspace + CSS.

## Lessons Learned — Dashboard cinematic atmospheric art (2026-08-11)

- Oval/ellipse cloud stacks read as placeholder UI; path-based cumulus + layered ridges/pines reads as field-guide landscape.
- Keep a reusable layer library (sky, ridges, terrain, pines, weather overlays) so Conditions/Air/Light/Astronomy stay coherent without photo payloads.
- Moon phases need mask-based terminator geometry — not a single offset circle for every phase.

## Lessons Learned — Dashboard refinement pass (2026-08-11)

- Sticky quiet chrome on iPhone makes the desktop primary-nav row float over Conditions when scrolling — keep dashboard header `position: relative` at ≤768.
- `max-width: 47.99rem` excludes 768px; one-column mobile must use `48rem` in CSS + `matchMedia` or tablet 2-up leaks onto iPad portrait.
- Aggressive right-shift/opacity for “text over art” can shove Astronomy’s moon disc off-canvas — carve an astronomy exception.
- Illumination % alone cannot choose waxing vs waning; pass `moonPhaseValue` (synodic fraction) into graphics for honest orientation.
- Uniform `0 0 16px/36px` glow reads as neon rectangles; corner radial washes + `--wdb-r-glow-strength` per domain keep luminous edges atmospheric.

## Lessons Learned — Dashboard Southwestern pastel + unique instrument art (2026-08-11)

- Recoloring the same alpine ridge + sun for every tile is not unique art. Conditions keep high-desert mesas; Light is a flat horizon; Air is receding haze planes; Moon is a close-up cratered disc; Wind is grass + directional flow; Precipitation is a probability curtain; Snow is winter drifts — not a tinted rain scene.
- Dashboard product tokens were muted purple on aubergine; `[data-product="dashboard"]` must override `--wp-bg` **and** `--wds-bg` (root `--wds-bg: var(--wp-bg)` computes on `:root` and will not follow a later `--wp-bg` change).
- Mobile art-shift that hides Astronomy’s moon also hides Light/Air/Wind/Precip subjects — carve those categories out of the aggressive right crop.
- Live adapters must pass precip probability/intensity and wind speed/direction into `render()` or the unique scenes cannot be data-honest.

## Lessons Learned — Moon/rain visual-gate ship (2026-08-12)

- Open-Meteo / Dashboard illumination is 0–100 percent: never treat `1` as a unit fraction or a 1% New Moon paints Full.
- Near-new pastel moons must not draw unmasked maria/crater ellipses — lit-path crescent only on a dark disc.
- Rain art must follow NOW probability/observed precip, not the 12-hour peak alone; 0–10% NOW ⇒ zero streak paths (`precip-dry`).
- After merge, confirm production serves `wds-dashboard-rebuild-graphics.js` with version `5.1.0-moon-rain-visual-gate` (Pages cache can lag briefly).

## Lessons Learned — Semi-realistic Dashboard field art (2026-08-12)

- Semi-realistic SVG art still needs distinct instrument subjects: mesa weather ≠ horizon light ≠ terrain haze ≠ lunar close-up.
- Moon surface detail must live inside the lit clipPath; never unmasked maria at 1–3% illumination.
- Soft solar bloom (blurred radials) reads more outdoor than a hard sun disc + ring icons.
- Air haze = irregular ridge silhouettes + particulate + far blur, not stacked ellipses.
- Keep precip NOW honesty while upgrading streak atmosphere; dry scenes still need depth without rain.

## Lessons Learned — Dashboard instrument intelligence (2026-08-12)

- Stale product-surface asserts (Outdoor OS CSS/title/nav) fail CI after Rebuild Home ships — update contracts to `wds-dashboard-rebuild.css` + `dashboardRebuild.mount`, do not weaken or delete.
- Before You Go must synthesize from evidence-backed signals; restating temp/precip/wind facts alone is OBSERVE, not DISCOVER/UNDERSTAND.
- Keep derived intelligence local and synchronous on the existing platform payload — no LLM, no extra fetches.
- Ordinary conditions must be allowed to yield **zero** noteworthy Happening Now signals; never manufacture interest.
- Contextual tool links hard-filter to live products with justified reasons (Scenes only today); leave Sheds/Forage dormant.

## Lessons Learned — Happening Now discovery layer (2026-08-12)

- Happening Now is a shell sibling between Today Outside and Workspace — not another instrument tile.
- Empty noteworthy list must render **no DOM** (hide entirely); filler empty states fight calm product feel.
- When exposing time windows, thread an explicit `now` through `fromPlatform` / `analyze` / shell paint so fixtures and sunset math stay aligned.
- Deduplicate BYO vs HN: discoveries own attention (precip/wind/air/light/astro); Before You Go keeps comfort/practical dress-for-outside prose.

## Lessons Learned — Dashboard instrument depth (2026-08-12)

- Prefer one in-tile disclosure pattern (Details + `aria-expanded`) over modals/side panels — least disruption to frozen layout and mobile one-column.
- Depth must add timing/trend/evidence/source, not enlarge the same glance facts; omit empty rows instead of dash grids.
- Feels-like and gusts earn visual weight only past small deltas (≥3°F / ≥4 mph); otherwise they clutter glance hierarchy.
- Keep optional instruments (`ph-comfort`, `ph-day-range`) in the catalog for saved layouts even when default experience absorbs or de-emphasizes them.
- Happening Now → `openWidget` should open depth on the related instrument so discovery connects to evidence without a new navigation model.

## Lessons Learned — Dashboard V1 visual finish (2026-08-13)

- Quiet Alerts and dry Rain must not reuse “light cloud” banks — weather-icon clouds read as placeholder UI; calm horizon + atmosphere communicates status without fabricating weather.
- Soft-edge SVG cloud families need *distinct* silhouettes (cirrus strokes vs soft cumulus variants vs stratus sheets vs storm anvil vs fog veils); one reusable blob stamps sameness.
- Next Hours art should encode upcoming transition subtly (`stable` / `clearing` / `clouds-building` / `rain-approaching` / `day-evening`) and never as tick-mark mini-infographics.
- Micro-type bumps belong only on secondary labels (family, WIND/HUMIDITY/PRECIP, Details) — enlarging everything flattens hierarchy.
- Art footprint ~right 30–40% with stronger left wash keeps text primary; quality-reference tiles (Air/UV/Light/Astronomy) may keep a slightly fuller plane.
- Moon geometry/illumination/waxing-waning must stay untouched in visual-finish passes — assert limb + lit-path gates separately from cloud work.
- Feature opportunities noted (not built): richer hours transition from solar altitude; optional per-instrument `data-art-span` wiring from registry; fixture-driven visual regression screenshots in CI.


## Lessons Learned — Scenes V1 product audit (2026-08-13)

- Production truth beats pillar slides: Scenes live spine is Photo Coach + Library + Hidden Landscapes/Animal Vision; journals/books/Year in Nature are absent (404), Living Scenes hub is placeholder while `waypoint-scenes` is a separate prototype.
- `/build-info.json` may 404 — confirm deploy via `<meta name="waypoint-build">` (here `b615963`). `/scenes/` skip-hub redirect to Coach diverges from hub IA.
- Parallel trees are normal debt: hub redirects + engine stubs under `apps/scenes/` vs real tools in sibling apps; audit which path production loads before planning rebuilds.
- “Demo” filenames can hide real on-device heuristic CV — treat trust labels and confidence gates as product risks, not as proof the feature is fake.
- Dashboard→Scenes links are navigational only today (no opportunity query params); outdoor context depends on ecosystem bridge sessionStorage, not the click.
- Headless Chrome screenshots need unrestricted network (or local server after curl SHA/route checks); sandboxed Chrome yields false `ERR_INTERNET_DISCONNECTED` artifacts.

## Lessons Learned — Photo Coach + Photo Library excellence (2026-08-13)

- Authoritative Coach path is `apps/photo-coach/` UI + `apps/waypoint-scenes/js/photo-coach*.js` (analysis filename still `*-demo.js`); ignore `apps/scenes/js/engines/*` stubs.
- Sharpness trust requires scene ambiguity gates (smooth sky/water, shallow DOF, low light) — Laplacian-on-downsample alone over-claims blur; soft language until CONF_SHARPNESS_CLAIM.
- Product confidence language should be HIGH / REASONABLE / LOW on every surfaced critique; omit weak issues rather than hedging in place.
- Shoot summary must prefer user Favorites/Keep labels over score-invented “favorite”; recurring patterns need count ≥ 2; progression only with EXIF timestamps.
- Library SoT handoff: carry `shootId`, narrative summary, outdoor context source, and `?shootId=` / `?libraryId=` deep links — do not duplicate blobs.
- Headless Chrome needs `--user-data-dir` inside the workspace (or `all` permissions); default unique profile dirs fail in restricted sandboxes.
- Empty-state “example preview” copy must match live hierarchy (Overall → What worked → What to watch → Next time) or audits read as product drift.

### Lessons Learned — Moving Scenes perception-before-motion (2026-08-15)

- Water false accepts were not a global-threshold problem: sky/fog/cloud-sea still hit 100% above 0.42. Multi-cue evidence + contradictions + class competition beat raising `AUTO_CONFIDENCE`.
- Analysis long-edge **320** (not full-res) is enough to lift fog off the ~8% floor and cut sky→water; 160 can still “pass” via no-motion while under-detecting fog.
- Prefer false no-motion over wrong animation: thin cool patches under dominant sky must stay below auto water even when connectivity looks coherent.
- Browser JPEG decode ≠ Pillow decode — treat Chrome Choice as the product truth; Node harness is a fast regression aid.
- Wildlife protect must not fire on dark rock or lily-pad mud; missing a robin is acceptable if nothing animates the animal.

## Lessons Learned — Scenes V1 Moving Scenes (2026-08-14)

- User-facing name is Moving Scenes; keep `living-scenes/` path as redirect alias — reckless renames break bookmarks and smoke routes.
- Do not ship waypoint-scenes overlay particles as the product: inventing rain/snow/fireflies fails “preserve the photograph.” Rebuild analysis into confidence-gated localized displacement instead.
- Waypoint Choice must be comfortable with NO MOTION FOUND; weak foliage/stars/parallax belong in deferred metadata, not mediocre auto animation.
- Non-destructive derivatives need a third role (`moving-scene`) and `moving-{id}-v{n}` blob keys — never reuse ORIGINAL or `edit-*` keys.
- Water heuristics fail if saturation caps are too tight or mid-frame lakes are excluded from `upperMid`; tune with fixture truth tests before shipping the class.
- `prefers-reduced-motion: reduce` means no autoplay — explicit Play only; Still|Moving compare stays the primary judgment UI.

## Lessons Learned — Scenes V1 Auto Edit ship follow-up (2026-08-14)

- CI smoke can fail with exit 2 (`Inspected target navigated or closed`) before page assertions — treat as transient CDP flake; one smoke retry is cheaper than a false red merge gate.
- Profile migration shows the same class of flake (exit 2 in ~7s); retry once with a fresh CDP port/profile dir.
- Local smoke false-fails if another project already owns `:8080` (Python “Error response” for `/apps/auto-edit/`); confirm server cwd before diagnosing product 404s.

## Lessons Learned — Scenes V1 Auto Edit (2026-08-13)

- Auto Edit must be a sibling craft step (finish), not a replacement for Moving Scenes; keep Living/Moving prototypes untouched and label Attack 3 honestly in Library.
- Non-destructive SoT: never reuse the original IDB media key; store `edit-{originalId}-v{n}` and link via `moduleRefs.autoEdit` + optional `role: waypoint-edit` sibling row.
- Waypoint Choice success is DO LESS on already-good files — different≠better; oversat greens/cyan skies need per-pixel restraint after global ops.
- Crop/straighten stays suggestion-only; subject-aware local edits defer without reliable on-device detection (no fake bokeh).
- Export from canvas pixels omits GPS by construction — say so in UI; filename `originalname-waypoint.jpg`.
- Reuse Library media IDB + Coach signal ideas; do not treat Hidden Landscapes creative remaps as photographic finishing.

### Lessons Learned — Moving Scenes REAL photo validation (2026-08-15)

- 160×100 analysis on multi-MP outdoor photos still drives Choice; real Sony/Panasonic/Olympus stills reproduce fog→water, cloud-sea→water 100%, and dry boardwalk→river false accepts — do not treat synthetic MOTION-QC as resolution-sufficient proof.
- Headless `exportLoop` + `renderer.play()` can record near-static WebMs; for motion evidence use production `renderAt(phase)` + `requestFrame` (or live UI) and keep phase 0 vs 0.5 stills.
- Fog confidence often floors ~8% on genuine fog; wildlife protect can miss a clear robin and false-trigger on dark rock — record, do not “fix” in a validation-only block.

### Lessons Learned — Scenes V1 Hidden Landscapes + Animal Vision (2026-08-16)

- EXPLORE is observation, not creative IR filters: retire false-color “infrared dream” modes from the production path; keep them dormant and teach UNAVAILABLE for UV/IR/thermal instead of inventing bands.
- Animal Vision belongs under Hidden Landscapes (`?pillar=animal`); redirect `/apps/animal-vision/` so Library → Explore stays one photograph journey.
- Ship deer + canine LMS dichromat simulations with citations; defer bee/bird UV as educational UNAVAILABLE — inventing nectar guides fails the RGB honesty gate harder than a missing species.
- Analytic defaults must bind to Original when a Waypoint Edit exists; label the source chip so edited tone/color never silently pose as capture values.
- Epistemic chips (MEASURED/COMPUTED/SIMULATED/INFERRED/UNAVAILABLE) plus labeled exports prevent “looks like a filter pack” trust failure on share.

### Lessons Learned — Hidden Landscapes photo-first discovery (2026-08-16)

- Honest science can still fail product feel if hierarchy is workstation-first: lead with photograph → lenses → observations → Why? disclosure; keep methods frozen behind progressive disclosure.
- Author CSS `display:flex` on chips overrides the UA `[hidden]` rule — always pair interactive panels with `[hidden] { display: none !important }` or they leak empty-state chrome.
- Scenes local nav: prefer wrap + shortLabels over `nowrap` + horizontal page scroll; rename “Other ways of seeing” to **Hidden Landscapes** so identity and overflow both improve.
- Show the decoded photo immediately on load (before analysis settles) so “Looking closely…” never blanks the light table.
- Keep `#hl-status` outside `#hl-workspace`: import/library/catalog failures call `setStatus` before a photo paints, and a `hidden` workspace swallows that live region.
- Deep-link `?pillar=animal` must run the same compare defaults as `onPillar` (desktop `side`, mobile `toggle`); setting pillar/view alone leaves the slider.


### Lessons Learned — Moving Scenes owner-review motion exports (2026-08-14)

- Empty `exports/`/`masks/`/`prod-validation/` meant prior owner ZIP could not support motion QC; regenerate via headless Chrome + as-shipped `ms-export.js` MediaRecorder (`automation/export-moving-scenes-owner-clips.mjs`), not by inventing clips.
- Fog/haze fixture folders may still produce playable WebM under other Choice classes when fog/haze confidence is below threshold — document honestly in MOTION-QC rather than forcing classes.
- CDP `Page.loadEventFired` is an event, not a callable method; poll module readiness instead. Force-exit after export writes because Chrome sockets keep Node alive.

## Lessons Learned — Deep Forest Dispatch content library (2026-08-16)

- DFD should be a first-class `/deep-forest-dispatch/` destination (Discover/Understand/Explore), not folded into curated RSS Articles or Side Trails experiments.
- Keep story JSON as source of truth + `scripts/dfd/render-stories.mjs` for crawlable HTML; adding Video #3 must be content/media + catalog + render, not new page engineering.
- `youtubeVideoId: null` must render a finished pending panel — never a broken embed; emit VideoObject JSON-LD only when a real ID exists.
- Preserve scientific caution (Lençóis rainfall ranges; do not overclaim clay/bedrock as sole lagoon mechanism) and imagery provenance (NASA public domain + labeled educational derivatives).

### Lessons Learned — Sheds 2.0 Phase 1 prediction + location truth (2026-08-24)

- Collapsed `priority` heat invited find-% misread even with disclaimers — split Timing / Habitat / Searchability / Evidence support and keep habitat heat empty when only season/weather exist.
- Weather multipliers and season shares must not paint spatial habitat; Today’s Search windows must exclude season (badge only) or searchability becomes cast theater.
- Map “jumps” were mostly layout `setView` storms + boot locate — prefer `invalidateSize` without resetView; recenter only on Locate / Recenter / Go to plan; preserve pan/zoom with `userPanned`.
- Dual dots were USER vs TARGET (plus accuracy ring) — permanent YOU/TARGET labels beat similar-scale circleMarkers alone.
- Async races need generation tokens on locate, weather, elevation, and recompute — abort alone is not enough when responses reorder.
- Planner without habitat signal must refuse; empty guidance is more trustworthy than decorative next-pocket geometry.
- Mid-latitude photoperiod heuristics can report the same Timing category across distant US sites on one date — document as coarse regional honesty, not a bug to “fix” with fake precision.
- Sticky `waypoint-sheds-gps-denied-v1` must not outrank live Permissions API `granted`/`prompt` — reconcile before skipping locate; never rewrite GPS failures into “manual exploring” success theater.
- Owner live validate (±~4.8 km browser accuracy): approximate labeling + empty habitat is a Phase 1 PASS; Phase 2 must not treat coarse YOU as fine-scale SEARCH LOCATION for GIS.


### Lessons Learned — Sheds 2.0 Phase 4 UX polish (2026-08-24)

- Architecture was already trustworthy after Phase 3; hunters still needed When/Where/Landscape/Today/Observations/Next hierarchy — not more GIS or weights.
- Demote Model weights / Validate / diagnostics into Advanced; promote Field Plan + Start/End Search into the primary field loop.
- First-run coach must be dismissible and local-persisted; map must remain usable without completing it.
- Calm offline copy (“live conditions unavailable; saved area and records still work”) beats tile/weather failure looking like total app death.
- Keep YOU ≠ SEARCH ≠ INSPECT ≠ OBS visually distinct with a short legend; never invent another location concept.
- Field validation protocol measures usability (time-to-Search-Area, wrong interpretations, degradation comprehension) — never shed-find counts; log stays empty until real walks.

### Lessons Learned — Sheds mobile visual QA polish (2026-08-24)

- Single-row session strip (`Search active | End Search`) recovers map height vs a stacked full-width End button; keep End Search flex-none so the label does not clip.
- `#sheds-map-shell:has(#search-prompt…)` presence offsets must outrank `html.sheds-session-active .sheds-here` (ID beats classes) or YOU/GPS chip sits on the SEARCH prompt.
- Expanded Field Briefing should hide dock/map-ctrls/legend with `:has([data-expanded=true])` so chrome does not show through the sheet.
- Prompt `right` clearance must exceed compact map-ctrl width; a 3–7px collision still reads as overlap on phone.

### Lessons Learned — Sheds final iPhone field validation (2026-08-24)

- Measure real wrapped SEARCH prompt height under safe-area sims (`--sheds-safe-top/bottom`); 390px wraps ~115px while ≤380px needs a taller `--sheds-prompt-stack` override — fixed rem offsets that look fine on one width fail the next.
- Raising Locate/End Search to ≥42px lengthens the session strip; bump `--sheds-mobile-strip-end` in the same change or you reintroduce 0–1px “kiss” overlaps.
- Prefer naming Map & layers in the More lede over restoring a permanent Leaflet MAP control — keeps the map clean while fixing first-time discoverability.
- Desktop `prompt×here` stacking is a separate layout; do not “fix” it during mobile clearance work unless the mobile CSS regresses it.

### Lessons Learned — Sheds V3.1 mapping foundation (2026-08-24)

- Esri World Imagery fits the existing World Topo host family; Hybrid must be imagery + Esri reference labels as a LayerGroup — not a brittle multi-CDN mashup.
- Measure/Inspect must short-circuit map clicks ahead of SEARCH so field tools never steal intentional search placement.
- Do not scrape imagery into offline packs under public ArcGIS tile URLs — offline needs a licensed export path (see SHEDS-V3-OFFLINE-MAP-ARCHITECTURE.md).
- DeviceOrientation compass is not “just add a needle”; defer until permission + stationary honesty are solved; GPS course + inspect bearings are enough for V3.1.

### Lessons Learned — Sheds V3.1 hostile acceptance (2026-08-24)

- SEARCH placement debounce (450ms) must **not** apply to Measure/Inspect — field users tap vertices faster than that; use a short double-fire guard only.
- Hybrid reliability belongs on imagery, not reference labels — label tile failure must not paint the whole basemap “degraded.”
- `window` `offline` events do not flip `navigator.onLine` in Chromium CDP; stub `onLine` (or Network conditions) when validating offline elevation honesty.
- Desktop `prompt×here` remains a known deferred layout; classify as WARN in mobile-field acceptance, not a V3.1 hold unless owners expand scope.

### Lessons Learned — Product direction reconciliation (2026-08-25)

- One canonical file (`docs/PRODUCT-DIRECTION.md`) beats five conflicting roadmaps; point STRATEGIC-DIRECTION / README / MASTER roadmap at it instead of rewriting history in place.
- Retiring OpenRoad publicly means homepage + about + catalog status + honest retired page — not necessarily deleting GIS experiments.
- Side Trails stays in primary nav as **archive**, not as a promise of sister flagships; update gates that required “Experimental” sister marketing.
- Preserve DFD/articles pipelines as Publishing infrastructure; do not delete them while simplifying the consumer portfolio to Dashboard · Scenes · Sheds.

### Lessons Learned — Dashboard Discover v1 (2026-08-25)

- Discover hierarchy: Ranked Happening Now = Right Now; quiet days need a **separate** strip (`data-wdb-r-discover-quiet`) so existing “no HN DOM” contracts stay true.
- Waypoint’s Take must prefer live `beforeYouGo.brief` and label editorial fallback — never imply dynamic detection without evidence.
- Today Outside should show provider provenance + optional editorial season; do not promote content-bundle wildlife lists as live discoveries.
- Contact-platform scans must skip `.worktrees` / `.tmp-*` or obsolete docs in worktrees create false failures for the incorrect `.studio` mailbox; mailbox source of truth remains `contact@waypointstudio.org`.
- Prefer depth over widget count; contextual Sheds stays dormant until a justified go signal exists.

### Lessons Learned — Sheds V3.2 Inspect Field Intelligence (2026-08-25)

- Inspect is the right doorway for landscape reading: enrich the existing HUD rather than adding a GIS control tower.
- Derive aspect from Open-Meteo neighborhood elevations when packs lack aspect rasters; label solar notes as physical geography, never bedding claims.
- Confidence labels must key off **input presence** (elev / slope-aspect / habitat), not invented certainty.
- Keep Inspect scrollable + Done on mobile so the map stays the primary surface.
- A full V3.2 roadmap run can stall on leftover headless Chrome/CDP servers and SHA-updating the acceptance report. Recover by classifying existing commits, finishing **one** slice, and stopping.
- Inspect Intelligence HUD must separate FACT (Terrain/Habitat) from INTERPRETATION (Why) from LIMITATION. Habitat suitability bands must not be phrased as wildlife presence.

### Lessons Learned — Sheds V3.2 Inspect Facts (2026-08-26)

- Inspect Facts is not Inspect Intelligence: omit “Why this may matter,” solar notes, walkability, and `HabitatGis.scorePoint` from the HUD so Inspect stays a readout, not a prediction.
- Zero and flat measurements (`0 ft`, `0°`, edge `0 m`) must not share copy with unavailable or failed fetches; aspect on slope &lt; 2° is **not defined**, not north.
- Do not SHA-chase the V3.2 acceptance report after the feature commit — that loop stalled the previous recovery pass.

### Lessons Learned — Sheds V3.2 Inspect Why (2026-08-26)

- Why this may matter must be a pure function of supported facts (`buildWhyLines`); missing slope/aspect/edge must not mint solar, walkability, or “nearby edge” copy.
- Prefer inspection language (“change in cover can be worth inspecting”) over animal behavior. Label the nearby-edge line `EDITORIAL_HEURISTIC`.
- Keep Limits visible whenever Why is shown: context can help you decide where to look more closely; it does not indicate deer or sheds are present.

### Lessons Learned — Sheds V3.2 Inspect field UX (2026-08-26)

- Stay in Inspect until Done: clearing `inspectArmed` after the first tap made the next tap set SEARCH and brought the SEARCH prompt back over the HUD.
- Progressive disclosure (facts first, Why/Limits behind a 44px summary) keeps the map dominant on 375–430 without deleting intelligence.
- After each inspect tap, pan the marker below the HUD so the inspected point stays visible beside locate/zoom.
- Hiding `#search-prompt` is not enough: Field Briefing peek still said “Choose a Search Area” / “tap the map to inspect.” Hide `#plan-card` while `.is-inspecting` and zero `--sheds-sheet-peek` so SEARCH copy does not compete.

### Lessons Learned — Side Trails reconcile around Waypoint Deck (2026-08-25)

- Public Side Trails must feature **Waypoint Deck** as the active independent trail; archived ST/GS/OpenRoad stay subordinate — never peers of Deck or Studio flagships.
- Distinguish **planned / exploring** Deck language from shipping claims; Global Signals concepts may feed Deck SA later without being a standalone product.
- Article `relatedProducts` must not promote paused/retired apps (Fieldry, OpenRoad, Savant, Cyber, GS); filter at generation and in the feed renderer.
- Keep `homeSideTrails` aligned with portfolio truth (`waypoint-deck`), not leftover SignalTerrain/Global Signals IDs from older IA moves.

### Lessons Learned — Scenes + Publishing unification (2026-08-25)

- Publishing is infrastructure; Deep Forest Dispatch stays an **editorial series**, not a fourth flagship — say so on the library page.
- Deterministic `content-relationships.json` + `publishingMatch` beats embeddings; **no match is the correct outcome** for most Dashboard days.
- Condition→story rules must be labeled editorial (e.g. quiet-humid-cool → valley fog is not a fog forecast).
- `/scenes/` should land on the Scenes hub; skipping to Photo Coach hid Explore & Understand + Publishing joins.
- Re-render DFD stories after connection template changes (`node scripts/dfd/render-stories.mjs`) so Watch/Articles joins ship statically.

### Lessons Learned — Sheds mobile field chrome (2026-08-24)

- Shrinking the desktop right-rail FABs on narrow widths still left a “control tower”; phones need map-critical controls (locate/zoom) separated from a bottom **Search | Note | Plan | More** dock.
- Session strip + YOU chip + header chips collide unless the strip becomes a full-width stack and `sheds-session-active` pushes presence chrome down.
- Outdoor-readability `.sheds-fab { background… }` after `.sheds-fab--primary` made Locate look disabled — re-assert primary contrast after that block.
- Collapsed Field Briefing peek (~8rem) plus legend ate the map; peek should show kicker+glance only (~4.5rem) with expand for the rest; landscape legend should collapse to a chip on mobile.

### Lessons Learned — Discover quiet strip live-weather gate (2026-08-26)

- Gate `data-wdb-r-discover-quiet` on live (non-placeholder) `weatherRef`, not a truthy platform object. OIP `onChange` / `setPlatform` can apply packages whose weather is still a placeholder; Intel then skips weather so HN stays empty, and “Live instruments / honest weather” copy would be false while Today is still waiting.

### Lessons Learned — Discover seasonal honesty + natural events (2026-08-26)

- Editorial content-bundle `season` / `phenologyStage` without `weekOf` / `editorialValidUntil` will leak into Discover as current truth. Calendar season must be computed from date + hemisphere; phenology must expire or be omitted.
- Do not “fix” stale copy by rewriting late spring → late summer. The failure mode is unguarded editorial overlay.
- Quiet weather is not quiet Discover. Natural events (eclipse horizon ~72h) must un-quiet the day even when Happening Now is empty.
- Event times stay in UTC in the catalog and convert at display time. Defaulting display to UTC makes a Thursday-night PA eclipse look like Friday morning.
- Clock-only editorial sunrise/sunset (`05:42`) is a seasonal snapshot, not a live clock — never use it as a weather fallback.

### Lessons Learned — Smoke CDP vs redirect stubs (2026-08-26)

- Headless smoke walks many `location.replace` stubs (`dashboard.html`, `scenes/photo-coach`, etc.). `Runtime.evaluate` during that navigation returns **Inspected target navigated or closed**. Treating that as a runner crash skips every later CI step, including Discover correctness.
- Retry evaluate until the destination document exists. Keep suite-level retry for dead WebSocket / missing CDP targets. Do not skip Discover tests when smoke fails.

### Lessons Learned — Discover catalog retry, honest quiet, eclipse boxes (2026-08-26)

- A memoized `loadPromise` that survives HTTP/JSON/network failure permanently omits events for the page session. Clear the promise on failure (and in `setCatalog`) so later `loadCatalog` / hydrate paints can retry.
- Quiet Discover copy that names natural events must not render while the events catalog is unknown (in-flight or failed). Empty event HTML is not a confirmed empty catalog.
- Region-box visibility is a hard gate before lifecycle. Boxes must cover the catalog’s own visibility summary (eastern Pacific / Hawaii / Alaska), not only contiguous-Americas longitudes.

### Lessons Learned — Public portfolio reconciliation (2026-08-27)

- With only Deck remaining, a Side Trails collection page becomes a graveyard. Put **Deck** in primary nav; keep `/side-trails/waypoint-deck/` as the canonical URL; make `/side-trails/` a silent redirect. Do not keep archive cards “so the section has something.”
- GitHub Pages has no real HTTP redirects. Silent public retirement is `noindex` + canonical + meta refresh + `location.replace`, with **no** retired-product copy on the page.
- Preserve engineering (JS, GIS, scoring, radio concepts) under `apps/*` and `design-system/js/*`; remove public **identity** and sitemap/nav promotion.
- iPhone header overlap: aurora-bridge wrapped `.was-primary-nav` onto a second sticky row (`order: 3; flex: 1 1 100%`). Homepage-only compact nav left About/Support/Deck colliding. Fix the **shared** header with a one-row bar + opaque overlay menu — not per-device padding. A dropdown (`top: 100%`) is not enough: cinematic heroes still show through; the open menu must be a full-viewport opaque overlay (`position: fixed; inset: 0; background: #1a141c`).
- Tests that required Side Trails / Archive / Incubator catalogs encode obsolete IA. Update them to the five-effort portfolio; do not delete coverage.
- Dashboard quiet-chrome `@media (max-width: 48rem)` still tried to wrap `.was-primary-nav` (`padding: 0; flex: 1 1 auto`). That zeroed overlay padding so the current link sat in the header. Neutralize those wrap rules; keep the shared overlay.
- Quiet chrome’s always-on `.was-global--quiet .was-primary-nav { justify-content: flex-end }` is 0,2,0 and beats the mobile overlay’s `.was-primary-nav { justify-content: flex-start }` (0,1,0). Open Dashboard (and other quiet) menus then pin links to the bottom of the viewport. Re-assert `flex-start` on quiet + dashboard overlay selectors inside the same `@media (max-width: 900px)` block.
- Product headers that set `backdrop-filter` (Scenes / Sheds) turn the sticky bar into a containing block. `position: fixed; inset: 0` then only covers the header (~94px) and links sit in a clipped row. Drop `backdrop-filter` (and hide `.was-global__actions`) while the overlay is open.
- Articles filter chips sit in a grid item whose `min-width: auto` is the chips’ max-content (one nowrap row). `flex-wrap: wrap` never triggers, so the page grows (~496px at a 390 viewport) and hero copy clips. Bound `.waf-toolbar` / `.waf-views` with `min-width: 0; max-width: 100%`.
- `.wcs-page` is a column flex item of `.was-shell` with `margin: 0 auto`. Auto side margins disable stretch, so the main sizes to chip min-content (~491px) while `html/body { overflow-x: clip }` hides the overflow. Set `width: 100%; min-width: 0` on `.wcs-page`.
- Silent redirects are not enough: Dashboard wildlife intel and the observation ledger still interpolated **Fieldry** / **ForageCast** from leftover `localStorage`. Relabel rendered copy and hrefs; keep the stores. Scan `wds.js` runtime modules for quoted discontinued identity, not just HTML shells.

### Lessons Learned — Shed Hunting V1.3 Where should I look? (2026-08-31)

- Search Areas is a **terrain search-priority** overlay, not a second habitat model. Keep RAW slope/aspect, derived features (bench/transition/steep), and Higher/Moderate/Lower interpretation in one pure module. Today’s Hunt may add notes only; it must not rewrite base priority or lift an outside-season day.
- Missing elevation or coarse zoom is **unavailable / zoom in**, never a silent Moderate fill. Open-Meteo neighborhood samples plus a small halo grid are enough; do not add a paid DEM vendor.
- Give Search Areas its own abort controller. Reusing the habitat elevation abort cancels landscape scoring when the hunter pans with the overlay on.
- Inspect compact HUD is V1.3 search priority; V3.2 “What is here / Why this may matter” stays in More detail so existing explainability tests remain the contract.
- In a shed-hunting product, never use **shed** as a verb for snowmelt (“may shed lingering snow”). Hunters can read that as antler drop. Say the ground can **lose lingering snow**.

### Lessons Learned — Shed Hunting V1.5 Hunt Plans (2026-09-01)

- Hunt Plan (`waypoint-sheds-hunt-plans-v1`) is an intended search sequence of Scout Spot **ids**. It is not Field Plan (Start Search), not a route, and not Scout Spot status. Changing Planned / Active / Completed must not rewrite Plan / Checked / Revisit.
- Do not draw a connecting polyline. Numbered diamonds while a plan is open are sequence, not a travel path. Straight-line distance is optional and must be labeled as such.
- Plan-card Today is **live** session hunt context. Do not copy it onto Scout Spot `savedToday`, and do not present it as conditions from plan creation. A centroid of Scout Spots is not weather at every point.
- Import at the 40-plan cap must skip extra **new** ids and count them as skipped (same honesty lesson as V1.4 Scout Spots). Missing Scout Spot ids stay listed as unavailable; do not fabricate Scout Spots.
- Keep Hunt Plans vs Field Plan naming distinct in More. V1.5 is Hunt Plans.

### Lessons Learned — Shed Hunting V1.7 Hunt Track & Observations (2026-09-02)

- Shed Hunting versions follow `docs/sheds/SHEDS-PRODUCT-ROADMAP.md`. The flagship V2.x Sheds+ feature is a **dynamic shifting search-priority map** — not an antler-location predictor. Do not implement it in V1.7. Do not treat private Hunt Tracks as licensable B2B data.
- Do not stuff a GPS array into the V1.6 Hunt Session. Keep `waypoint-sheds-hunt-session-v1` as workflow state; persist live track + observations on `waypoint-sheds-hunt-activity-v1` and finished hunts on `waypoint-sheds-hunt-records-v1`.
- Finish Hunt must persist the Hunt Record **before** clearing the session. If localStorage quota fails, show the error and leave the hunt active — never silently discard a finished walk.
- Filtering GPS must drop impossible/jitter/teleport samples, not smooth a fictional route. Searched distance is a haversine of accepted points, not a trail or recommended route. Duration uses `startedAt` timestamps.
- Observations without a valid location still save. Shed Found is user-reported evidence, not Search Priority and not a prediction. Do not export the transient Hunt Session or in-progress activity in field JSON.

### Lessons Learned — Shed Hunting V1.9 Condition Snapshots (2026-09-03)

- Capture one Condition Snapshot around hunt start. Do not refetch at finish. Do not invent coordinates from map center. If GPS is missing, store `no-location` and retry once on the first accepted track point.
- Weather failure must never block Start Hunt, observations, or Finish Hunt. Write an unavailable snapshot so V1.9 records are not mistaken for pre-V1.9 legacy records.
- An in-flight hunt-start weather callback must bind `sessionId` + `huntRecordId`. Finish Hunt is non-blocking and clears activity; applying Hunt A’s snapshot (or failure) onto Hunt B invents the next walk’s conditions.
- Device GPS altitude must be stored from `applyUserPosition` (`state.userPosition` / `latlng.alt`). Hunt-start terrain cannot read a field the locate path never writes.
- Keep snow depth, snowfall, SWE, and freeze/thaw distinct. Missing `snow_depth` is unavailable — never fill it from `snowfall_sum` / legacy `snowMm` (cm of snowfall, not depth).
- `parseForecast` defaults `snowMm` to `0` when `snowfall_sum` is absent. Put `snowfallKnown: false` on that package so `factsFromWeather` does not treat the default as measured 0 cm snowfall.
- Reuse `WaypointShedsWeather.fetchForecast` with a timeout and a 10-minute lat/lng de-dupe. Reuse Today’s Hunt weather only when it was GPS-anchored and within ~1.1 km. Never attach map-center weather to a Hunt Record.
- Search Areas `evaluateGrid` already ranks **per-cell terrain**. Today’s Hunt weather is one point and is excluded from cell priority. V2.0 still needs a spatial condition layer; V1.9 must not collapse that into one hunt-wide score.
- Keep localStorage. A compact snapshot is ~1.6 KB; a maximum hunt is ~189 KB stored. 24 maximum hunts plus GIS pack leave a thin ~0.4 MB origin margin. Retry quota writes by dropping oldest finished records — never the hunt being saved. IndexedDB waits for photos, offline tiles, or quota failure after that eviction path.
- Provenance is a product requirement. Document third-party datasets with UNVERIFIED where commercial/redistribution rights are not confirmed. Do not assume “accessible” means resellable.

### Lessons Learned — Shed Hunting V1.8 Hunt History (2026-09-03)

- Hunt History reads `waypoint-sheds-hunt-records-v1`. Do not invent a parallel history store. Newest-first, honest unavailable/zero/no-track states, and an empty state that is not an error.
- Historical tracks are **search history**, visually subordinate to the live Field Hunt track. Multiple tracks are allowed. Do not blur them into a heat map or imply searched areas have fewer or more sheds.
- V1.8 kept localStorage. Raising the finished-record cap from 12 to 24 is enough for a History UI; IndexedDB waits for photos, offline tiles, quota failure, or multi-season product need. Never silently drop V1.4–V1.7 private data.
- Individual Hunt Record delete is confirm-only and must not delete Scout Spots or Hunt Plans. Facts stay separate from future derived intelligence — no heat scores on Hunt Records.
- Keep data classes distinct: third-party licensed sources, Sheds-derived intelligence, private user field data, and future explicit opt-in aggregation. Private hunter GPS is not a B2B dataset.

### Lessons Learned — Shed Hunting V1.6 Field Hunt Mode (2026-09-01)

- A Hunt Session (`waypoint-sheds-hunt-session-v1`) is **workflow state**, not field data. Do not export it in `sheds-field-private.json`. Scout Spot status/notes stay on `waypoint-sheds-scout-spots-v1`; do not duplicate terrain or saved Today into the session.
- Start Hunt / Finish Hunt must not auto-set Hunt Plan Completed or rewrite Scout Spot status. GPS proximity must never mark Checked. Location-unavailable is a valid Field Hunt Mode; do not invent distance as 0.
- Field HUD must stay compact so the map remains the primary surface. Resume on reload; orphaned sessions (deleted Hunt Plan) end honestly.

### Lessons Learned — Shed Hunting V1.4 Scout Spots (2026-08-31)

- Scout Spots are **field-planning pins**, not observations. Keep them in `waypoint-sheds-scout-spots-v1` so Import JSON can merge them without turning a candidate location into a recorded sighting.
- Persist `{ schemaVersion, scoutSpots }` and still read a legacy bare array. Missing terrain or Today at save time is unavailable — never Moderate, never today’s weather.
- Saved Today is a **historical snapshot**. Label it Saved context vs Today. Live hunt may refresh the open card; it must not rewrite the stored band.
- On 320–430, Inspect Save and Scout Done must stay reachable (sticky footer / sticky head). Markers stay subordinate diamonds; do not cluster in V1.4.
- Import at the 120 cap must skip extra **new** ids and count them as skipped. `persist()` slicing after merge can drop those extras while still reporting `added`. Same-id replace must not wipe an available local terrain/Today snapshot with an empty import.

### Lessons Learned — Shed Hunting V1.2 Today’s Hunt intelligence (2026-08-31)

- Open-Meteo `snow_depth` is hourly/current **meters**. `snowfall_sum` is **cm of snowfall**, not SWE and not depth. Missing `snow_depth` is not zero; explicit `0.0` is known bare ground. Never copy `snowfall_sum` into depth.
- A 1 °C freeze/thaw deadband is enough given 0.1 °C precision. Tiny crossings of 0 °C are `near_freezing`, not a cycle.
- Prefer a 48 h temperature lookback when hourly data spans it; keep the V1.1 2 °C threshold and fall back to 24 h. Status `little_change` is the honest “relatively stable” label.
- Freeze/thaw and snow-cover refine Today’s Hunt extras/caps. They must not lift an **outside** season day off Low, and they must not invent Very good without V1.1 location + usable weather gates.

### Lessons Learned — Shed Hunting V1.1 Today’s Hunt (2026-08-30)

- The dedicated-host overview can ask “Should I go shed hunting today?” and still fail to answer it if Today’s Search lives only on the map and “Today’s conditions” points at Studio Dashboard. Compose TIMING + SEARCHABILITY + weather trend on the overview; keep channels separate; do not ship a 0–100 find score.
- Missing location or weather is **unknown**, not Low. Low means we assessed today and opportunity is poor. Use Need location / Not rated until eligible.
- The public band is an **overall shed-hunt recommendation**. Outside the regional window stays Low even if walking weather is fine; season and weather remain separate explainable inputs.
- Hourly `temperature_2m` was already fetched and unused. A documented 2 °C day-to-day threshold is enough for Warming / Cooling / Little change. Do not add `snow_depth` or treat SWE as depth.
- Very good must be gated on weather + a real location. Missing either, or a zoom-6 Midwest overview center, must not produce a confident hunt band.
- Do not send “Today’s conditions” to Dashboard on the dedicated host. Nav may still link Dashboard as Powered-by-Waypoint chrome.
- The map session strip uses `display: flex`, which overrides the HTML `hidden` attribute. Without `[hidden] { display: none !important }`, “Search active” shows when no search is running.

### Lessons Learned — Shed Hunting Phase 3C Studio cutover (2026-08-30)

- GitHub Pages still has no HTTP 301/308. Alias routes (`/map/`, `/sheds/`) can use meta refresh + `location.replace` + canonical + visible fallback. The **map HTML** is also the dedicated-host `/map/` document, so a `content=0` meta refresh there would loop on shedhunting.org. Use hostname/`data-shed-host`/`?local=1`/`loopback` guards instead.
- Skip loopback in the product helper so CI smoke and local `python3 -m http.server` still exercise the map. Alias pages pass `forcePublic` so `/map/` and `/sheds/` still cut over locally.
- `copyDir` must not copy Studio `apps/shed-hunting/index.html` into `dist/shedhunting/` (design-system traversal). Host overview comes from `host/index.html`.
- Do not republish `sheds-site` from a Studio-only cutover. Source generate can flip host robots/canonical for the *next* publish.
- When stripping Studio-only cutover chrome from the dedicated-host map, remove the **entire** `<div id="sheds-studio-cutover">…</div>` plus the following `showFallback` script with an exact match. A replace of `id="…"…</div>` leaves `<div `, the next `<script>` is parsed as attributes, and cutover JavaScript renders as visible text on `/map/`. A non-greedy `[\s\S]*?showFallback` script replace starts at the earlier head `redirectLegacyStudio` IIFE and deletes `</head>`, CSS, and the skip link.
- Do not run `publish-shed-hunting-host.mjs` for a metadata-only republish: it force-moves `legacy-terrain-intelligence-2026-03-10`. Replace files in an existing `sheds-site` checkout, keep `CNAME`, `--ff-only` pull, no tag rewrite, no force-push.
- `?local=1` is the Class B export hatch on Studio, but overview CTAs (`map/`) and the map brand (`../`) drop the query. The fallback `map/?local=1` link is hidden whenever `shouldStay()` is already true, so hatch users have no in-UI path that keeps Studio `localStorage`. Preserve the flag on those in-app hrefs at runtime — do not hardcode it on the shared map HTML (copied to shedhunting.org).

### Lessons Learned — Shed Hunting Street tiles (2026-08-29)

- Unauthenticated `basemaps.cartocdn.com` Voyager/Positron tiles are real maps with an **API KEY REQUIRED** watermark burned in (HTTP 200). Esri World Street / Topo / Imagery do not. Do not require a GitHub secret to ship Street.
- Cloud Agent “All repositories” on the GitHub App does not expand an already-minted token. `/installation/repositories` still showed `selected` / `waypoint-studio` only after the App change; `cursor[bot]` 403 on `sheds-site` push --dry-run.

### Lessons Learned — Shed Hunting Phase 3B resume recheck (2026-08-29)

- Owner-side “secrets were added” is not enough unless this agent can **use** them. GitHub App installation was still `selected` / `waypoint-studio` only (`cursor[bot]` 403 on `sheds-site`). `SHEDHUNTING_DEPLOY_TOKEN` and `WAYPOINT_MAP_TILE_CONFIG` were unset in the agent env. Actions secrets cannot be listed (403) and `shedhunting-host.yml` is not on `main`, so `workflow_dispatch` 404s.
- Latest Studio Pages run dumped `WAYPOINT_MAP_TILE_CONFIG:` as empty (not redacted). An empty Actions secret is the same as missing: do not publish. Stop, do not ship watermarked CARTO tiles.

### Lessons Learned — Shed Hunting Phase 3B sheds-site recovery (2026-08-29)

- Reuse `bfree7885/sheds-site` (it already has `cname: shedhunting.org`). Do not create `bfree7885/shedhunting.org`. Keep Studio `CNAME` as `waypointstudio.org`.
- Do not switch that repo to Actions Pages: Actions ignores the `CNAME` file. Stay on branch `main` / root.
- Do not overwrite the live domain from an environment that cannot push. Unauthenticated CARTO Voyager tiles paint **API KEY REQUIRED**. Default Street to Esri World Street Map; treat `WAYPOINT_MAP_TILE_CONFIG` as an optional overlay. Publisher must check the effective Street URL, not whether some JSON exists.
- Shallow replace commits are fine; do not force-push. Tag `238cbe15` before replacing.

### Lessons Learned — Shed Hunting Phase 3B custom domain (2026-08-29)

- Do not attach `shedhunting.org` until `https://bfree7885.github.io/shedhunting.org/` returns the dedicated host. A 404 github.io means stop.
- Apex A records can already be GitHub Pages IPs while the **wrong** Pages project (`sheds-site`) still owns the custom domain. Moving the domain is a GitHub Pages setting change plus removing the old CNAME, not necessarily a registrar A rewrite. Preserve MX/SPF.
- Actions-based Pages ignores a repo `CNAME` file; set the custom domain in Pages settings. Branch-based Pages still uses the file.
- Never put `shedhunting.org` in this repo’s `CNAME` (that file is `waypointstudio.org`).
- Canonical/OG/sitemap on the dedicated host wait until HTTPS is valid on the new host. Flag flip and Studio redirects are Phase 3C.

### Lessons Learned — Shed Hunting Phase 3A companion host (2026-08-29)

- GitHub App installations for Cloud Agents often include only the source repo. A companion Pages repo (`shedhunting.org`) must be created by the owner and granted to the App (or a PAT secret) before `publish-shed-hunting-host.mjs` can push. Do not reuse `sheds-site` (it already has a `shedhunting.org` CNAME).
- Dedicated-host HTML must rewrite `data-powered-by-waypoint` to `studioOrigin` at generate time, not only at runtime. `href="/"` on the new host is the Shed overview, not Waypoint.

### Lessons Learned — Shed Hunting Phase 2 host preparation (2026-08-29)

- GitHub Pages allows **one custom domain per project**. Dedicated `shedhunting.org` needs a companion Pages site + generated `dist/shedhunting/` from this repo — not a second CNAME on the Studio project and not a product rewrite.
- Map `../../../design-system` traversal cannot survive a host-root `/map/` URL. Vendor a **small** WDS subset (`wds-experience-v2.css` + origin helper); keep production overview on the Studio shell.
- `shedDedicatedHostEnabled` must stay false until the destination exists. Centralize hostname policy; do not scatter `shedhunting.org` checks.
- New origin = empty localStorage. Class B field data (observations, sessions, areas) already has Export JSON; Phase 3A adds merge-by-id Import JSON. Plan DNS/flag flip separately from hosting.
- `/map/` on Studio is already the Sheds map. Document the conflict before any cutover redirect; do not assume it is a free Studio route.
- Contact may still list Scenes as a support category while Scenes stays unpublished in discovery. Those are different surfaces.

### Lessons Learned — Shed Hunting public architecture Phase 1 (2026-08-29)

- Public architecture is **Dashboard = Waypoint Studio**, **Shed Hunting = sibling**, Deck and Publishing public, **Scenes unpublished**. Do not restore Dashboard · Scenes · Sheds as equal Studio apps.
- Same-origin only until `shedhunting.org` has a working destination. Print the identity as words; do not create broken external hrefs.
- Shed Hunting public landing is `/apps/shed-hunting/` (Should I go today?). Map `/apps/shed-hunting/map/` is the field interface. Keep engines, storage keys, and module names.
- Unpublish unpublished products with `noindex` + robots Disallow + nav/sitemap/CTA removal. Do not 404 working URLs.
- Tests that encoded the old trio are the architecture contract — update them to the new public set; do not delete coverage.
- Free/Pro is documentation only. Do not paywall working map/likelihood tools. Honesty language stays likelihood / opportunity / habitat interest — never antler presence.

### Lessons Learned — Dusk-desert palette production gate (2026-08-28)

- `wds.css` already `@import`s `wds-app-shell.css`. A second `<link>` after the bundle reloads shell *after* experience-v2 and is a real duplicate, not a required cascade. Dashboard, homepage, and contact should match About: one `wds.css` bundle.
- Experience-v2 tests that required Dashboard `wds-dashboard-home.css` encoded the homepage-era CSS graph. Discover uses `wds-dashboard-rebuild.css`; experience still arrives via `wds.css`. Update the assertion; do not reintroduce the old bundle.
- Sheds map skip is `.sheds-skip` (immersive-map alias in experience-v2), not `.wds-skip`. Keep skip-link coverage under the intentional class name.
- Sage `#73806A` is ~4.4:1 on charcoal. Leave the master token for accents. If `--wp-warm` is sage on Sheds, shared `a { color: var(--wds-warm) }` paints in-page links sage — override that semantic use (Take sources) to terracotta rather than brightening all sage.


