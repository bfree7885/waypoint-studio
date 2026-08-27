# Dashboard → Ambient Intelligence — Phase 0 Audit and Plan

**Status:** Phase 0 accepted. Phase 1 (`#/ambient` snapshot + shell) is documented in `docs/DASHBOARD-AMBIENT.md`.  
**Date:** 2026-08-27  
**Audit base:** `origin/main` `db159622` (includes Sheds V3.2 merge `06851649` plus later cyber refresh)  
**Live surface:** `https://waypointstudio.org/apps/dashboard/`  
**This document is the audit/plan.** Production Discover is unchanged by the audit itself.

Canonical product law still: `docs/PRODUCT-DIRECTION.md` (Dashboard · Scenes · Sheds).  
Discover honesty still: `docs/DASHBOARD-DISCOVER.md`.  
Feel / trust: `docs/PRODUCT_STANDARDS.md`.

---

## Executive answer

Dashboard already answers a weaker form of Ambient’s question: *what should I notice outside today, tonight, and soon?* It does that with **deterministic, client-side intelligence** over Open-Meteo, NWS, location, daylight, a small events catalog, and guarded phenology.

It does **not** watch continuously, keep history, detect change against yesterday, score outdoor opportunities as a first-class layer, ingest radio, or take money.

**Waypoint cannot accept its first $4.99/month Ambient subscriber today.** There is no account, no payment processor, no entitlement server, and GitHub Pages cannot host those safely. The free Dashboard is also **already useful** — charging for the same Discover workspace would violate trust.

The shortest honest path is:

1. Ship a **Dashboard Ambient Mode** that rearranges *existing* live intelligence into glanceable NOW / DEVELOPING / OPPORTUNITIES (still free or clearly preview).
2. Then add a **thin backend + Stripe** so a real person can subscribe.
3. Only then sell history, change detection, always-on hardening, AI query, and (much later) radio.

Do not rebuild Dashboard. Do not create a Radio app, Foraging app, or fourth Studio product. Ambient is a **mode and intelligence layer of Dashboard**.

Working name: **Waypoint Ambient** · target **$4.99/month** / **$39.99/year** · founding-member pricing later. Pricing is intent until billing exists.

---

## A. Current-state audit

### A.1 Dashboard architecture (what actually mounts)

| Piece | Path | Role |
|-------|------|------|
| Entry | `apps/dashboard/index.html` | Live Discover URL `/apps/dashboard/` |
| Boot | `apps/dashboard/js/home-boot.js` | Waits for `WDS.dashboardRebuild.mount`, bootstraps location, hydrates Outdoor Intelligence + weather, then `setPlatform` / `setPlaceContext` |
| Shell | `design-system/js/dashboard/rebuild/wds-dashboard-rebuild.js` | Version `3.3.0-discover`. Hash views: `workspace` · `customize` · `kiosk` |
| Intel | `design-system/js/dashboard/rebuild/wds-dashboard-rebuild-intel.js` | Deterministic signals. Comment in source: **“No LLM.”** |
| Happening Now | `…/wds-dashboard-rebuild-happening.js` | Ranked live weather/air/light/alert (min score 25, max 4) |
| Today Outside | `…/wds-dashboard-rebuild-today.js` | Synthesized day, not a number dump |
| Events | `design-system/js/dashboard/natural-events/` | Curated catalog; one lunar-eclipse acceptance event |
| Season | `design-system/js/dashboard/wds-dashboard-season.js` | Computed calendar vs guarded phenology |
| Location | `design-system/js/wds-location.js` | Browser geo → IP (`ipwho.is`) → prompt; `wds-location-v3` |
| OIP | Outdoor Intelligence package via `home-boot.js` | Weather + supporting fetches |

**Hierarchy today (Discover v1):** Coming soon / events → Happening Now → quiet strip → Today Outside → instrument widgets → deepeners (Articles / Scenes / DFD).

**Not mounted by home-boot (still shipped in `wds.js`):** Dashboard V2, V3, Outdoor OS. Treat as legacy, not delete.

**Rebuild internal kiosk:** `#/kiosk` via `wds-dashboard-rebuild-kiosk.js` — 5-minute refresh, no location prompt, empty chrome. Documented as non-user-facing.

