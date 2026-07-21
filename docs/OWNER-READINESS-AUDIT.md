# Owner Readiness Audit

**Role:** Independent Principal UX Reviewer & Product Critic  
**Branch:** `recovery/rc3-consolidation`  
**Tip reviewed:** `985a438` (`design(ux): transform flagship products into guided outdoor experiences`)  
**Date:** 2026-07-21  
**Stance:** Assume public release is weeks away. Document every meaningful issue. Prefer honesty over reassurance.

---

## Executive verdict

**Do not ship this branch publicly yet.**

The product voice has improved. Several landings now ask human questions. Hierarchy on the homepage is intentional. That progress is real — and insufficient.

A first-time visitor will still encounter:

1. **One photograph selling the whole brand** (Studio home + Scenes share a byte-identical hero)
2. **Two entry systems** (homepage cards jump to the real tool; primary nav lands on brochure gates)
3. **Software chrome** that contradicts the outdoor companion promise (Applications, Opportunity Intelligence, Customize Dashboard, Report bug / Request feature)
4. **Articles that apologize for existing** (“Shared platform layer”)
5. **Stale review artifacts** that describe yesterday’s IA — a process smell that launches fail on

Emotion is ahead of surface. Surface is not launch-ready.

**Recommendation:** Hold public launch until Critical and High items below are resolved or consciously accepted with owner sign-off. Medium/Low can trail a soft private beta; they should not be invisible.

---

## How this audit was done

| Method | Notes |
|--------|--------|
| Code & copy review | Current HTML/JS/CSS on tip `985a438` |
| Asset integrity | MD5: `assets/images/home/hero.jpg` ≡ `apps/scenes/assets/media/hero.jpg` ≡ `mist-valley.jpg` (`717cfdc…`) |
| Prior visual pack | `automation/artifacts/rc3-owner-review/desktop/*.png` + mobile set |
| Companion docs | `HUMAN-EXPERIENCE-ARCHITECTURE.md`, `EXPERIENCE-FIRST-PRODUCT-ARCHITECTURE.md`, `RC3-OWNER-VISUAL-REVIEW.md`, `MOBILE-REVIEW.md` |

### Screenshot caveat (important)

Screenshots under `automation/artifacts/rc3-owner-review/` were captured **before** the experience-first landings (equal product cards, Scenes feature grid, older Dashboard chrome). They remain useful as evidence of **recurring failure modes** (identical photography, dense software chrome, dual nav). They do **not** certify the current UI.

**Re-capture required before any ship decision** at:

- Desktop: `/`, `/apps/dashboard/`, `/apps/scenes/`, `/apps/photo-coach/`, `/apps/shed-hunting/`, `/apps/shed-hunting/map/`, `/apps/waypoint-volunteer/`, `/apps/waypoint-volunteer/discover.html`, `/articles/`
- Tablet ~768px and phone ~390px for the same set

Preview:

```bash
cd ~/Projects/waypoint-studio
git checkout recovery/rc3-consolidation
python3 -m http.server 8080
# open http://127.0.0.1:8080/
```

---

## Cross-cutting findings (before screen-by-screen)

| Finding | Why it blocks launch |
|---------|----------------------|
| Identical hero MD5 across Studio + Scenes | Platform identity looks like one stock frame |
| Primary nav → overview; home cards → `startHere` | Two products depending on which door you used |
| Six equal primary-nav labels | Articles/About compete with outdoor companions, especially on mobile wrap |
| Software lexicon in chrome | Breaks “trusted outdoor companion” promise on first contact |
| Homepage Take re-lists four products | Take becomes another IA block, not a live outdoor companion |
| Incubator + maturity labels on home | Roadmap language on a public front door |
| Footer: Report bug / Request feature / Applications | Engineering portal, not visitor center |
| Font systems mixed (Source Sans 3 vs Inter) | Feels like multiple products glued together |
| Docs/tests lag live IA | Owner cannot trust “green” without re-audit |

---

# Screen-by-screen

