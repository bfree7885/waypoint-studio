# Dashboard Screen Specification

**Waypoint Outdoor Dashboard — Permanent Product Blueprint**  
**Status:** LOCKED — final design document before implementation  
**Authority stack (conflict resolution):**  
1. `docs/DASHBOARD-PRODUCT-MANIFESTO.md` (soul)  
2. **This document** (exact screen)  
3. `docs/OUTDOOR-OS-DASHBOARD-RESET.md` (technical architecture)  

**Mission (implementation north star):**  
> Help someone confidently decide how to spend time outside today.

**Document rules:**  
- No code. No component names. No API contracts.  
- Layouts from prior Dashboard versions are disposable.  
- Another engineering team must be able to build from this alone.  
- If a detail is not specified here, it does not ship on the first release of Outdoor OS Dashboard.

---

## 0. Product surface definition

### 0.1 What ships

One primary screen: **Outside** (the morning briefing).

Secondary surfaces (not peer homes):

| Surface | When it appears | Relationship to Outside |
|---------|-----------------|-------------------------|
| Alert interrupt | Official hazard is active | Overlays / crowns Outside; does not replace the briefing |
| Location capture | No usable place | Blocks personalized briefing until resolved |
| Detail panels | User opens depth | Temporary; Outside remains home |
| Preferences | User opens settings | Preferences for activities/comfort — not widget layout |
| Sources | User expands trust | Collapsed by default; never a destination tab |

There are **no** primary navigation tabs for Weather, Photography, Rivers, Air, Sun & Moon, or Alerts as peer apps.

### 0.2 Decision contract (every render)

Every render of Outside must make these decisions explicit or honestly unavailable:

1. **Where** this briefing applies  
2. **What it feels like** outside today  
3. **What matters most** (ranked, max 3)  
4. **What to do** (one primary action; one optional alternate)  
5. **How trustworthy** the briefing is (freshness — quiet, honest)

If any of 1–4 cannot be known, the screen must say so without inventing content.

### 0.3 Content budget (hard limits)

| Element | First viewport | After first scroll | Detail panels |
|---------|----------------|--------------------|---------------|
| Primary actions | 1–2 | 0–2 | 1 dismiss / close |
| Secondary actions | ≤2 (place, sources) | ≤3 | Open related detail only if earned |
| Cards | **0** | **0** (unless an interactive control requires a container) | Sheets may use grouped rows, not card grids |
| Ranked “matters” items | 1–3 | — | Full text of selected item |
| Primary “Do” lines | 1 | — | Expanded rationale |
| Alternate “Do” lines | 0–1 | — | — |
| Day-arc beats | 0 on fold if space-tight; else ≤5 quiet beats | 3–7 | Hourly depth if opened |
| Words (calm day, English) | ≤90 visible | ≤120 additional before Sources | Panel-dependent |

**Cards on first viewport: zero.**  
**Equal-weight gauge strips: zero.**  
**Widget walls: zero.**

---

## 1. FIRST VIEWPORT

### 1.1 Definition of “first viewport”

The region visible without scrolling on:

- **Mobile portrait** (reference: 390 × 844 logical points, safe area respected)  
- **Tablet portrait** (reference: 768 × 1024)  
- **Desktop** (reference: 1280 × 800, content column max ~720–800px centered or left-anchored with atmosphere extending edge-to-edge)

Everything required for the Decision Contract (except Sources detail) **must fit** on mobile portrait first viewport under a calm day with 0–1 alert interrupt lines.

### 1.2 Vertical order (top → bottom) — exact stack

```
[A] Alert interrupt          — CONDITIONAL (0 or 1 band; severity may stack max 2 lines)
[B] Brand + place chrome     — ALWAYS (quiet)
[C] Place · time             — ALWAYS
[D] Happening (character)    — ALWAYS when place known; else empty-state body
[E] What matters             — ALWAYS when place known (1–3 items)
[F] Best window              — ALWAYS when place known (1 primary + 0–1 alternate)
[G] Atmosphere field         — ALWAYS as ambient plane (not a content card)
[H] Day arc peek             — OPTIONAL on fold if space; otherwise first pixel of scroll
[I] Sources cue              — QUIET affordance (not a content block)
```

No other regions may insert above [F] on a personalized briefing.

### 1.3 Region specifications

#### [A] Alert interrupt