**Standalone always-on remnant:** `kiosk.html` + `js/kiosk.js` + `scripts/start-waypoint-kiosk.sh` (Chromium `--kiosk` on local static server). Separate from Discover. Reusable as Ambient display research, not the live product.

### A.2 Data sources actually used

| Source | Status | Used by live Discover UI? |
|--------|--------|---------------------------|
| Open-Meteo forecast | Live, no key | Yes |
| Open-Meteo air quality | Live | Yes (Air widget) |
| Open-Meteo elevation | Live | OIP; not a Discover widget |
| NWS alerts | Live, no key, User-Agent required | Yes |
| NWS forecast | Recovery path when Open-Meteo is placeholder | Yes (home-boot) |
| Nominatim reverse geocode | Live | Yes (place labels) |
| ipwho.is | US-only IP fallback | Yes |
| Daylight / moon | Derived (`wds-daylight-utils.js`) | Yes |
| Calendar season | Computed | Yes |
| Phenology | Editorial bundles, expire/omit | Partial |
| Natural events JSON | Local catalog | Partial (one event type populated) |
| USGS streamflow | Live in OIP | **Fetched, not surfaced** in rebuild catalog |
| OSM Overpass trails | Live in OIP | **Fetched, not surfaced** |
| Registry pending | Recreation.gov, NPS, USFS, BLM, eBird, AirNow smoke, NOAA tides | **Not built** (`wds-integrations-registry.js`) |

Honest inventory lives in `design-system/js/dashboard/wds-integrations-registry.js`. Do not treat pending rows as available.

### A.3 Mapping

**Dashboard has no geo map and no Leaflet.**  
Leaflet + Carto/Esri tiles live on **Sheds** (`apps/shed-hunting/`). Optional `WAYPOINT_MAP_TILE_CONFIG` is injected at Pages build for Sheds only. Ambient MAP will need a deliberate, low-density overlay — do not dump the Sheds field map into Dashboard.

### A.4 Scenes / Sheds / ForageCast hooks

| Product | From current Dashboard body |
|---------|-----------------------------|
| Scenes | Deepeners and some HN/light/astronomy tool links → `/apps/scenes/` |
| Articles / DFD | Deepeners + `wds-publishing-match.js` when a story is justified |
| Sheds | **No** rebuild deep links (intentional: Sheds stays map-first specialty) |
| ForageCast | Legacy catalog only; **not** in rebuild deepeners. Incubator/supporting, not a fourth flagship (`PRODUCT-DIRECTION.md`) |

Shared location: `wds-location-v3` across apps. Platform saved places: `waypoint-platform-locations-v1`.

Photography opportunity heuristics already exist **off the rebuild mount**: `design-system/js/weather/wds-sky-dashboard-intel.js` (sunrise/sunset/fog/night photo verdicts from live weather + daylight). ForageCast has species scoring (`apps/foragecast/js/oie/foragecast-oie-scoring.js`) that must not be advertised as “this mushroom is edible.” Sheds has seasonal timing + Inspect facts; Dashboard must not claim sheds are present.

### A.5 Backend / database / identity

| Layer | Reality |
|-------|---------|
| Hosting | GitHub Pages static site (`/.github/workflows/pages.yml`) → `waypointstudio.org` |
| App server | **None** (no Workers, no Vercel, no Netlify functions) |
| User database | **None** |
| Studio auth | **None.** Profile `id: "local-user"` in `wds-platform-stores.js` |
| Settings | `settings.html` — “Private by default. No accounts required.” |
| Sync | `syncEnabled: false`; `wds-platform-future-data.js` `ENABLED = false` |
| Observations | localStorage (`waypoint-sheds-observations-v1`, Fieldry key, etc.) |
| Contact | FormSubmit → `contact@waypointstudio.org` |
| Private University | scrypt + cookie on a loopback Node server; **stripped from Pages** (`private/` removed in deploy). Not a Studio account system. |

### A.6 Payment / subscription

**MISSING in product code.** No Stripe, PayPal, Paddle, Lemon Squeezy, checkout, customer portal, webhooks, trials, or entitlements.

Placeholder only:

```javascript
subscription: { readiness: true, active: false, plan: null }
```

in `design-system/js/platform/wds-platform-stores.js`. Tests assert `readiness === true`. That means the **settings schema has a slot**, not that billing works.