For each surface: the ten required questions.

---

## 1. Homepage

**Current intent (code):** Immersive hero → “What brings you outside?” with **How is today?** lead + Photograph / Hunt / Help → Take → Articles → Incubator → Also nearby.

**Screenshot ref (stale):** `automation/artifacts/rc3-owner-review/desktop/homepage.png` — shows older equal FREE/FLAGSHIP card grid; current code is lead + “Then” trio (`js/studio-home.js`).

### 1. What works exceptionally well?
- Mission line **Observe. Discover. Understand.** is clear and memorable.
- Lead card hierarchy (one primary, three secondary) matches experience architecture.
- Privacy / no engagement-trap promise is distinctive and brand-right.
- Home cards use `startHere` — they often skip brochure gates.

### 2. What feels unfinished?
- Hero photography is shared with Scenes (same bytes).
- Seasonal hero kit still uses the same stand-in (`assets/images/home/seasons/*` same MD5 as hero).
- Incubator and “Also nearby” reintroduce a product directory after denying being one.
- Search dock (“Search places, observations, articles…”) arrives after storytelling as leftover app chrome.

### 3. What still feels like software?
- Six-item primary nav as peer apps.
- Footer Incubator / Report bug / Request feature.
- Maturity labels on Incubator list (Foundation / Early access).
- Defensive copy: “not a catalog of software” / “not a directory of software modules.”

### 4. Where is cognitive load still too high?
- First viewport: eyebrow + H1 + tagline + lead + CTA + sticky nav — many text layers before commitment.
- Below fold: journey cards + Take (which re-explains the same four products) + Articles + Incubator + supporting links.

### 5. Where does visual hierarchy fail?
- Primary nav gives Articles/About equal weight to Dashboard.
- Take, Articles, and Incubator compete for “what’s next after the lead card.”
- Stale screenshots show neon equal CTAs dominating emotion — risk remains wherever buttons out-shout photography.

### 6. Where would a first-time visitor become confused?
- “Is this a photography site, a weather site, or a volunteer site?” — answered only after reading several sections.
- Difference between top nav “Scenes” and card “Review today’s shoot” (different destinations).

### 7. Which components feel generic?
- Dark SaaS shell + uppercase tracked nav.
- Card grid pattern (even when hierarchical).
- Generic search-as-utility dock.

### 8. Which interactions feel polished?
- Immersive hero treatment and typography pairing (display + body).
- Lead vs secondary card sizing (`wds-studio-home.css`).
- Skip-to-content and calm motion preferences appear intentional.

### 9. Which interactions reduce trust?
- Identical hero reused elsewhere.
- Incubator maturity labels on the public home.
- Placeholder seasonal credit patterns (“Scenes mist stand-in” lineage).

### 10. Highest-value improvements before public launch?
1. Distinct owner photography for home (sky / morning).
2. Align nav destinations with `startHere` or remove brochure landings from primary paths.
3. Demote Incubator + engineering footer links for public visitors.
4. Make homepage Take about *today outside*, not a product map.

---

## 2. Navigation (global + local)

**Sources:** `wds-app-nav-config.js` (`studioPrimaryNav`), `wds-app-shell.js`.

### 1. What works exceptionally well?
- Durable product names for wayfinding (Dashboard, Scenes, Sheds, Volunteer).
- Human `title` hints on primary links (How is today?, Photograph, …).
- Local Scenes/Sheds/Volunteer labels moved toward journey language.

### 2. What feels unfinished?
- Hints are hover-only — invisible on touch devices.
- `aria-current` not applied for Articles/About.
- Apps launcher still titled **“Applications”**.

### 3. What still feels like software?
- Launcher: Applications + category taxonomy (Core / Photography / Outdoor / Intelligence / Lifestyle).
- Local Dashboard labels still include product-ish items; Customize remains chrome.
- Footer engineering links on every page.

### 4. Cognitive load
- Six primary destinations + optional Apps + local feature strip = three navigation systems.
- Mobile: local nav `overflow-x: auto` horizontal strip (`wds-app-shell.css`).