| Spec | Rule |
|------|------|
| **Purpose** | Make real hazard unmistakable before the calm briefing is read |
| **When** | Official alert(s) with outdoor relevance for this place; or product-elevated safety (e.g. extreme AQI) that meets interrupt criteria |
| **Content** | Severity word or tone · plain-language consequence · one action phrase |
| **Max lines** | 2 lines of body on mobile; 1 additional “+N more” if multiple alerts |
| **Words** | ≤28 words total on the band |
| **Size** | Full width; height ~48–72px mobile; larger only if accessibility needs |
| **Hierarchy** | Highest visual priority on the screen when present — but not theatrical |
| **Emphasis** | Solid severity tone (calm red/amber system — not neon, not flashing) |
| **Actions** | 1: open Alert detail panel. No dismiss that hides active hazard without acknowledgment. |
| **Cards** | 0 |
| **Why** | Safety outranks opportunity. Interrupt is earned, then proportional. |

#### [B] Brand + place chrome

| Spec | Rule |
|------|------|
| **Purpose** | Orient product identity and place control without stealing the briefing |
| **Content** | Product name for this surface: **Outside** (or Waypoint · Outside). Control: change/set place. |
| **Size** | Compact bar ~44–56px; brand text secondary to [D]/[F] |
| **Hierarchy** | Quiet; never larger than Happening headline |
| **Actions** | 1 primary: Place. Optional: Preferences (gear or “Prefs”) — not “Customize widgets” |
| **Forbidden** | Version numbers, “Live/Cached” as large badges, Refresh as hero button, “Dashboard V2” |
| **Why** | Recognition without control-room chrome |

#### [C] Place · time

| Spec | Rule |
|------|------|
| **Purpose** | Answer “near me / today” quietly |
| **Content** | Weekday (or “Tonight”) · Place label (neighborhood/city/park name user trusts) |
| **Format** | Single line preferred: `Tuesday · Near Millbrook` |
| **Words** | ≤8 |
| **Size** | Caption / secondary text (~13–15px) |
| **Hierarchy** | Below Happening; above chrome noise |
| **Emphasis** | Low contrast relative to Happening; never bold-heavy |
| **Why** | Without place, there is no briefing. With place, it must not shout. |

#### [D] Happening (outdoor character)

| Spec | Rule |
|------|------|
| **Purpose** | Instant feel of the outdoors — the day’s character |
| **Content** | **Line 1 (headline):** 3–8 words — sensory/outdoor character (e.g. “Soft overcast, mild, light air”) · **Line 2 (support):** 1 sentence, ≤18 words — what that means for being outside |
| **Total words** | ≤30 |
| **Size** | Headline: largest text on calm screen (~28–36px mobile; ~36–44px desktop). Support: body (~16–18px) |
| **Hierarchy** | Primary narrative focus of the first viewport |
| **Emphasis** | Typography and atmosphere; not icons-as-weather-emoji walls |
| **Actions** | Optional single tap on Happening opens **Conditions detail** — not required to understand |
| **Why** | Orientation before instruments |

#### [E] What matters

| Spec | Rule |
|------|------|
| **Purpose** | Ranked meaning — what should shape the plan |
| **Label** | “What matters” (fixed) |
| **Items** | **1–3** only. Ranked. Item 1 is visually stronger than 2–3. |
| **Per item** | One line, ≤14 words. May include a clock/window when timing is the point. |
| **Total words** | ≤45 for the block including label |
| **Size** | Label: small caps or quiet section label. Items: body, item 1 slightly heavier |
| **Hierarchy** | Second only to Happening + Do |
| **Emphasis** | Vertical list with clear rank — **not** equal tiles, **not** a 7-gauge strip |
| **Actions** | Tap item → relevant detail panel (Air / Light / Water / Conditions / Alert) |
| **Selection rules** | Alert-driven concerns win over opportunities. Conflict days must state the tension in item text. Never pad to 3 with trivia. Prefer 1 true item over 3 weak ones. |
| **Why** | Priority is the product |

#### [F] Best window

| Spec | Rule |
|------|------|
| **Purpose** | The decision — how to spend time outside today |
| **Label** | “Best window” (fixed) |
| **Primary** | One imperative or clear posture, ≤16 words. Must include a window when timing matters (e.g. “mid-afternoon → early evening”). |
| **Alternate** | Optional second line, quieter, ≤14 words, prefixed “Alternate:” or equivalent quiet cue |
| **Total words** | ≤35 including labels |
| **Size** | Primary: emphasized body or subhead (~18–22px). Alternate: secondary (~14–15px) |
| **Hierarchy** | Co-equal with Happening for decision; eye ends here |
| **Emphasis** | Strongest actionable affordance on the calm screen (not a bright marketing CTA pill cluster) |
| **Actions** | Primary line may open a short **Plan detail** (why this / constraints). Alternate is tappable the same way. No third action. |
| **Why** | Action is owed |

