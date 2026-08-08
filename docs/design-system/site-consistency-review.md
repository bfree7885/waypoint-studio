# Site design-system consistency review

**Branch:** `feature/design-system-site-consistency`  
**Base:** `origin/main` @ `1245c7c`  
**Date:** 2026-08-08  
**Goal:** Users should never feel they entered an older application when moving between Studio surfaces. No branding redesign; smallest shared WDS fixes.

## Canonical baseline (newest WDS)

| Layer | Source of truth |
|-------|-----------------|
| Tokens | `design-system/css/wds-tokens.css` — navy surfaces, lime accent, purple warm |
| CSS entry | `design-system/css/wds.css` (imports tokens, components, **app shell**) |
| Shell | `.wds-app.was-shell` + `data-wds-app-shell` + `wds-app-shell.js` / `wds.js` |
| Type | Cormorant Garamond (display) + Inter (body) |
| Buttons | `.wds-btn` variants |
| Content pages | `.wcs-page` / `.wcs-hero` / `.wcs-section` |
| Honesty / empty | `.wds-honesty`, `.wds-empty`, feed health chips |
| Take | `.wds-take` (aurora) + article overrides in `wds-articles-feed.css` |
| Exemplars | Home, Articles, Support, About, Side Trails catalog |

**Dark mode:** Studio default *is* dark navy tokens. No light/dark toggle on the shell.

**Pattern update:** `design-system/patterns/product-shell.html` now uses the `was-shell` contract (not legacy `WDS.ecosystem.initProductHome`).

## Audit matrix

| Surface | Status before | Shell | Notes | After this branch |
|---------|---------------|-------|-------|-------------------|
| Homepage | Current | Yes | Quiet chrome + rebuild | Unchanged (canonical) |
| Dashboard (`apps/dashboard`) | Current | Yes | Same as Home | Unchanged |
| Scenes landing | Mixed | Yes | Custom stage CTAs | CTAs → `wds-btn` |
| Photo Coach | Mixed | Yes | Source Sans 3 body | Inter via tokens |
| `apps/waypoint-scenes` | Older peer | Yes (legacy stack) | Not primary IA | Remaining gap |
| Sheds landing | Current | Yes | `wds-btn` CTA | Unchanged |
| Sheds map | Older | No | IBM Plex / Source Serif, no studio chrome | Tokens + Inter/Cormorant + continuity strip |
| Articles | Current | Yes | Take contrast behind on main | Absorbed readability CSS from parallel branch |
| Side Trails catalog | Current (mild gaps) | Yes | Missing font link; light fallbacks | Fonts + dark token fallbacks |
| SignalTerrain app | Current/mixed | Yes | Foundation page | Unchanged |
| ST Side Trails landing | Older sister | No | IBM Plex + custom top | Continuity strip + token fallbacks (Plex kept) |
| Global Signals hubs | Older sister | No | IBM Plex + custom chrome | Continuity + tokens on hubs; leaf pages via shared JS |
| Civic Trails | Out of scope | — | GitHub outlink only | Documented OOS |
| Support / About | Current | Yes | Content exemplars | Unchanged |

## Screenshots

Captured locally (headless Chrome, 1440×900) under `docs/design-system/`:

| File | Surface |
|------|---------|
| `consistency-home.png` | Home / Dashboard |
| `consistency-articles.png` | Articles |
| `consistency-side-trails.png` | Side Trails catalog |
| `consistency-scenes.png` | Scenes landing |
| `consistency-sheds-landing.png` | Sheds landing |
| `consistency-sheds-map.png` | Sheds map (+ continuity) |
| `consistency-signalterrain.png` | SignalTerrain Side Trails landing |
| `consistency-global-signals.png` | Global Signals dashboard |
| `consistency-support.png` | Support |
| `consistency-about.png` | About |
| `consistency-photo-coach.png` | Photo Coach |

## Fixes applied (shared-first)

1. **Articles Take readability** — copied dark-shell Take/contrast/focus polish into `wds-articles-feed.css` from `feature/articles-waypoints-take-readability` (no shell rewrite).
2. **Side Trails catalog** — Cormorant/Inter font links; replace light parchment fallbacks with `--wds-*` dark defaults in `wds-side-trails.css`.
3. **Scenes CTAs** — primary/ghost `wds-btn` on stage actions; drop one-off pill button rules that fought the DS.
4. **Photo Coach type** — Inter instead of Source Sans 3; folio no longer overrides `--wds-font-body` to a third family.
5. **Sheds map bridge** — load `wds-tokens.css` + studio fonts; map HUD colors still forest-character but text/accent/danger bridge to tokens; add continuity strip (not a full shell restyle of the field HUD).
6. **Studio continuity strip** — new shared `wds-studio-continuity.css` + `wds-studio-continuity.js` for sister/field surfaces that keep product chrome but must remain recognizably Waypoint Studio.
7. **ST / GS** — continuity + tokens on landings/hubs; token fallbacks in landing CSS; countries/industries leaf pages load continuity via shared module JS. IBM Plex retained as intentional sister-product voice (no brand redesign).
8. **Product shell pattern** — updated to `was-shell` mount contract.

## Remaining gaps (owner decisions)

1. **Full `was-shell` on GS/ST** — continuity strip reduces the “older app” cliff; full primary nav + footer would replace or nest sister chrome. Prefer a follow-up once sister-brand vs studio-chrome policy is explicit.
2. **GS country/industry leaf HTML** — continuity JS is injected by shared modules; explicit `<link>`/`<script>` on every leaf HTML is optional hygiene.
3. **Sheds map field HUD** — still bespoke (FABs, sheets). Intentional field UI; only type/token/continuity bridged. Full shell would fight map immersion.
4. **`apps/waypoint-scenes` legacy stack** — keep out of primary IA; eventual redirect/deprecation.
5. **Photo Coach / waypoint-scenes CSS stacks** — still product CSS beyond fonts; incremental migration later.
6. **Civic Trails** — external GitHub; do not WDS-shell in this repo.
7. **Parallel GS home-dashboard branch** — may still evolve GS layout; re-check continuity after that lands.

## Owner-review path

1. Check out `feature/design-system-site-consistency` (worktree: `waypoint-studio-design-consistency`).
2. Serve repo root; walk Home → Articles → Side Trails → SignalTerrain → Global Signals → Sheds map → Scenes → Support/About.
3. Confirm continuity strip appears on ST/GS/Sheds map without redesigning sister branding.
4. Confirm Articles Take cards read clearly on the dark shell.
5. Approve merge when satisfied; **do not merge from this agent**.

## Recommendation

**Approve after a short visual walk** of the cliff surfaces (Side Trails → ST/GS, Sheds landing → map, Articles Take). Treat full sister-product shell adoption and waypoint-scenes deprecation as separate, explicit follow-ups — not blockers for this consistency pass.