### 5. Hierarchy failure
- Articles and About visually equal to flagship outdoor companions.
- On narrow viewports, six uppercase links wrap into a busy bar (noted in `RC3-OWNER-VISUAL-REVIEW.md`).

### 6. First-time confusion
- Top nav “Scenes” ≠ home card “Review today’s shoot.”
- Top nav “Sheds” / “Volunteer” open overviews while cards open map / Discover.

### 7. Generic
- Flat SaaS mega-nav; “Apps” button pattern.

### 8. Polished
- Shell consistency across products; brand home link reliable.

### 9. Trust reducers
- Applications launcher; Report bug / Request feature as default footer voice.
- Entry-path inconsistency (feels accidental, not designed).

### 10. Highest-value pre-launch
1. Make primary nav targets match human `startHere` for Scenes/Sheds/Volunteer **or** delete overview gates from the public path.
2. Visually demote Articles/About (secondary cluster).
3. Rename/remove Applications launcher for public mode.
4. Soften footer to visitor-center language.

---

## 3. Dashboard

**Sources:** `apps/dashboard/index.html`, `wds-dashboard-v3-shell.js`, `wds-dashboard-v3-brief.js`.

**Screenshot ref (stale):** `…/desktop/dashboard.png` — older dense widget wall with OUT-OF-DATE / NOT INSTALLED badges; treat as warning of density/trust failure modes, not current chrome.

### 1. What works exceptionally well?
- Morning framing: “This morning” / “How is today?” / Today’s Outdoor Brief.
- Widgets section titled “What conditions matter?” — correct mental model.
- Honest trust/freshness metadata when live.
- Independent widget loading (doesn’t block the shell) is a real engineering win that supports calm UX.

### 2. What feels unfinished?
- Duplicate “How is today?” (page title + brief eyebrow).
- Empty/fallback brief copy can expose “Shell is ready…” / Customize prompts — engineering honesty that reads unfinished.
- Question spine (Where should I go? / What changed?) is documented, not fully embodied in chrome.
- Inter font vs Source Sans 3 elsewhere.

### 3. What still feels like software?
- **Customize Dashboard** as primary chrome.
- “Widgets,” Refresh, Kiosk, Change location as peer actions.
- Category/widget library mental model under the brief.

### 4. Cognitive load
- Brief + many condition cards + customize + local hash nav + Take variants.
- Historical screenshots show status badges competing with content — if any remain in live providers, they punish trust.

### 5. Hierarchy failure
- Emotion and function can invert when widgets out-shout the brief.
- Customize bar still a large secondary “product.”

### 6. First-time confusion
- “Is this weather? trails? photography advice?” — yes to all, without a single next outdoor action beyond reading.
- Location prompt / locating states can delay the emotional promise.

### 7. Generic
- Widget dashboard genre; customize dialog patterns.

### 8. Polished
- V3 structure (Brief before widgets); mobile overflow/touch work in `wds-dashboard-v3.css`; skip link to brief.

### 9. Trust reducers
- Stale/unavailable provider states presented as product defects.
- API rate limits / partial data without warm empty states (local preview risk).
- Engineering fallback copy in the brief.

### 10. Highest-value pre-launch
1. One “How is today?” — remove duplicate eyebrow.
2. Soften Customize into clearly secondary “Deeper tools” (partially started; finish chrome).
3. Public-safe empty states (no “Shell is ready”).
4. Ensure live provider failures never look like “NOT INSTALLED” theater.

---

## 4. Scenes

**Sources:** `apps/scenes/index.html`, Photo Coach / Library routes, nav match list.

**Screenshot ref (stale):** `…/desktop/scenes.png` — equal-weight feature cards all using the **same** mountain photo; local nav with eight module peers. Current landing is journey-ordered, but **the identical hero file remains**.

### 1. What works exceptionally well?
- Photographer’s day framing: Continue → Import → Review → Choose best → Learn.
- Hidden Landscapes positioned as discovery, not a peer homepage.
- Later demotes Create / Share.
- Primary CTA to Photo Coach is clear.