#### [G] Atmosphere field

| Spec | Rule |
|------|------|
| **Purpose** | Real outdoor visual anchor — light/sky character as ambient plane |
| **Content** | Full-bleed or edge-to-edge atmosphere derived from conditions (sky character, light quality). Not a photo carousel. Not a collage. |
| **Placement** | Behind or through [C]–[F] as atmosphere; or as a quiet band that completes the first composition — never an inset card |
| **Hierarchy** | Felt, not read; must not reduce text contrast below accessibility |
| **Motion** | Subtle, continuous, purposeful (≤2 ambient motions). No particle storms. No looping “wow.” |
| **Why** | The screen is a place; atmosphere is place |

#### [H] Day arc peek

| Spec | Rule |
|------|------|
| **Purpose** | How the next hours change the advice — without becoming a second dashboard |
| **On fold** | Include if mobile height allows without crowding [D]–[F]; otherwise first content after scroll |
| **Content** | 3–5 beats: time + short label (e.g. `1p warmer · 7:40p golden`) |
| **Words** | ≤40 for the peek |
| **Size** | Compact strip; smaller than What matters |
| **Hierarchy** | Secondary |
| **Emphasis** | Quiet; monochrome or single accent on the “best window” beat only |
| **Actions** | Tap → Day Arc detail (expanded timeline) |
| **Why** | Timing completes the decision |

#### [I] Sources cue

| Spec | Rule |
|------|------|
| **Purpose** | Trust without hero chrome |
| **Content** | One quiet status word/phrase: Live · Cached · Partial · Offline — plus relative time if not Live (“as of 6:12a”) |
| **Words** | ≤6 visible |
| **Size** | Caption |
| **Hierarchy** | Lowest on first viewport |
| **Actions** | Opens Sources panel |
| **Forbidden** | Provider logos as a row; pipeline health; “Version 2”; per-block refresh buttons |
| **Why** | Honesty is required; monitoring is not the product |

### 1.4 First-viewport information map

| Information | Appears? | Why |
|-------------|----------|-----|
| Place | Yes | Near-me truth |
| Day character | Yes | Orientation |
| Ranked priorities | Yes | What matters most |
| Recommended action | Yes | Decide how to spend time |
| Freshness | Yes, quiet | Trust |
| Temperature number | Only if essential to character (optional in headline); never a gauge wall | Avoid weather-site default |
| Hourly forecast table | No | Detail |
| UV index alone as a tile | No unless it wins “What matters” | Ranked meaning |
| Map | No | Not first screen |
| Widget grid | No | Absolute ban |
| Customize layout | No | Absolute ban |

### 1.5 Size, hierarchy, emphasis (summary)

**Type scale (mobile reference):**

1. Happening headline — dominant  
2. Do primary — strong  
3. What matters item 1 — medium-strong  
4. What matters 2–3, Happening support — medium  
5. Place · time, Day arc, Sources — quiet  

**Color:**  
- Default: near-monochrome / outdoor-neutral palette with atmosphere carrying mood.  
- Color accents: **at most two** functional uses on first viewport — (1) alert severity when present, (2) one “best window” or primary Do emphasis.  
- No rainbow of domain colors. No equal colored gauge chips.

**Whitespace:**  
- Generous vertical rhythm between [C], [D], [E], [F] — aim for **~24–40px** section gaps on mobile.  
- First viewport should feel ~40–50% “open air” (negative space + atmosphere), not packed.  
- Do not fill empty space with decorative cards.

**Actions count (calm day):**  
- Place · Sources · (optional) open Happening/Do/Matters into detail · Day arc tap  
- **Primary decision actions the user must notice: 1 (Do).**  
- No floating action button clusters.

**Cards count:** **0**

### 1.6 Eye path (required)

Intended scan path in ≤10 seconds:

1. **Alert** (if any) — interrupt acknowledged  
2. **Place · time** — “this is mine / today”  
3. **Happening headline** — feel the day  
4. **What matters #1** — weight  
5. **Best window** — possibility without homework  
6. (Optional) Day arc best beat — timing  

If eye path is forced into a grid of equal tiles, the viewport fails this specification.

### 1.7 Word budget (calm personalized day)

| Block | Max words |
|-------|-----------|
| Place · time | 8 |
| Happening | 30 |
| What matters (all) | 45 |
| Best window (all) | 35 |
| Day arc peek | 40 |
| Sources cue | 6 |
| **Visible total** | **≈90–120** (prefer ≤90 without day arc on fold) |

Alert band words are additive and do not steal from Happening clarity — shorten What matters to 1 item if needed.