`ops/product-board/gates/subscriber-ready.json` is a **quality gate** (don’t ship fake features), not a payment system.

`docs/PRODUCT-DIRECTION.md`: one Studio subscription is **intent**; “Do not invent pricing in docs unless live pricing exists.”

`docs/ai-agents/WAYPOINT-STUDIO-STRATEGY.md` is **stale** (“Do NOT build accounts/billing”; ForageCast “no codebase”). Canonical file is `PRODUCT-DIRECTION.md`.

### A.7 Intelligence / AI

| System | Kind | LLM? |
|--------|------|------|
| `dashboardRebuildIntel` | Thresholds, ranking, Before You Go | No |
| Natural events engine | Catalog + lifecycle + visibility boxes | No |
| Sky intel | Photo/fog/night verdicts | No |
| ForageCast OIE | Species factor scores | No |
| Sheds Inspect | Deterministic facts + Why | No |
| Global Signals Explain This | Graph match (Side Trails, archived as product) | No |
| Photo Coach | Browser heuristics | No |
| Deck “local AI” | Planned; do not implement in Studio | — |

OpenAI appears in cyber live data only as a **statuspage provider**. There is **no Dashboard query chatbot**.

### A.8 Radio / Node

SignalTerrain Radio is `"status": "blueprint"`; routes `/receivers/`, `/incidents/`, `/audio/` `ready: false`. LocalStorage models exist under SignalTerrain. **No Dashboard RF ingestion. No WebUSB / rtl-sdr remnants. No speech-to-text.**

Waypoint Node (SDR, Pi, PWS) is **not in the repo**. Closest analog is **Waypoint Deck** (Side Trail, independent, not Studio subscription) plus archived SignalTerrain research. Ambient must work from public APIs without hardware.

### A.9 Deployment / ops

- Pages on `push` to `main`; CI is independent and must not block Pages.
- Scheduled: cyber refresh, articles refresh.
- Secrets already used: `WAYPOINT_MAP_TILE_CONFIG` (optional tiles), `NVD_API_KEY` (cyber). No billing secrets.
- Analytics: DFD in-memory CustomEvents only; platform analytics disabled. No gtag/PostHog.

### A.10 What to reuse (do not rewrite)

- Rebuild Discover shell and honesty rules
- `dashboardRebuildIntel` + Happening Now ranking
- Location + OIP weather hydrate + NWS recovery
- Season guards (the August 2026 Discover correctness work)
- Sky intel for Scenes opportunities
- ForageCast scoring as an **optional Ambient factor**, never a flagship product
- Sheds timing / searchability as **optional Ambient factor**, never a Dashboard map
- Rebuild `#/kiosk` + `kiosk.html` as Ambient display ancestors
- Platform stores subscription **slot**
- Design system / glanceable instrument graphics
- Publishing match for “understand this”

---

## B. Gap analysis

Legend: **EXISTS** · **PARTIAL** · **MISSING** · **DEFER**

| Capability | Class | Evidence |
|------------|-------|----------|
| Current weather / forecast / precip | EXISTS | Open-Meteo + NWS recovery |
| Storm / alerts | EXISTS | NWS alerts; storm graphics in rebuild |
| Sunrise/sunset / twilight / moon | EXISTS | Daylight utils + Astronomy widget |
| Basic outdoor conditions / air | EXISTS | AQ, UV, light, “how it feels” |
| Discover ranking (“worth attention”) | PARTIAL | HN + events; no history/change |
| Quiet-day honesty | EXISTS | Quiet strip after catalog+HN empty |
| Scenes entry | EXISTS | Deepeners / tool links |
| Sheds entry from Dashboard body | MISSING | By design today; Ambient may add a **link + seasonal line**, not a map widget |
| Foraging as Ambient factor | PARTIAL | ForageCast OIE exists; not on Discover |
| Dedicated 24/7 Ambient display | PARTIAL | `#/kiosk` + `kiosk.html` remnants |
| Glanceable NOW / DEVELOPING / OPPORTUNITIES | PARTIAL | Same data, different IA; Ambient shell missing |
| Map of conditions/events | MISSING | No Dashboard Leaflet |
| Historical snapshots | MISSING | Session-only; failed catalog promise was a lesson, not a store |
| Change detection / “what changed?” | MISSING | |
| Anomaly vs local baseline | MISSING | |
| Opportunity scoring (Scenes/Sheds/forage/astro) | PARTIAL | Sky intel + ForageCast + Sheds timing, not unified |
| Continuous monitoring while tab closed | MISSING | Needs backend or OS notifications; browser cannot promise 24/7 |
| AI query over situational data | MISSING | Deterministic intel only |
| Radio ingestion / pulse | DEFER | Blueprint only; legal/product risk |
| Waypoint Node hardware | DEFER | No code; Deck is separate |
| Accounts | MISSING | `local-user` |
| Stripe / entitlements / portal / trial | MISSING | |
| Free vs paid gating | MISSING | Entire Dashboard is public |
| Affiliate “Works with Waypoint” | DEFER | No commerce |
| Lightning network | MISSING | Not in integrations registry |
| Push notifications | PARTIAL | Settings `notifications.enabled: false`, local-reminders-only intent |