### 2. What feels unfinished?
- Overview is still a gate before Coach/Library.
- URLs split: `/apps/scenes/`, `/apps/photo-coach/`, `/apps/photo-library/`.
- “Continue yesterday’s work” is aspirational — no real progress state.
- Journey list has five destinations that largely bounce between two apps.

### 3. What still feels like software?
- Path names Photo Coach / Library still leak in deep screens and mental model.
- “Shape a place” still routes to scene-builder preview.
- Related-apps mounts can reintroduce module adjacency.

### 4. Cognitive load
- Long ordered list + discovery + later + Take + context links.
- Dual destination confusion (nav vs startHere).

### 5. Hierarchy failure
- Five journey steps can feel equal despite one `.scenes-journey__item--primary`.
- Quiet CTA hit area historically smaller than primary (`scenes-home.css`).

### 6. First-time confusion
- “I clicked Scenes — why am I reading a path instead of seeing my photos?”
- Hidden Landscapes name vs “other ways of seeing.”

### 7. Generic
- Shared misty valley hero (same as Studio).
- Dark feature-landing pattern.

### 8. Polished
- Stage + veil cinematography; typography; progressive disclosure of Later.
- Photo Coach craft loop (separate surface) is among the strongest working products — preserve it.

### 9. Trust reducers
- Identical hero/mist-valley bytes.
- Preview/later items that look like broken features if opened.
- Claiming “continue yesterday” without memory.

### 10. Highest-value pre-launch
1. Distinct Scenes photography (not home hero).
2. Resolve double gate (nav → Coach or landing becomes optional).
3. Remove or truly hide unfinished Create/Share from public.
4. Honest “Continue” (last session) or rename to “Review a shoot.”

---

## 5. Sheds

**Sources:** `apps/shed-hunting/index.html`, `css/sheds-home.css`, map as `startHere`.

### 1. What works exceptionally well?
- Morning / “Where should I search?” emotional open.
- Forest atmosphere CSS differentiates from Scenes without a second identical photo.
- Privacy / no leaderboard stance is trust-positive.
- Map as the real product is the right engine.

### 2. What feels unfinished?
- Overview gate before map (primary nav lands here).
- Season review / log discoveries called “Later” without surfaces.
- CSS atmosphere is a stand-in for forest-edge photography identity.
- Foundation brochure mount removed — good for clarity; “About” still a second stop.

### 3. What still feels like software?
- Field map is still a GIS-forward experience once entered (HUD/tools) — expected, but overview→map still feels like app hopping.
- Workflow link mounts can reintroduce tool lists.

### 4. Cognitive load
- Stage + three secondary + Take + Later + related apps.
- Map HUD density (see historical mobile notes) is the real load once hunting.

### 5. Hierarchy failure
- Secondary list items nearly equal; only stage CTA is clearly primary.
- Local nav: Where to search vs About today’s hunt — two peers.

### 6. First-time confusion
- “Is Sheds a map or a learning site?”
- Why overview exists if the answer is always the map.

### 7. Generic
- Gradient “atmosphere” without photography can feel like a template landing.

### 8. Polished
- Clear question-led H1; privacy copy; Take uncertainty labeling.

### 9. Trust reducers
- Predictions/seasonality without strong uncertainty UI inside the map (risk).
- Overview that delays the hunt.

### 10. Highest-value pre-launch
1. Primary nav → map (or soft-default).
2. Owner forest photography for Sheds identity.
3. Quiet the overview to a short gate or eliminate it for public.
4. Map HUD mobile thumb-reach pass (field use).

---

## 6. Volunteer

**Sources:** `apps/waypoint-volunteer/index.html`, `discover.html`, discover mount copy.

### 1. What works exceptionally well?
- Central question: **What good can I do today?**
- Hopeful framing; anti-gamification stance.
- Overview CTA points to Discover; `startHere` is Discover.
- Privacy: no hours tracking / no public feed — distinctive.