---

## 2. AFTER FIRST SCROLL

### 2.1 Purpose of scroll

Scroll is for **confirmation and depth**, not for discovering the decision.  
A user who never scrolls must still pass the one-screen test.

### 2.2 Exact order after the fold

```
[H] Day arc (full peek if not on fold)     — if not already complete above
[J] Notice (optional, 0–1)                 — curiosity only when it does not compete
[K] Constraints / “If you still go”        — only on conflicted or caution days
[L] Detail gateways                        — quiet links into panels (not domain apps)
[I] Sources (collapsed summary)            — expand in place or panel
[M] Preferences entry                      — last
```

Nothing else appears in the default scroll stack.

### 2.3 Categories — definitions

#### [J] Notice

| Spec | Rule |
|------|------|
| **Purpose** | Optional invitation to notice something true and local (phenology, light quality, wildlife likelihood) |
| **When** | Only if What matters and Do are already clear; never on alert-dominant days unless Notice is safety-adjacent |
| **Count** | 0 or 1 |
| **Words** | ≤25 |
| **Expand** | Tap → short Notice detail or Conditions/Light as appropriate |
| **Collapse** | Default is the single line; no nested accordion walls |
| **Why** | Curiosity without homework |

#### [K] Constraints

| Spec | Rule |
|------|------|
| **Purpose** | On conflicted days, state the tradeoff the primary Do already assumed |
| **When** | Heat + good light, clear sky + rising water, etc. |
| **Format** | Short “If you still go…” or “Watch for…” — ≤30 words |
| **Why** | Judgment under tension |

#### [L] Detail gateways

Quiet text buttons or rows (not a bento of cards):

- Conditions  
- Light  
- Air  
- Water  
- Alerts (only if alerts exist or recently expired and relevant)  

| Spec | Rule |
|------|------|
| **Order** | Conditions · Light · Air · Water · Alerts — **omit** any with nothing honest to say |
| **Label style** | Plain language, not product jargon |
| **Visual weight** | Low — section titled “Look closer” or equivalent, once |
| **Why** | Depth on demand without peer-app IA |

#### Sources / Preferences

Stay at the bottom. Never compete with Do.

### 2.4 What expands vs stays collapsed

| Content | Default | Expands to |
|---------|---------|------------|
| Day arc peek | Collapsed to 3–5 beats | Day Arc panel (hourly narrative) |
| Notice | Single line | Short detail |
| Detail gateways | Labels only | Panels |
| Sources | One-line cue | Sources panel |
| Full NWS text | Hidden | Alert panel |
| Numeric tables | Hidden | Conditions / Air / Water panels |
| Prefs | Hidden | Preferences panel |

### 2.5 Scroll length target

- **Calm day:** ≤1.5× viewport of additional content after fold  
- **Alert day:** Interrupt + shortened scroll; do not add Notice fluff  
- **Hard fail:** Requiring scroll past two full viewports to find Sources or a buried “what to do”

---

## 3. DETAIL PANELS

All detail panels share:

- **Entry:** From first viewport taps, detail gateways, or alert band  
- **Presentation:** Modal sheet (mobile) / side or center panel (desktop) — single focus  
- **Exit:** Explicit close; swipe-down on mobile; Escape on desktop; back returns to Outside unchanged  
- **Maximum complexity:** One purpose; no nested tab strips of five domains; no widget chrome  
- **Trust:** Inherit freshness; never imply Live if parent is Cached  

### 3.1 Alert panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Full understanding of official hazard and required posture |
| **Content** | Severity · headline · plain “what it means outside” · timing · guidance · link/source attribution |
| **Interaction** | Scroll within panel; optional “View all active alerts” if multiple |
| **Expansion** | List of alerts if >1; each expands to full text |
| **Exit** | Close returns to Outside with interrupt still visible if still active |
| **Max complexity** | No map layers; no related-widget recommendations carousel |

### 3.2 Conditions panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Numbers and short forecast that explain Happening |
| **Content** | Now: temp, feel, wind, precip chance, sky · Today’s change in plain language · optional next hours |
| **Interaction** | Read-only instruments; tap a row only if it opens a deeper honest explanation |
| **Expansion** | Hourly may expand once; weekly is optional secondary, collapsed by default |
| **Exit** | Close |
| **Max complexity** | No model-picker theater; no 10-metric gauge dashboard |