---

## C. Monetization readiness

### What prevents the first $4.99/month Ambient subscriber today?

1. **No payment processor** — cannot charge a card.
2. **No Studio account** — cannot restore a purchase on another device or after clearing storage.
3. **No server** — GitHub Pages is static; Stripe webhooks and entitlements cannot be verified in the browser without being forgeable.
4. **No priced SKU in production** — docs correctly refuse to invent live pricing.
5. **No product difference worth paying for yet** — Discover already includes weather, forecast, moon, alerts, astronomy, and ranked “notice this.” Selling the same page as Ambient would fail the subscriber-ready gate (“poor-value features presented as ready”).
6. **No cancel/portal path** — legal and trust requirement for a real subscription.
7. **No entitlement check** — `subscription.active` is always false and unused.

University auth and FormSubmit are **not** a billing foundation.

### Shortest safe path (after Ambient Mode exists as a real extra)

A **small Cloudflare Worker (or equivalent) + Stripe Checkout + Customer Portal + email magic-link** is enough. Do not stand up Postgres on day one if a Worker KV/D1 row `{email, stripeCustomerId, status, periodEnd}` will do.

Suggested shape:

- Free Dashboard remains fully usable **without login**.
- Ambient Mode preview may be free; **history, change, always-on extras, AI query** require `plan=ambient`.
- Stripe Checkout Session → webhook `checkout.session.completed` / `customer.subscription.deleted` → entitlement.
- Customer Portal for cancel/update (do not build a custom billing UI).
- Trial: Stripe native trial days.
- Founding price: Stripe coupon or price ID `ambient_founding_499`; never raise that ID.
- Client: signed session cookie or JWT; never a secret API key in the browser.
- Restore: magic link, not social login required for v1.

**Do not implement this until the owner reviews this audit.** A Worker is a new production surface (privacy, abuse, PCI via Stripe hosted checkout).

Legal/privacy: privacy.html must be updated before first charge (account email, Stripe as processor, retention). No observations uploaded by default.

---

## D. Ambient architecture (minimum, extend don’t replace)

```
Public APIs (Open-Meteo, NWS, daylight, events catalog, later optional Node)
        ↓
Existing OIP + dashboardRebuildIntel + sky intel + (optional) ForageCast/Sheds factors
        ↓
Normalized Ambient snapshot  { t, place, now, signals[], opportunities[], sources[] }
        ↓
Snapshot ring (IndexedDB on device; optional cloud for paid)
        ↓
Change / opportunity / summary (deterministic first)
        ↓
Dashboard Workspace (unchanged Discover)     Ambient Mode (new view)
```

**Principles**

- One Dashboard product. Ambient is `#/ambient` (or a first-class toggle), not `/apps/ambient/`.
- Snapshots are the common model: timestamped, location-aware, sourced, confidence-tagged.
- Intelligence stays **deterministic and cited** until an AI layer *queries those snapshots*.
- Radio is an **optional collector** feeding the same snapshot store (category: `radio_pulse`), never a person-tracker.
- Node is an **optional collector** (PWS, SDR audio files, sensors). Core Ambient must work without it.
- Free tier uses live snapshot only. Paid adds ring history + diffs + Ambient display polish + later AI.

**Do not** revive Outdoor OS as the Ambient IA. NOW / DEVELOPING / OPPORTUNITIES / MAP can map onto existing intel without the old manifesto stack.