### 2. What feels unfinished?
- Overview still a gate; Discover back-link says “← Waypoint Volunteer overview.”
- Impact/stories promised more than delivered.
- Interests/profile as secondary without strong empty-state coaching.

### 3. What still feels like software?
- **“Opportunity Intelligence”** in Discover boot and meta (`discover.html`).
- Eyebrow patterns like “Waypoint Volunteer · Opportunity Intelligence” (discover JS).
- Mini-nav: Saved · Profile · Impact · Overview.

### 4. Cognitive load
- Filters, map, recommendations, profile dimensions once in Discover.
- Overview then Discover duplicates the same H1 question.

### 5. Hierarchy failure
- Overview and Discover both claim the emotional headline.
- Secondary Then-list competes with the only action that matters (nearby).

### 6. First-time confusion
- Why two pages ask the same question?
- Sample vs live location labeling — good if clear, confusing if subtle.

### 7. Generic
- Leaflet map + filter discovery patterns.
- Foundation/boot progress chrome.

### 8. Polished
- Question-first marketing; calm anti-streak ethics; labeled sample data philosophy.

### 9. Trust reducers
- “Opportunity Intelligence” sounds like enterprise SaaS.
- Sample opportunities if not relentlessly labeled.
- CDN Leaflet from unpkg — third-party dependency on a trust-sensitive page.

### 10. Highest-value pre-launch
1. Kill “Opportunity Intelligence” language.
2. Primary nav / public URL → Discover.
3. Hopeful empty states; sample labeling audit.
4. Stewardship photography identity (people/care), not sky stock.

---

## 7. Articles

**Sources:** `articles/index.html`, manifest hub.

**Screenshot ref (stale):** `…/desktop/articles.png`.

### 1. What works exceptionally well?
- Supporting role is conceptually right (context, not fifth flagship).
- Search + category scaffolds exist.
- Can deepen Dashboard/Scenes/Sheds/Volunteer when linked in place.

### 2. What feels unfinished?
- Hub copy is defensive and internal.
- “category scaffolds” / “not a classroom subscription” apologize instead of inviting.
- Content depth vs scaffold ratio unclear for public readers.

### 3. What still feels like software?
- Eyebrow: **“Shared platform layer.”**
- Peer pill row to products + Knowledge.
- Manifest/index loading honesty (“Loading article index…”) is fine; IA language is not.

### 4. Cognitive load
- Categories + search + product cross-links without a single reading path (“start here” article).

### 5. Hierarchy failure
- In primary nav, Articles equals Dashboard.
- On the hub, Articles undercuts itself while nav elevates it.

### 6. First-time confusion
- “Is this a blog, a knowledge base, or documentation?”
- Why am I told it’s not a flagship while it sits in the main nav?

### 7. Generic
- Category index hubs; utility search.

### 8. Polished
- Consistency with studio shell; quiet educational intent.

### 9. Trust reducers
- Thin or scaffold-heavy content looks like a content farm.
- Internal IA jargon on a public education door.

### 10. Highest-value pre-launch
1. Rewrite hub as outdoor learning invitation (kill “Shared platform layer”).
2. Feature 3–5 excellent pieces above categories.
3. Demote nav weight or keep nav but lead with story.
4. Ensure in-product Take/article links beat hub browsing.

---

## 8. Waypoint’s Take

**Sources:** `wds-take.js` (`homepageDefault`), surface asides on Scenes/Sheds/Volunteer, Dashboard Take modules.

### 1. What works exceptionally well?
- Pattern exists: body + meta + sources.
- Meta line values uncertainty (“not a score”).
- Restrained empty state API (“will not invent a Take”) is ethically strong.
- Constitution alignment: interpretation over raw data.

### 2. What feels unfinished?
- Homepage default is a **product map**, not a live outdoor interpretation.
- Inconsistent depth: some surfaces static paragraphs; Dashboard can be richer.
- Facts / interpretation / suggestions / uncertainty not always visually distinguished.