### 3.3 Light panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Daylight and photography-relevant windows as decision support |
| **Content** | Sunrise/sunset · golden/blue windows if meaningful · cloud/light quality summary · UV when relevant |
| **Interaction** | Select a window to highlight on Day Arc if both open (optional) |
| **Expansion** | Moon only if it affects tonight’s plan; else collapsed or omitted |
| **Exit** | Close |
| **Max complexity** | No ISS/meteor trivia unless it won Notice for this day |
| **Empty** | If no photography recommendation: say “No standout light window today” + still show sun times — never fake a golden-hour pitch |

### 3.4 Air panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Air quality as go/wait constraint |
| **Content** | AQI (or equivalent) · category · who should care · today trend |
| **Interaction** | Read; link back if Air drove What matters |
| **Exit** | Close |
| **Max complexity** | No pollutant chemistry textbook by default (advanced collapsed) |

### 3.5 Water panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Nearest relevant water hazards/opportunities (rivers, flood, flow) |
| **Content** | Nearest meaningful gauge/summary · trend · plain caution |
| **Interaction** | Select gauge only if multiple and choice is required |
| **Exit** | Close |
| **Max complexity** | Not a hydrography GIS console |
| **Empty** | “No nearby water data for this place” — honest, not a fake creek |

### 3.6 Day Arc panel

| Field | Specification |
|-------|---------------|
| **Purpose** | How advice changes across the day |
| **Content** | Ordered beats with time · condition · implication for Do |
| **Interaction** | Scroll; highlight “best window” |
| **Expansion** | Optional hourly list collapsed behind “More hours” |
| **Exit** | Close |
| **Max complexity** | ≤12 beats visible before “More”; no dual charts competing |

### 3.7 Plan detail (Do expansion)

| Field | Specification |
|-------|---------------|
| **Purpose** | Why this action, and under what constraints |
| **Content** | Primary Do restated · 2–4 rationale bullets · alternate · “not recommended” if relevant |
| **Interaction** | Read; may deep-link to Light/Air/Water once |
| **Exit** | Close |
| **Max complexity** | No activity scoreboard of 12 sports |

### 3.8 Sources panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Earn trust for the curious without becoming the home screen |
| **Content** | Overall status · as-of time · which domains are live/partial/unavailable · plain “what we don’t know” |
| **Interaction** | Expand domain rows; no per-row refresh storms |
| **Exit** | Close |
| **Max complexity** | No developer build SHA, no pipeline graphs, no “integrations registry” UI |

### 3.9 Preferences panel

| Field | Specification |
|-------|---------------|
| **Purpose** | Tune what “Best window” prefers |
| **Content** | Activity preferences (walk, hike, photo, fish, etc.) · sensitivities (air, heat, UV) · units |
| **Interaction** | Toggles/choices; save local |
| **Exit** | Close; Outside may re-rank Do/Matters |
| **Forbidden** | Widget visibility grid, drag-and-drop layout, catalog of 70 modules |
| **Max complexity** | One screen of prefs; advanced collapsed |

### 3.10 Location panel / capture

| Field | Specification |
|-------|---------------|
| **Purpose** | Establish real place |
| **Content** | Use my location · search/choose place · current place · privacy sentence |
| **Interaction** | Permission flow; search; confirm |
| **Exit** | Confirm returns to Outside and rebuilds briefing; cancel leaves prior state |
| **Forbidden** | Silently assigning a national default as “your” town |

---

## 4. EMPTY STATES

Every empty state preserves trust by: telling the truth, offering a next step when one exists, and never filling with invented place or conditions.

### 4.1 Unknown location

| Spec | Rule |
|------|------|
| **Screen** | Outside shell with brand; body replaces [D]–[F] |
| **Message** | We need a place to brief what’s outside near you. |
| **Actions** | Use my location · Choose a place |
| **Must not** | Show Millbrook-or-equivalent fiction; Null Island; random metro |
| **Trust** | Explicit: no near-me briefing until place exists |

### 4.2 Offline

| Spec | Rule |
|------|------|
| **Behavior** | Show last good briefing if any; mark **Offline** / **Cached** with as-of time |
| **Do line** | Soften (“Based on conditions from …”) when action depends on stale data |
| **Must not** | Label as Live; hide staleness |
| **Trust** | Stale-but-honest > blank-but-pretty |

### 4.3 Provider unavailable / partial

| Spec | Rule |
|------|------|
| **Behavior** | Briefing continues with available domains; What matters / Do only use known facts |
| **Sources** | Partial — lists what’s missing in human language |
| **Must not** | Zero-fill gauges; invent AQI; keep layout holes filled with “—” spam |
| **Trust** | Narrow the claim; don’t fake completeness |

### 4.4 No alerts

