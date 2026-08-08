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

Append new engineering lessons after every work block so the playbook
continuously improves.

### 2026-08-07 — Sheds + SignalTerrain readiness prep (no merge)

**Artifact:** `docs/releases/sheds-signalterrain-readiness-owner-review.md`  
**Branch:** `release/sheds-signalterrain-readiness`

1. **Parallel feature tips may be empty while WIP lives only as uncommitted worktree files** — re-fetch remotes *and* inspect sibling worktrees before declaring a feature missing.
2. **Direct product entry beats hub pages** — `/apps/signalterrain/` → live cyber (and homepage ST card → live) removes the catalog maze without redesigning Studio.
3. **Keep Experimental when freshness/ops are incomplete** — ST can be discoverable under Side Trails while live.json timestamps remain honest and refresh lands separately.
4. **Cherry-pick finished outdoor features onto a prep branch** (Today’s Search `506fb85`) rather than waiting for a large discovery merge when the owner asked only to prepare, not merge.

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