### 3. What still feels like software?
- When Take restates IA (“Dashboard explains… Scenes deepens…”) it becomes onboarding copy.
- Widget-level Takes can feel like template AI blurbs if repetitive.

### 4. Cognitive load
- Take competing with journey cards that already explained the same structure.

### 5. Hierarchy failure
- Take often sits mid-page as another equal section, not a companion whisper.

### 6. First-time confusion
- “Is this AI? advice? weather?” — meta helps, but homepage Take doesn’t feel like today.

### 7. Generic
- Left-border callout box genre; repeated meta strings.

### 8. Polished
- Restraint when empty; consistent component API; photography Take tone on Scenes is human.

### 9. Trust reducers
- Fabrication risk if any surface invents certainty.
- Product-map Take on home weakens the promise of a knowledgeable companion.
- Repetitive Takes across widgets (dashboard history) feel automated.

### 10. Highest-value pre-launch
1. Homepage Take = today’s outdoor companion voice (or hide until live brief exists).
2. Visual distinction: Observed / Interpretation / Suggestion / Uncertainty.
3. Cap widget Take verbosity; prefer one strong brief Take.
4. Never ship invented weather in Take.

---

## 9. Mobile

**Refs:** `MOBILE-REVIEW.md`, `wds-aurora-bridge.css` / `wds-app-shell.css` / product CSS; artifacts `…/mobile/`.

### 1. What works exceptionally well?
- Prior mobile pass addressed horizontal scroll, safe areas, 16px inputs, many 44px targets.
- Dashboard V3 has thoughtful small-screen rules (overflow-wrap, sticky brief disabled on very small).

### 2. What feels unfinished?
- Fresh screenshot pass not run on post-journey landings.
- Primary nav six-link wrap still busy.
- Local nav horizontal scroll strips.
- Sheds map HUD thumb-reach still called out as debt.

### 3. What still feels like software?
- Horizontal feature tabs; Apps launcher on non-home surfaces.

### 4. Cognitive load
- Stacked journey lists + Take + later on phone = long scroll without progressive collapse.

### 5. Hierarchy failure
- Tiny tracked nav labels (≈0.72rem on home).
- Quiet text CTAs with weaker hit areas (Scenes).

### 6. First-time confusion
- Swipey local nav — easy to miss destinations.
- Double gates feel worse on mobile (extra tap tax).

### 7. Generic
- Sticky dark top bars; overflow chip navs.

### 8. Polished
- Shared shell safe-area work; many primary buttons sized for touch.

### 9. Trust reducers
- Sub-40px controls still logged in automation (not always failing).
- Accidental horizontal page scroll if `100vw` hero regressions return.

### 10. Highest-value pre-launch
1. Re-run `mobile-layout.mjs` + manual photo pass on new landings.
2. Reduce primary nav density on ≤480px (overflow menu or two-tier).
3. Audit Scenes quiet CTA hit targets.
4. Sheds map field-usability pass.

---

## 10. Desktop

### 1. What works exceptionally well?
- Immersive home hero; cinematic Scenes stage; reading width on landings.
- Desktop has room for hierarchy that phone compresses.

### 2. What feels unfinished?
- Wide pages still show empty engineering chrome (customize, related apps).
- Desktop nav equality problem (six peers) is visual, not just space.

### 3. Software feel
- Applications launcher; widget customize; multi-column tool directories historically.

### 4. Cognitive load
- Dashboard density; home below-fold directory residue.

### 5. Hierarchy failure
- Large equal cards when present; neon CTAs historically overpower photography.

### 6. Confusion
- Same entry-path split as other viewports.

### 7. Generic
- Dark dashboard genre on large monitors looks like ops software.

### 8. Polished
- Typography scale; max-width reading columns; hero cinematography.

### 9. Trust
- Sparse content on wide screens makes scaffolds obvious.

### 10. Highest-value
1. Photography identity at large sizes (hero quality matters most on desktop).
2. Dashboard brief dominance on wide layouts.
3. Re-capture desktop screenshots for owner sign-off.