| Spec | Rule |
|------|------|
| **Behavior** | No interrupt band. No “No alerts” trophy card on first viewport. |
| **Detail** | Alerts gateway may omit or say “None active” inside Look closer |
| **Trust** | Absence of drama is not a feature to celebrate loudly |

### 4.5 Nighttime

| Spec | Rule |
|------|------|
| **Happening** | Night character (“Clear and cold after dark”) |
| **Do** | Tonight’s posture or tomorrow’s first window — clearly labeled which |
| **Light** | Moon/stars only if decision-relevant; else quiet |
| **Atmosphere** | Night palette; still calm |
| **Trust** | Don’t brief “today’s picnic” as if it were noon |

### 4.6 No photography recommendation

| Spec | Rule |
|------|------|
| **First viewport** | Do not invent a photo outing; Do may prefer walk/rest/other |
| **Light panel** | Sun times remain; state no standout window |
| **Trust** | Silence beats a false golden hour |

### 4.7 Missing environmental data (air/water/etc.)

| Spec | Rule |
|------|------|
| **What matters** | Omit that domain entirely |
| **Gateways** | Omit or mark unavailable inside panel |
| **Trust** | “We don’t have air quality for this place right now” |

### 4.8 Universal empty-state copy rules

- Prefer short, adult sentences.  
- One primary action when blocked.  
- No humor that undercuts safety.  
- No skeleton gauges that look like real zeros.  
- No educational essay longer than three sentences on Outside itself.

---

## 5. LOADING STATES

Dashboard must never feel broken. Prefer structured calm over spinners that erase the world.

### 5.1 Initial loading (cold start)

| Spec | Rule |
|------|------|
| **Visible immediately** | Brand chrome · place if known from storage · skeleton lines for Happening / What matters / Do (three quiet blocks) |
| **Copy** | “Finding today’s conditions…” (or equivalent) — once |
| **Forbidden** | Tab skeletons · fake gauges · random national “instrument cards” presented as personal |
| **Atmosphere** | Neutral ambient OK; don’t flash wrong weather character |
| **Completion** | Replace skeletons in place; do not remount a different app chrome |

### 5.2 Refreshing (user-triggered)

| Spec | Rule |
|------|------|
| **Behavior** | Keep current briefing readable; subtle progress on Sources cue or quiet bar |
| **Forbidden** | Full-screen wipe; content jumping to empty |
| **Failure** | Remain on prior briefing + honest error in Sources |

### 5.3 Cached information

| Spec | Rule |
|------|------|
| **Label** | Cached + as-of |
| **Content** | Full briefing allowed if cache policy says usable |
| **Do** | May include timing caveats |
| **Trust** | Cached is a valid state, not a failure — unless too old per product policy, then Offline empty with last known |

### 5.4 Live updates

| Spec | Rule |
|------|------|
| **Behavior** | When fresh data arrives, update text in place; preserve scroll position |
| **Motion** | Prefer cross-fade of changed lines; no confetti |
| **Alert appearance** | If alert arrives, interrupt band inserts with calm emphasis |

### 5.5 Background refreshes

| Spec | Rule |
|------|------|
| **Behavior** | Silent when successful and values unchanged |
| **When values change** | Update quietly; if What matters or Do change materially, update copy without demanding acknowledgment unless severity escalates to interrupt |
| **Battery/data** | Respect OS; never spin forever |

### 5.6 Loading trust rule

A loading state that looks like a finished empty dashboard is a defect.  
A loading state that looks like a control room is a defect.  
A loading state that looks like a calm briefing about to arrive is correct.

---

## 6. MOBILE, TABLET, DESKTOP BEHAVIOR

### 6.1 Mobile portrait (primary)

| Topic | Behavior |
|-------|----------|
| **Thumb zones** | Primary Do and alert action must sit within easy thumb reach on first viewport when possible; Place and Sources may live in top corners (stretch OK) |
| **Scrolling** | Single vertical scroll; no horizontal widget carousels on Outside |
| **Reading distance** | Happening headline readable at arm’s length; body ≥16px effective |
| **Gestures** | Pull-to-refresh allowed if it does not fight scroll; swipe down closes sheets |
| **Safe areas** | Respect notch/home indicator; alert band below status bar |

### 6.2 Mobile landscape

| Topic | Behavior |
|-------|----------|
| **Layout** | Maintain single column briefing; reduce atmosphere height; do not invent a two-pane instrument wall |
| **Priority** | Keep [D][E][F] visible without horizontal scroll of content |

### 6.3 Tablet