**MAP (when added):** a calm place marker + alert/event dots, not Sheds GIS. Leaflet can be shared as a library; product chrome must stay Dashboard.

**24/7 truth:** a dedicated screen with the Dashboard tab open can refresh (kiosk already does ~5 min). “Watches while you are away” requires a backend poller or user-owned Node. Do not advertise 24/7 cloud watching until that exists.

---

## E. Data-source feasibility

| Need | Realistic option | Geography | License / cost | Notes |
|------|------------------|-----------|----------------|-------|
| Current / forecast / precip / humidity / wind | **Open-Meteo** (already live) | Global | Free, rate-limited (429 already handled as placeholder) | Cache; do not poll every second |
| US alerts | **NWS** (already live) | US | Free | Non-US: no NWS; omit honestly |
| Air | Open-Meteo AQ (live) | Global-ish | Free | Not AirNow official AQI |
| Lightning | Blitzortung / commercial nowcast | Varies | Often restricted | **Do not claim** until a licensed/allowed feed exists. Registry does not list it. |
| Astronomy (sun/moon) | Already derived; optional suncalc locally | Global | Free local math | Prefer local computation |
| Ephemeris / eclipses | Curated `events.json` | Event-specific visibility boxes | Editorial | Not a full calendar (documented limitation) |
| Photo opportunities | `wds-sky-dashboard-intel.js` | Global from weather | Free | Heuristic, not a “great shot” guarantee |
| Foraging conditions | ForageCast OIE + rain/temp/humidity | Species lists are regional | Free compute | **Never “safe to eat.”** Phenology already has August-correctness guards |
| Sheds timing | Sheds phase-1 timing + weather | Whitetail / regional packs | Free | **Never “sheds are here.”** Link to Sheds app |
| Environmental water | USGS IV (OIP live, UI unused) | US | Free provisional | Surface later as optional |
| Trails | Overpass (OIP live, UI unused) | OSM coverage | Fair-use | Not crowd density |
| Radio | User Node + allowed public feeds | Hardware-dependent | STT cost | Phase 6; aggregation only |
| PWS / sensors | User Node (Weather Underground, Ecowitt, etc.) | Hardware | Vendor TOS | Enrichment only |
| Geocode | Nominatim (live) | Global | OSM usage policy | Cache aggressively |

Distinguish: **global** Open-Meteo vs **US** NWS/USGS vs **location-dependent** bundles vs **hardware-dependent** radio/PWS vs **licensed** lightning/eBird/NPS.

---

## F. Cost / risk

### Recurring cost vs $4.99/month (~$0.16/day)

| Operation | Economics |
|-----------|-----------|
| Open-Meteo + NWS from the browser | **Inexpensive** (user’s IP; 429 risk) |
| Shared server-side weather cache (15 min / cell) | **Inexpensive**, actually saves 429s |
| Per-user 1-minute cloud history | **Expensive / pointless** — weather doesn’t change that fast |
| IndexedDB snapshots every 15 min on device | **Free** |
| LLM per Ambient query (GPT-class) | **Can exceed $4.99** if uncapped |
| Cloud speech-to-text for radio | **Can exceed $4.99** quickly |
| Local Whisper on Node | **Capex**, low marginal |
| Leaflet tiles | Free defaults; paid Carto key optional |
| Stripe | ~2.9% + $0.30 → ~$0.45/mo at $4.99 |
| Email magic links | Low (Resend/Postmark) |
| Cloudflare Worker + D1 | Low at early volume |

**Keep cheap:** deterministic intel, local snapshots, batched 15-minute weather, shared cell cache.  
**Cap later:** AI queries (e.g. 20/month), radio hours, extra places.  
**Higher tier someday (identify only):** multi-place Ambient, radio hours, unlimited AI — **do not add a tier now**.

### Risks

| Risk | Mitigation |
|------|------------|
| Charge for the free Discover page | Don’t take money until Ambient Mode is a real extra |
| LLM hallucinations | AI only explains stored snapshots; cite source/time |
| Radio → police/person tracking | Aggregation, delay, no PII, no “transmitter is this person”; DEFER |
| NWS-only alerts outside US | Honest empty |
| Open-Meteo 429 | Existing placeholders + shared cache |
| Nominatim blocking | Cache; don’t geocode on every snapshot |
| Pages + Worker split-brain | Entitlement cookie; free path never depends on Worker uptime |
| Privacy | Local-first observations; account email only for paid; no observation upload |
| Affiliate storefront | Recommend ≤ few tested SKUs; disclose; software remains the product |
| Stale phenology | Existing season guards — reuse, don’t weaken |