---

## 11. Tablet (~768)

### 1. What works exceptionally well?
- Often the sweet spot for journey lists + stage.
- Home “Then” trio can sit in three columns (`was-home__grid--next`).

### 2. What feels unfinished?
- Nav wrap midpoint awkwardness.
- Map + filters on Volunteer/Sheds halfway between mobile HUD and desktop.

### 3. Software feel
- Same chrome issues; split-pane temptations.

### 4–10. Summary
Tablet inherits desktop density and mobile nav wrap. Treat as **first-class launch viewport**, not an afterthought — especially for Dashboard widgets and Sheds map.

**Highest-value:** Explicit tablet QA pass (768 & 1024) before public launch.

---

# Ranked remaining issues

Effort: **S** = hours–1 day · **M** = few days · **L** = week+  
User impact / Launch impact: **1–5** (5 = severe)

## Critical — do not launch with these open

| ID | Issue | Effort | User impact | Launch impact |
|----|-------|--------|-------------|---------------|
| C1 | **Identical hero photography** across Studio home + Scenes (`717cfdc…`) | M (content + compress) | 5 | 5 |
| C2 | **Entry-path split:** primary nav → overview gates; home cards → `startHere` (Scenes/Sheds/Volunteer) | S–M | 5 | 5 |
| C3 | **Software lexicon in public chrome:** Applications, Opportunity Intelligence, Shared platform layer, Shell-is-ready / unfinished brief fallbacks | S | 4 | 5 |
| C4 | **Dashboard trust theater:** unavailable/stale/provider failure states that look broken or “not installed” to strangers | M | 5 | 5 |
| C5 | **No fresh visual QA pack** on current IA (stale screenshots cannot greenlight ship) | S | 3 | 5 |

## High — fix before public launch (or accept in writing)

| ID | Issue | Effort | User impact | Launch impact |
|----|-------|--------|-------------|---------------|
| H1 | Primary nav: Articles/About equal weight to outdoor companions (esp. mobile) | S–M | 4 | 4 |
| H2 | Homepage Take is a product map, not today’s companion | S | 3 | 4 |
| H3 | Incubator + maturity labels + engineering footer on public home/shell | S | 3 | 4 |
| H4 | Scenes “Continue yesterday” without memory (overclaim) | S (copy) / M (state) | 4 | 4 |
| H5 | Volunteer Discover jargon + overview double-H1 | S | 4 | 4 |
| H6 | Articles hub internal IA voice | S | 3 | 4 |
| H7 | Mixed font systems (Inter vs Source Sans 3) | S | 2 | 3 |
| H8 | Unfinished Create/Share/Builder reachable enough to disappoint | S | 4 | 4 |
| H9 | Mobile primary-nav wrap + sub-44px / quiet CTA targets | S–M | 4 | 4 |
| H10 | Sheds map field HUD mobile usability | M | 4 | 3 |

## Medium — soft beta tolerable; public launch weaker if ignored

| ID | Issue | Effort | User impact | Launch impact |
|----|-------|--------|-------------|---------------|
| M1 | Duplicate “How is today?” on Dashboard | S | 2 | 2 |
| M2 | Homepage first-viewport text density | S | 3 | 3 |
| M3 | Journey lists still long (Scenes 5 steps) | S | 3 | 3 |
| M4 | CSS atmosphere stand-ins vs true product photography (Sheds/Volunteer) | M | 3 | 3 |
| M5 | Related-apps / workflow mounts reintroducing module adjacency | S | 2 | 3 |
| M6 | Take lacks visual Observed/Interpretation/Uncertainty structure | M | 3 | 3 |
| M7 | Search docks as post-story utility | S | 2 | 2 |
| M8 | Docs/tests lag (`RC3-OWNER-VISUAL-REVIEW`, RC2 experience tests) | S | 1 | 3 |
| M9 | Third-party CDN on Volunteer (Leaflet unpkg) | S | 2 | 3 |
| M10 | Tablet-specific QA gap | S | 3 | 3 |