| Topic | Behavior |
|-------|----------|
| **Layout** | Same IA; wider type measure capped (~65–75 characters) for Happening support |
| **Detail** | Panels may appear as split companion beside Outside **only if** Outside briefing remains fully visible and primary |
| **Forbidden** | Using tablet width to revive gauge grids |

### 6.4 Desktop

| Topic | Behavior |
|-------|----------|
| **Layout** | Centered reading column for text; atmosphere full-bleed behind |
| **Pointer** | Hover may preview detail gateway; click opens panel |
| **Keyboard** | Esc closes panel; focus order follows eye path |
| **Width** | Do not stretch text to ultrawide; do not fill margins with cards |

### 6.5 Cross-breakpoint invariant

Same information hierarchy. Same word budgets. Same bans.  
Only density, type size, and panel chrome adapt.

---

## 7. VISUAL RHYTHM

### 7.1 Density

- **Target feel:** Quiet field guide page, not dense NOAA console.  
- **First viewport information density:** Low–medium.  
- **After scroll:** Medium, still scannable.  
- **Detail panels:** Medium–high only where numbers require it.

### 7.2 Whitespace

- Mandatory breathing room between Happening, What matters, and Do.  
- Do not collapse section gaps to fit more domains.  
- Prefer omit content over shrink whitespace.

### 7.3 Color frequency

- Atmosphere may carry broad tint.  
- UI chrome: restrained.  
- Functional color: rare — alert, and one positive emphasis max on calm days.  
- Domain rainbow (each gateway a different loud color): **forbidden**.

### 7.4 What attracts attention

1. Alert interrupt (when present)  
2. Happening headline  
3. Do primary  
4. What matters #1  

### 7.5 What stays quiet

- Brand chrome  
- Place · time  
- Sources  
- Detail gateways  
- Alternate Do  
- Day arc (except best-window whisper)

### 7.6 Motion rhythm

- 2–3 intentional motions total on Outside (atmosphere + one transition + optional best-window pulse).  
- No perpetual bouncing CTAs.  
- Reduced-motion: atmosphere static; transitions instant/fade.

---

## 8. ABSOLUTE RULES (PERMANENT)

1. **No widget walls.**  
2. **No peer domain tabs** as primary IA (Weather/Photo/Rivers/Air/Sun/Alerts as equal homes).  
3. **No developer information** on Outside (versions, build channels, pipeline health, integration registries).  
4. **No placeholder content** that looks real.  
5. **No fake confidence** — no invented hometown, conditions, or Live label.  
6. **No duplicated information** — the same fact must not appear as Happening + Matters + Do + gauge.  
7. **No unnecessary scrolling** to reach the decision.  
8. **No equal visual weight** for all facts.  
9. **Everything must earn space** — if it does not help decide how to spend time outside today, cut it.  
10. **No card grids** on Outside.  
11. **No customize-your-layout** product.  
12. **No engagement bait** (streaks, scores-as-grades, social proof).  
13. **No map spectacle** as the opening act.  
14. **No monitoring aesthetic** (per-block refresh, trust tables as hero).  
15. **Alerts interrupt; they do not become wallpaper.**  
16. **One primary Do** — never a flat list of ten suitability scores on first viewport.  
17. **Max three What matters items** — prefer fewer.  
18. **Sources are always available and never dominant.**  
19. **Depth is progressive disclosure, not a second product identity.**  
20. **Implementation may not preserve old layouts** that violate this blueprint.

---

## 9. COPY & CONTENT RULES (SCREEN-LEVEL)

| Rule | Requirement |
|------|-------------|
| Voice | Quiet confidence; field-ready; adult; warm without cute |
| Jargon | No meteorology theater on Outside; plain words first |
| Numbers | Appear on Outside only when they change the decision; otherwise panels |
| Time windows | Prefer human windows (“late afternoon”) with precise time when it matters (“~7:40p”) |
| Conflict | Name the tension in What matters; resolve in Do |
| Beauty days | Allowed to be short and inviting — do not pad |
| Alert days | Shorten opportunity language; elevate protection |

---

## 10. STATE MATRIX (QUICK REFERENCE)

| State | First viewport focus | Do behavior | Trust label |
|-------|----------------------|-------------|-------------|
| Calm personalized | Happening → Matters → Do | Clear primary window | Live / Cached |
| Alert | Interrupt → safety-shaped Matters → safety Do | Unmistakable posture | Live preferred |
| Conflicted | Matters names tradeoff | Primary + constraint | Live / Partial |
| Beautiful | Inviting Happening; light opportunity OK | Best window; get out of the way | Live |
| Night | Night character; tonight vs tomorrow labeled | Honest horizon | Live / Cached |
| No location | Capture CTAs | None | N/A |
| Offline | Cached briefing or honest block | Softened | Offline / Cached |
| Partial | Reduced Matters/Do claims | Only supported actions | Partial |