---

## G. Phased roadmap (adjusted)

User sketch kept, with one change: **do not collect payment before Ambient Mode is a visible extra.** Monetization infrastructure can be built in parallel, but **first charge** waits on Phase 2 acceptance.

### Phase 0 — this document

- **Goal:** Shared truth about repo + plan.  
- **Scope:** Audit only.  
- **Files:** `docs/DASHBOARD-AMBIENT-PHASE-0.md`  
- **Acceptance:** Owner review.  
- **Tests:** None.  
- **Risk:** Stale strategy docs confusing agents — prefer this file + `PRODUCT-DIRECTION.md`.

### Phase 1 — Ambient visual shell + existing live data (next product work)

- **Goal:** Glanceable Ambient Mode using **only data Dashboard already has**.  
- **Scope:** `#/ambient` (or equivalent) with NOW / DEVELOPING / OPPORTUNITIES. NOW = conditions + sun/moon. DEVELOPING = HN + alerts + events (no history yet). OPPORTUNITIES = sky intel + honest “unknown” for forage/sheds until wired. No new APIs. No billing. No map required. Preserve Workspace unchanged.  
- **Likely files:** `apps/dashboard/index.html`, `home-boot.js`, `wds-dashboard-rebuild.js`, new `wds-dashboard-rebuild-ambient.js`, `wds-sky-dashboard-intel.js` (reuse), CSS in `wds-dashboard-rebuild.css`, tests `automation/test-dashboard-ambient-shell.mjs`.  
- **Dependencies:** None beyond current hydrate.  
- **Acceptance:** 10-second readability at 375/390/430 and a large viewport; routine days stay calm; no new wildlife/prediction claims; Workspace/Discover regressions green.  
- **Tests:** New ambient shell tests + existing Discover correctness + intel/happening.  
- **Risk:** Turning Ambient into another widget wall — enforce hierarchy and density caps.

### Phase 2 — Monetization foundation

- **Goal:** A real person can create an account, subscribe, pay, restore access, manage/cancel.  
- **Scope:** Stripe Checkout + Portal + webhook; magic-link; entitlement cookie; privacy copy; **gate only extras not yet built if Phase 1 is still preview**, or gate Ambient Mode if owner chooses. Free Discover stays ungated.  
- **Likely files:** new `functions/` or `workers/` (out of Pages root), `privacy.html`, settings subscription UI, CI secrets. **Not** `private/university`.  
- **Dependencies:** Stripe account, DNS, owner legal review.  
- **Acceptance:** Test-mode purchase, restore in a second browser, cancel via Portal, free Dashboard still works logged-out.  
- **Tests:** Webhook signature unit tests; entitlement matrix; no secrets in client.  
- **Risk:** Static-site false security (checking `localStorage.plan`).

### Phase 3 — History / change detection

- **Goal:** “What changed since this morning?” from a snapshot ring.  
- **Scope:** IndexedDB snapshots (15 min while Ambient/Dashboard open). Diff temperature, precip probability, alerts, event lifecycle, HN membership. Optional paid cloud ring later.  
- **Files:** new snapshot module; intel diff; Ambient DEVELOPING copy.  
- **Dependencies:** Phase 1.  
- **Acceptance:** Deterministic fixtures (morning vs afternoon JSON). No invented change.  
- **Tests:** Snapshot schema + diff cases + storage quota failure honest.  
- **Risk:** Over-sampling; quota; treating forecast revision as a “sensor.”

### Phase 4 — Opportunity intelligence

- **Goal:** Scenes / forage / sheds / astronomy lines that are cited and honest.  
- **Scope:** Unify sky intel + ForageCast factors (no edibility) + Sheds seasonal timing (no presence) + astro windows from daylight/clouds. Deep links into Scenes and Sheds.  
- **Files:** ambient opportunity composer; ForageCast OIE read-only; Sheds timing read-only.  
- **Dependencies:** Phase 1; ForageCast stays incubator.  
- **Acceptance:** Each line has source + timestamp; banned-language tests (edible, sheds present, bedding).  
- **Tests:** Opportunity composer + Discover correctness still pass.  
- **Risk:** Dashboard becoming ForageCast/Sheds.