## Low — polish backlog

| ID | Issue | Effort | User impact | Launch impact |
|----|-------|--------|-------------|---------------|
| L1 | `aria-current` for Articles/About | S | 1 | 1 |
| L2 | Hover hints useless on touch | S | 1 | 1 |
| L3 | Defensive “not software” copy tone | S | 1 | 2 |
| L4 | Kiosk affordances visible to general users | S | 1 | 1 |
| L5 | Seasonal manifest placeholder credits | S | 1 | 2 |
| L6 | Knowledge link from Articles hub | S | 1 | 1 |

---

# What must be true to say “ready”

Owner checklist — **all Critical cleared**; High either cleared or signed as accepted risk:

- [ ] Distinct owner photography for Home (sky) and Scenes (craft); no shared MD5 heroes
- [ ] One public entry path per flagship (nav and cards agree)
- [ ] No Opportunity Intelligence / Applications / Shared platform layer in visitor-facing chrome
- [ ] Dashboard empty/error states feel calm and outdoor — never broken-install theater
- [ ] Fresh desktop + tablet + mobile screenshots of current IA reviewed by owner
- [ ] Articles hub invites learning; Incubator not competing on the home story
- [ ] Waypoint’s Take on home speaks to today (or is withheld)
- [ ] Unfinished Create/Share/Builder not presented as available craft
- [ ] Mobile nav and primary CTAs pass a real thumb test

Until then: **do not merge to main for public launch. Do not deploy as the public story.**

---

# What is already strong (do not break)

Preserve these — they are the reason the branch is worth continuing:

1. Mission, tagline, privacy-first ethics  
2. Homepage lead hierarchy (How is today? → then Photograph/Hunt/Help)  
3. Scenes progressive disclosure (Hidden Landscapes as discovery; Later for unfinished)  
4. Photo Coach / Shoot Review craft loop  
5. Dashboard Brief-before-widgets architecture  
6. Sheds question-led hunt framing + map engine  
7. Volunteer anti-gamification ethics + Discover question  
8. Take restraint API (refuse to invent)  
9. Experience architecture docs as product law  

---

# Suggested review order for the owner (tomorrow)

1. Open home and Scenes side-by-side — notice the **same photograph** (C1)  
2. Click **Scenes** in the top nav, then the home **Photograph** card — notice different destinations (C2)  
3. Open Volunteer Discover — read **Opportunity Intelligence** (C3)  
4. Open Dashboard with a cold cache / denied location — judge trust (C4)  
5. Scroll Articles hub — read **Shared platform layer** (H6)  
6. Only after Critical/High: debate Medium photography kits and Take structure  

---

# Rollback / process

- This document is advisory. **No product code changed in this commit.**  
- Branch remains `recovery/rc3-consolidation`.  
- Do not treat older `RC3-OWNER-VISUAL-REVIEW.md` checklists as current without re-running routes.

---

## Appendix A — Asset identity proof

```
717cfdc24d89465a87f8c0131247eebc  assets/images/home/hero.jpg
717cfdc24d89465a87f8c0131247eebc  apps/scenes/assets/media/hero.jpg
717cfdc24d89465a87f8c0131247eebc  apps/scenes/assets/media/mist-valley.jpg
```

Seasonal home images currently share the same digest (placeholders).

## Appendix B — Screenshot index (stale pack)

| File | Surface (at capture time) |
|------|---------------------------|
| `automation/artifacts/rc3-owner-review/desktop/homepage.png` | Older equal product cards |
| `…/dashboard.png` | Dense widget / status badge era |
| `…/scenes.png` | Feature card grid + repeated photo |
| `…/sheds.png` | Prior Sheds overview |
| `…/volunteer.png` | Prior Volunteer overview |
| `…/articles.png` | Articles hub |
| `…/mobile/*` | Mobile counterparts |

Re-capture into a new folder (suggested): `automation/artifacts/owner-readiness-2026-07-21/` before any ship vote.