---

## 11. SUCCESS TEST — REVIEWER CHECKLIST

A reviewer compares a build to this document. Every item is objectively verifiable.

### 11.1 Mission & comprehension

- [ ] User can state today’s outdoor character within **10 seconds** of content appearing.  
- [ ] User can state **what matters most** (≤3 items) without scrolling.  
- [ ] User can state the **single best outdoor opportunity or posture** (primary Do) without scrolling.  
- [ ] User can answer: “How should I spend time outside today?” from the first viewport alone.  
- [ ] First screen requires **no assembly** of meaning from equal tiles.

### 11.2 Hierarchy & layout

- [ ] Vertical order matches §1.2 (alert → chrome → place/time → happening → matters → do).  
- [ ] Happening headline is the largest text on a calm screen.  
- [ ] What matters has **1–3** items, visually ranked (not equal tiles).  
- [ ] Exactly **one** primary Do; at most **one** alternate.  
- [ ] **Zero** widget walls / bento grids / gauge strips of 5+ equal panels.  
- [ ] **Zero** peer domain tabs as primary navigation.  
- [ ] **Zero** cards used as decorative containers on Outside.  
- [ ] Word counts on first viewport respect §1.7 (±10% only for alert days).  
- [ ] Eye path matches §1.6 (verified in design review or session recording).

### 11.3 Trust & honesty

- [ ] Trust/freshness is visible within one tap of Sources or as quiet cue.  
- [ ] No Live label when content is cached/offline.  
- [ ] Unknown location never shows a fabricated hometown.  
- [ ] Missing domains are omitted or explicitly unavailable — not zero-filled.  
- [ ] No placeholder copy that reads as real conditions.  
- [ ] No developer/version/pipeline chrome on Outside.

### 11.4 Alerts & edge days

- [ ] Active relevant alerts appear as interrupt before Happening.  
- [ ] Alert days demote fluffy opportunity content.  
- [ ] Conflicted days name the tension and pick a priority.  
- [ ] Night labels tonight vs tomorrow correctly.  
- [ ] No photography pitch when no standout light window exists.

### 11.5 Loading & empty

- [ ] Initial load shows calm structure, not a broken blank or fake dashboard.  
- [ ] Refresh does not wipe readable content.  
- [ ] Offline/cached states remain actionable when possible and always honest.  
- [ ] Empty location offers Use location / Choose place only.

### 11.6 Depth & scroll

- [ ] Decision is complete before scroll on mobile portrait reference.  
- [ ] After-scroll order matches §2.2.  
- [ ] Detail panels match purposes in §3 and close back to Outside.  
- [ ] Preferences contain no widget-catalog layout editor.  
- [ ] Sources never dominate the first viewport.

### 11.7 Feel (structured judgment)

- [ ] Dashboard feels **calm** (reviewer panel: ≥4/5 agree).  
- [ ] No information overload on first viewport (reviewer panel: ≥4/5 agree).  
- [ ] Feels like a **briefing**, not a weather website or monitoring console (≥4/5).  
- [ ] Atmosphere reads as outdoor context, not abstract decoration (≥4/5).  
- [ ] Color is restrained per §7.3.

### 11.8 Absolute rules audit

- [ ] All twenty Absolute Rules in §8 pass (spot-check with screenshots).

### 11.9 Competitive smell test

- [ ] First viewport could not be mistaken for Apple Weather’s instrument home.  
- [ ] First viewport could not be mistaken for a Windy layer theater.  
- [ ] First viewport could not be mistaken for Garmin metrics or Gaia map home.

---

## 12. HANDOFF NOTES FOR IMPLEMENTATION TEAMS

1. Read Manifesto → this Blueprint → Architecture (in that order).  
2. Build the screen defined here; do not “port” Recovery tabs or V2 gauge strips.  
3. Reuse backend intelligence only when it feeds Happening / Matters / Do / Day Arc / panels.  
4. Any proposed addition must pass: *Does this help someone confidently decide how to spend time outside today?* If no, reject.  
5. Amend this document only when the product’s screen contract changes — not when a CSS file is convenient.

---

## 13. CLOSING

Outside is one composition.

Above the fold: place, character, priority, action.  
Below: timing, optional notice, honest depth.  
Panels: instruments on demand.  
Never: a wall of equal facts.

Ship the briefing. Protect the morning.

---

*End of Dashboard Screen Specification. This is the permanent Dashboard Blueprint.*