### Phase 5 — AI query layer

- **Goal:** Ask the snapshot store, not the open web.  
- **Scope:** Small allowlisted questions; retrieve snapshots + diffs + opportunity objects; model must quote sources. Hard monthly cap. Deterministic answers remain default when the model is down.  
- **Dependencies:** Phase 3 snapshots; Phase 2 entitlements.  
- **Acceptance:** Offline/model-fail still shows deterministic Ambient. No uncited claims.  
- **Tests:** Prompt-injection / uncited-output fixtures.  
- **Risk:** Cost and hallucination.

### Phase 6 — Radio prototype

- **Goal:** Optional Node or file drop → categorized pulse.  
- **Scope:** Timestamped utterances, categories (weather/road/other), counts, **no live map of people**. Geographic fields: reported vs inferred vs repeater vs known transmitter. Delay + redaction.  
- **Dependencies:** Legal review; Node spec; cheap/local STT.  
- **Acceptance:** Sample log produces a pulse without PII; cannot derive a person’s location.  
- **Tests:** Redaction + geo-field honesty.  
- **Risk:** Product becoming a scanner app; FCC/TOS; STT cost.

### Phase 7 — Dedicated-screen production hardening

- **Goal:** Ambient Mode readable from several feet, hours-stable.  
- **Scope:** Burn-in, reduced motion, high contrast, refresh policy, missing-data calm, kiosk flag, optional wake lock. Merge lessons from `kiosk.html`.  
- **Dependencies:** Phases 1–3.  
- **Acceptance:** 375–desktop + large TV-ish viewport; 8-hour soak without tab crash; a11y contrast.  
- **Tests:** Visual + refresh + memory.  
- **Risk:** Widget creep; bright “urgency” chrome.

**Works with Waypoint / Node:** document SKUs only after Phase 6/7 have a real integration. Affiliate disclosure in copy. No inventory.

---

## H. NEXT IMPLEMENTATION SLICE

**Phase 1 of this slice is implemented** (`docs/DASHBOARD-AMBIENT.md`, `#/ambient`). Later phases (billing, history, radio) remain unstarted.

### Slice: Dashboard Ambient Mode shell (existing data only)

**In:** A new Dashboard view (hash `#/ambient`) that composes:

- **NOW** from current rebuild conditions + daylight (temp, wind, precip, sunset, darkness/moon as available)
- **DEVELOPING** from Happening Now + NWS alerts + natural events (same ranking rules)
- **OPPORTUNITIES** from `wds-sky-dashboard-intel.js` (Scenes/photo + astronomy night quality) plus explicit **unknown** lines for foraging and Sheds (no fake scores)

**Out:** Stripe, accounts, IndexedDB history, Leaflet map, radio, Node, LLM, new weather vendors, ForageCast/Sheds product pages, production deploy of a redesign of Workspace.

**Why this slice:** It is the smallest test of whether Ambient is *more glanceable* than Discover without lying, without new cost, and without blocking the free product. It also creates something that billing (Phase 2) can eventually attach to.

**Acceptance (when approved):**

1. Workspace Discover unchanged and tests still pass.  
2. Ambient view renders after normal hydrate; missing weather is honest.  
3. Mobile 375/390/430 + desktop: no horizontal overflow; hierarchy readable.  
4. No wildlife, edibility, shed-presence, or hotspot claims.  
5. Quiet days stay visually calm.

**Primary files when approved:** `wds-dashboard-rebuild-ambient.js` (new), rebuild shell + CSS, `home-boot.js` (no new network), `automation/test-dashboard-ambient-shell.mjs` (new).

---

## Owner decisions needed before Phase 1 code

1. Confirm Ambient is a **Dashboard mode**, not a new app.  
2. Confirm **do not charge** until Ambient Mode is a real extra.  
3. Confirm $4.99 / $39.99 / trial / founding price as **intent** (still not live).  
4. Confirm radio remains **DEFER** (Phase 6).  
5. Confirm ForageCast/Sheds stay **factors + deep links**, not new Studio products.

---

*End of Phase 0. No production code was changed for Ambient in this pass.*
