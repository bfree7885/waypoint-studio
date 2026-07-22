# Dashboard reconciliation — Owner Review

**Date:** 2026-07-22  
**Status:** Documentation only — no product code changed in this block  
**Purpose:** Explain why the shipped Dashboard (Outdoor OS briefing) does not match the vision the owner now frames as approved: *customizable dashboard, widgets, Today Outside summary, information first, observational*.  
**Authority for this doc:** Historical honesty over narrative comfort.

---

## Executive verdict

Agents did **not** accidentally invent Outdoor OS. They implemented the documents that were marked permanent / locked / binding in July 2026:

1. `docs/DASHBOARD-PRODUCT-MANIFESTO.md` (soul — wins conflicts)  
2. `docs/DASHBOARD-SCREEN-SPECIFICATION.md` (exact screen)  
3. `docs/OUTDOOR-OS-DASHBOARD-RESET.md` (architecture — anti-widget)

Those three documents **explicitly reject** the earlier customizable-widget product. Owner milestone reviews (M1 → M1.5 → M2 → M3) then **reinforced** that briefing paradigm with concrete decisions (quiet chrome, Happening/Matters/Do ranking, polish, production hard-short-circuit away from Recovery/V2/V3).

The mismatch the owner feels now is a **product-direction conflict between eras**, not a failed build of the Manifesto era:

| Era | Approx. commits / docs | Product model |
|-----|------------------------|---------------|
| **A — Widget / customize** | `5074b81` … Recovery + V2/V3; `DASHBOARD_PLAYBOOK.md`, `DASHBOARD-WIDGETS-UX-REVIEW.md`, `docs/dashboard-v2/*`, V3 customize | Customizable instrument panel + briefing layered on tabs/widgets |
| **B — Outdoor OS** | Reset 2026-07-21 → M1–M3 2026-07-22; Manifesto + Screen Spec | One composition: Happening → Matters → Do/Best window; zero widget walls |

What shipped (production + local product path) is **Era B**. What the owner now describes as the approved vision is closer to **Era A** (especially V2 “Today Outside” + customize), optionally with more observational tone.

Recent “Best window” language fixes (local dirty tree) only soften Era B copy. They do **not** restore widgets or a customizable grid.

---

## 1. Which specification(s) were actually implemented

### Primary (binding for M1–M3)

| Document | Role agents treated as | What was built from it |
|----------|------------------------|-------------------------|
| `docs/DASHBOARD-PRODUCT-MANIFESTO.md` | Permanent product soul; conflict winner | One-job briefing; anti–widget-wall; “what is happening / what matters / what should I do”; Outdoor Operating System framing |
| `docs/DASHBOARD-SCREEN-SPECIFICATION.md` | LOCKED screen blueprint | Outside stack: Alert → chrome → Place·time → Happening → What matters → Do/Best window → Day arc → Sources; zero cards/gauges/peer tabs |
| `docs/OUTDOOR-OS-DASHBOARD-RESET.md` | Architecture reset (2026-07-21) | Delete Recovery tabs + widget grid from product IA; preserve OIP/V2 *engines*; new `dashboard/os/*` presentation |

`docs/ENGINEERING-PLAYBOOK.md` points agents at exactly that stack (“Dashboard product soul… Screen Spec… Outdoor OS owner review”).

### Secondary (implementation guides, not rival souls)

| Document / artifact | How it was used |
|---------------------|-----------------|
| Milestone owner reviews (`docs/DASHBOARD-OS-OWNER-REVIEW.md`, `docs/dashboard-os-m1.5-review/`, `m2-review/`, `m3-review/`, `m3-publish/`, `m3-reconcile/`) | Closeout checklists and owner decisions that **narrowed** Outdoor OS behavior |
| `docs/dashboard-owner-fixes/` | Post-M3 observational copy + Contact shell (local, uncommitted at reconciliation time) |
| V2 model/briefing/activity/timeline/trust modules | **Preserved as intelligence inputs** to OS compose/interpret — not as product chrome |

### Explicitly *not* the implementation target for `/apps/dashboard/` after the reset

- Widget-catalog home (`wds-dashboard-catalog.js` + engine grid)  
- Recovery tab IA  
- V2/V3 “Customize widgets” presentation as the Outside page  
- Playbook line that Dashboard is “legitimately multi-widget after briefing”

---

## 2. Which documents were ignored (relative to the owner’s *current* framing)

If “approved” means **customizable + widgets + Today Outside summary + information-first**, then the following Era A documents were **set aside by design** when Era B docs became authority:

| Document | What it advocated | Status after Outdoor OS reset |
|----------|-------------------|-------------------------------|
| `docs/DASHBOARD_PLAYBOOK.md` | Intelligence surface; **“legitimately multi-widget after briefing”**; Customize improves clarity | Superseded for product IA; still on disk |
| `docs/DASHBOARD-WIDGETS-UX-REVIEW.md` | Persona review of **customizable outdoor dashboard** / widget presets | Historical; not used as M1–M3 build input |
| `docs/dashboard-v2/PRODUCT-SPEC.md` | “Today Outside” multi-section briefing **plus** overview panels + Recovery tabs | Engines reused; **presentation discarded** for Outside |
| `docs/dashboard-v2/*` (ARCHITECTURE, BRIEFING-ENGINE, IMPLEMENTATION-*) | V2 modular shell / widgets | Partial reuse (model); UI not product |
| `docs/DASHBOARD-V2.md`, `DASHBOARD-V2-IMPLEMENTATION.md`, `DASHBOARD-V3-UX-REVIEW.md` | V2/V3 widget board evolution | Not Screen Spec authority |
| `docs/DASHBOARD-RECOVERY-*.md`, `DASHBOARD-REMAINING-DEBT-*`, speed audits | Recovery tabs + widget performance as success frame | Reset called this a failed metrics frame |
| Early “complete customizable outdoor dashboard” git history (`1f97e4f`, `5074b81`, specialty `*-dashboard-ui.js` mounts) | Widget product | Quarantined behind OS short-circuit |

**Also “ignored” in the reverse sense:** after Manifesto/Screen Spec locked Era B, agents correctly **did not** keep building toward Era A — even where older owner language (“Today Outside”, customize) still lived in code comments and V2/V3 modules.

**Not ignored (and this is the conflict):** Manifesto § Non-goals permanently bans “A customizable widget operating system.” Screen Spec Absolute Rules ban widget walls and customize-your-layout. Reset §3 deletes widget-grid home and Recovery tabs from product experience. Those were treated as owner-approved direction.

---

## 3. Which design decisions differ from the owner’s current direction

Owner’s current framing vs what Screen Spec / Manifesto / shipped OS encode:

| Dimension | Owner framing now | What was specified & shipped |
|-----------|-------------------|------------------------------|
| Primary metaphor | Customizable **dashboard** | Morning **briefing** / Outdoor OS |
| Layout unit | **Widgets** user can arrange | Prose regions (Happening / Matters / Best window); **zero** widget walls |
| Summary | **Today Outside** summary (V2-era name/shape) | Same mission question, but **Happening + Matters + Do** triad — not V2 multi-article briefing + gauge strip |
| Information posture | Information first, observational | Judgment first (“what matters”, “what to do”); Manifesto: instruments are secondary |
| Action language | Observational possibility | Spec originally labeled **“Do this”** with imperative posture; M2 ranked actions; owner-fixes later rename to **Best window** + softer generators (still triad slot) |
| Personalization | Customize layout / widget set | Prefs for activities/comfort only — **not** widget layout editor |
| Depth | Domain widgets / tabs | Detail **sheets** opened from briefing |

Owner decisions that **reinforced Era B** (so agents were not freelancing):

- M1 IQ-1…IQ-4: quiet Outside chrome; Location panel; delete obsolete presentation; visual-only alerts (`docs/DASHBOARD-OS-OWNER-REVIEW.md`)  
- M2: PriorityRanker rules for **Do** (walk vs photography, flood watch language, timing bands) — still briefing intelligence  
- M3: craftsmanship on the same Outside composition; publish gate **never fall through** to Recovery/widgets  
- Owner-fixes: Contact in quiet shell; ban “Do this” / homework phrases — **copy inside OS**, not a widget restore

---

## 4. Why implementation became editorial / recommendation-driven / prose-heavy / “Do this” / lifestyle assistant

### Root cause (named)

**The locked product docs redefined success as decision-grade orientation prose, not an instrument panel.** Once that was authority, every milestone optimized the briefing voice and ranking engine — which *feels* like a lifestyle assistant even when facts are honest.

### Causal chain

1. **Manifesto mission sentence**  
   > What is happening outside near me today, what matters most, and **what should I do about it?**  
   The third clause forces a **recommendation slot** on every calm render.

2. **Screen Spec vertical stack**  
   Happening (character prose) → What matters (ranked meaning) → **Do / Best window** (primary action line). Word budgets are prose budgets. Cards/gauges forbidden → meaning must live in sentences.

3. **Architecture Reset anti-widget doctrine**  
   Explicitly: not a list of widgets; not customize-your-grid; delete Recovery tabs and gauge-first viewport. Agents were instructed that layering briefing *on* widgets had already failed.

4. **Intelligence reuse from V2**  
   OS compose/interpret sits on `dashboardV2` model + briefing/activity/timeline engines. Those engines were already interpretive (“Waypoint’s Take”, opportunities, caution). OS concentrated that voice into three hero regions instead of many cards — **more** editorial density per viewport, not less.

5. **M2 owner closeout reinforced action ranking**  
   Calm-day default Do: walk; photography only when “notable”; Flood Watch precautionary copy; practical time bands. That is coach/companion judgment (Manifesto’s ranger metaphor), not a neutral instrument readout.

6. **Wireframes literally labeled “Do this”**  
   Reset wireframes and early Screen Spec used **Do this** with imperative examples (“Walk or easy hike…”). Production (live SHA `45dc889`) still renders the label **“Do this”**. Local dirty owner-fixes rename the label to **Best window** and soften generators — still the same structural slot.

7. **“Observational” arrived late and only as copy**  
   `wds-dashboard-os-copy.js` + interpret bank changes (uncommitted locally) ban homework phrases and prefer “Conditions favor…”. That moves tone toward observational **without** changing the information architecture to widgets or Today Outside summary cards.

### Why it does *not* match “information first / widgets”

Information-first widget dashboards show facts (temp, AQI, river, UV) as peers and let the user assemble meaning. Outdoor OS **pre-assembles** meaning and demotes instruments to detail sheets. That is a deliberate Manifesto tradeoff (“Judgment first”), not a bug relative to Screen Spec.

---

## 5. Inventory — every Dashboard implementation in the repository

Legend: **Active** = participates in normal `/apps/dashboard/` render path today. **Obsolete** = product presentation superseded (may still load). **Should delete?** = recommendation for cleanup *after* an explicit product decision; do not mass-delete until owner chooses Era A vs B.

### A. Product entry / boot

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `apps/dashboard/index.html` | Canonical Outside page; `data-product="dashboard"`; OS CSS + skeleton | Product | **Yes** | No | No |
| `apps/dashboard/js/home-boot.js` | Location bootstrap → `contentEngine` `sections: ["outdoor-dashboard"]`; refresh; debug snapshot | Product | **Yes** | No | No |
| `apps/dashboard/contact.html` | In-product Contact under quiet Outside shell | Local addition (dirty tree); not in live build list at recon time | Local only | No | No (keep if Contact-in-shell stays) |
| `dashboard.html` | Hard redirect → `apps/dashboard/` | Product | Redirect only | No | No |

### B. Outdoor OS (current product presentation)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `design-system/js/dashboard/os/wds-dashboard-os.js` | Product root: mount/bind/prefs | Product | **Yes** | No | No |
| `…/os/wds-dashboard-os-compose.js` | Compose regions from V2 payload + interpret | Product | **Yes** | No | No |
| `…/os/wds-dashboard-os-interpret.js` | M2 PriorityRanker / Happening·Matters·Do | Product | **Yes** | No | No |
| `…/os/wds-dashboard-os-render.js` | Outside HTML + detail sheets | Product | **Yes** | No | No |
| `…/os/wds-dashboard-os-copy.js` | Observational copy bans/labels | Local dirty (+ `wds.js` entry); **not** on live `wds.js` @ `45dc889` | Local | No | No |
| `design-system/css/wds-dashboard-os.css` | OS presentation styles | Product | **Yes** | No | No |

### C. Engine / router (decides who wins)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `design-system/js/dashboard/wds-dashboard-engine.js` | Prefers `dashboardOS`; Outside never falls through to Recovery/grid | Product router | **Yes** | Legacy grid code retained for non-Outside | Keep; strip dead grid later |
| `design-system/js/wds-content-engine.js` | `outdoor-dashboard` section → engine/OS | Product | **Yes** | No | No |
| `design-system/js/wds.js` | Ordered loader; OS after V2/V3/Recovery | Product | **Yes** | Loads obsolete modules | Trim loader after quarantine |

### D. Recovery (tab console)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `design-system/js/dashboard/wds-dashboard-recovery.js` | Stub: `isEnabled → false`; no render | Quarantine stub | No (presentation) | **Yes** | Keep stub or delete after zero refs |
| `design-system/css/wds-dashboard-recovery.css` | Recovery styles | Orphaned for product | No | **Yes** | Yes (after CSS audit) |

### E. V2 (Today Outside / widgets era — engines + presentation)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `v2/wds-dashboard-v2-model.js` | Normalized outdoor model | Shared intel | **Yes** (data) | Presentation obsolete | **Keep** |
| `v2/wds-dashboard-v2-briefing.js` | Briefing rules | Shared intel | Yes (data) | As UI: yes | Keep |
| `v2/wds-dashboard-v2-activity.js` | Activity suitability | Shared intel | Yes (data) | As UI: yes | Keep |
| `v2/wds-dashboard-v2-timeline.js` | Day arc inputs | Shared intel | Yes (data) | As UI: yes | Keep |
| `v2/wds-dashboard-v2-observe.js` | Observe cards logic | Shared / latent | Indirect | As UI: yes | Keep until unused |
| `v2/wds-dashboard-v2-trust.js` | Cache/trust | Shared | Yes | No | Keep |
| `v2/wds-dashboard-v2-prefs.js` | Prefs storage | Shared | Yes | Partial | Keep |
| `v2/wds-dashboard-v2-take.js` | “Waypoint’s Take” | Latent / tests | Not Outside | As product UI: **yes** | Candidate delete after test retarget |
| `v2/wds-dashboard-v2.js` | V2 flag + render entry | Loaded; not Outside | No on Outside | Presentation **yes** | Quarantine / delete presentation |
| `v2/wds-dashboard-v2-render.js` | V2 HTML (header, widgets, trust) | Loaded; M1 once claimed deleted; **restored** for tests/kiosk | No on Outside | **Yes** as product | Keep only if V2 tests/kiosk retained |
| `v2/wds-dashboard-v2-widgets.js` | Widget registry for V2 board | Latent | No on Outside | **Yes** as product | Yes if Era B permanent |
| `v2/wds-dashboard-v2-widget-render.js` | Widget card HTML | Latent | No | **Yes** | Yes if Era B permanent |
| `v2/wds-dashboard-v2-widget-intel.js` | Per-widget intel | Latent | No | Partial | Maybe keep as detail adapters |
| `v2/wds-dashboard-v2-customize.js` | Customize widgets UI | Latent | No | **Yes** | Yes if Era B permanent |
| `v2/wds-dashboard-v2-engine.js` | V2 engine helper | Latent | No | Partial | Audit refs |

### F. V3 (customizable outdoor-intelligence shell)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `v3/wds-dashboard-v3.js` | Flagged V3 board entry | Loaded; **not** Outside | No on Outside | As product: **yes** | **Closest revive target for Era A** — quarantine or revive deliberately |
| `v3/wds-dashboard-v3-shell.js` | Header + “Adjust what you see” | Latent | No | Yes as Outside | Same |
| `v3/wds-dashboard-v3-customize.js` / `library.js` / `layouts.js` / `layout.js` | Widget library & DnD layout | Latent | No | Yes as Outside | Same |
| `v3/wds-dashboard-v3-catalog.js` / `categories.js` / `contract.js` | Catalog contracts | Latent | No | Partial | Same |
| `v3/wds-dashboard-v3-brief.js` / `take.js` | Brief + take chrome | Latent | No | Yes as Outside | Same |
| `v3/wds-dashboard-v3-kiosk.js` | Kiosk mode | Non-product | Kiosk/tests only | N/A | Keep if kiosk stays |

### G. Legacy V1 widget console (engine fallthrough when not Outside)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `wds-dashboard-widgets.js` | Widget definitions helpers | Legacy | Only if OS missing **and** not Outside | **Yes** as product | Eventually |
| `wds-dashboard-catalog.js` | ~74-widget registry | Legacy | Same | **Yes** | Eventually |
| `wds-dashboard-categories.js` | Section taxonomy | Legacy | Same | **Yes** | Eventually |
| `wds-dashboard-widget-data.js` | OIP → widget readers | Adapter | Indirect | No (useful adapters) | Keep patterns |
| `wds-dashboard-settings.js` | Widget visibility prefs | Legacy customize | No on Outside | **Yes** as product | Eventually |
| `wds-dashboard-customize.js` | Customize modal | **Deleted** | — | — | Already gone |

### H. Parallel briefing / editorial modules (pre-OS layering)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `wds-dashboard-today-summary.js` | Early Today summary | Loaded; skipped on Outside | No | **Yes** | Yes after zero refs |
| `wds-dashboard-brief.js` | Brief strip | Same | No | **Yes** | Yes |
| `wds-dashboard-briefing.js` | Briefing | Same | No | **Yes** | Yes |
| `wds-morning-briefing.js` | Morning briefing | Same | No | **Yes** | Yes |
| `wds-dashboard-briefing-package.js` | Package render | Same | No | **Yes** | Yes |
| `wds-dashboard-story.js` / `highlights.js` / `challenge.js` / `learn.js` | Story/homework-adjacent | Same | No | **Yes** | **Yes** (engagement drift) |

### I. Shared reliability / fallback / national

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `wds-dashboard-reliability.js` | Trust classification | Shared | Yes | No | No |
| `wds-educational-fallback.js` | Honest empty/unavailable | Shared | Yes | No | No |
| `wds-us-national-context.js` | National provisional context | Shared | Yes | No | No |
| `wds-integrations-registry.js` | Provider honesty | Shared | Yes | No | No |

### J. Domain specialty UIs (Recovery-era tab bodies)

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `weather/wds-outdoor-weather-ui.js`, `wds-sky-dashboard-ui.js`, `wds-weather-ui.js` | Weather/sky panels | Loaded; not Outside home | No on Outside | As peer tabs: **yes** | Keep as detail/intel sources; drop tab IA |
| `wildlife/wds-wildlife-dashboard-ui.js` (+ intel) | Wildlife panel | Same | No | Tab UI obsolete | Same |
| `water/wds-water-dashboard-ui.js` (+ intel) | Water panel | Same | No | Same | Same |
| `trails/wds-trail-dashboard-ui.js` (+ intel) | Trails panel | Same | No | Same | Same |
| `flora/wds-flora-dashboard-ui.js`, `wds-foraging-dashboard-ui.js` (+ intel) | Flora/forage | Same | No | Same | Same |
| `safety/wds-safety-dashboard-ui.js` (+ intel) | Safety | Same | No | Same | Same |

### K. Related non-product / patterns

| Path | Purpose | Status | Active? | Obsolete? | Should delete? |
|------|---------|--------|---------|-----------|----------------|
| `design-system/patterns/signal-intelligence-dashboard.html` | Pattern demo | Demo | No | N/A | Keep as pattern |
| `design-system/js/wds-dashboard.js` | Older dashboard helper | Legacy | Audit | Likely | Audit refs |
| CSS: `wds-dashboard-home.css`, `wds-dashboard-v2.css`, `css/home-dashboard.css`, per-domain `*-dashboard.css` | Mixed tokens + legacy chrome | Partially used | Tokens yes / chrome mixed | Legacy chrome yes | Trim carefully |

### L. Docs-as-implementations (not code, but shaped agents)

| Path | Role |
|------|------|
| Manifesto / Screen Spec / Outdoor OS Reset | **Implemented** |
| `docs/dashboard-os-*`, `DASHBOARD-OS-*` | Milestone evidence |
| `docs/dashboard-v2/*`, widget/playbook docs | **Ignored for Outside UI** after reset |
| `docs/dashboard-owner-fixes/` | Latest tone/Contact delta (local) |

---

## 6. Exactly which implementation renders `/apps/dashboard/`

```
apps/dashboard/index.html
  data-product="dashboard" · quiet Outside shell · wds-dashboard-os.css
  → design-system/js/wds.js  (loads V2/V3/Recovery stubs/modules, then os/*, then engine)
  → apps/dashboard/js/home-boot.js
       location bootstrap
       contentEngine.init({ sections: ["outdoor-dashboard"] })
  → wds-content-engine.js :: renderOutdoorDashboard
  → WDS.dashboardEngine.renderDashboard / mount
       ★ if WDS.dashboardOS.renderDashboard → Outdoor OS HTML ([data-wdb-os])
       ★ if Outside surface and OS missing → honest unavailable (no Recovery/grid)
       ✗ Recovery / V2 / V3 / widget grid never win on this route
  → WDS.dashboardOS.mount → compose (interpret) → render
```

**Winner:** `design-system/js/dashboard/os/*` via `WDS.dashboardOS`, gated by `wds-dashboard-engine.js`.

Feature flags `waypoint-dashboard-v2` / `waypoint-dashboard-v3` and Recovery cannot restore the old Outside chrome (M3 publish hardening).

---

## 7. Production vs local — same product family, different tips

| | Production (live) | Local workspace (this recon) |
|--|-------------------|------------------------------|
| **Build SHA** | `45dc889c3f52c8eeb53c0bcd41b279dab645a79b` (`data/build-info.json`, Pages) | `HEAD` `bba54244ef3e523ce7dd2e36da1ca6484fa7a255` on `integration/dashboard-os-m3` |
| **Relation** | `origin/main` merge of Outdoor OS M3 (PR #1) | Same OS line + 2 branch commits (publish docs/artifacts); **plus dirty tree** |
| **Presentation** | Outdoor OS | Outdoor OS |
| **“Do this” label** | **Still “Do this”** in live `wds-dashboard-os-render.js` | Dirty tree: **“Best window”** + `wds-dashboard-os-copy.js` |
| **OS copy module** | Not in live `wds.js` module list | Present in local `wds.js` |
| **Contact** | Studio-root Contact behavior (pre–owner-fixes) | `apps/dashboard/contact.html` (uncommitted) |
| **Cache bust** | `wds.js?v=45dc889` | `?v=os-m3-1` locally |

**Conclusion:** Production and local both render **Outdoor OS**, not widgets. They are **not** identical code: production is M3-published Era B with “Do this”; local adds uncommitted observational/Contact fixes **still inside Era B**. Neither matches a customizable widget dashboard.

`dashboard.html` → `apps/dashboard/` on both.

---

## 8. Recommend ONE canonical Dashboard implementation

### Recommendation

**Canonical product presentation:** Outdoor OS — `WDS.dashboardOS` (`design-system/js/dashboard/os/`), entered only through `apps/dashboard/` → `dashboardEngine` → OS short-circuit.

**Canonical intelligence spine (keep):** OIP + location + `v2` model/briefing/activity/timeline/trust (as data, not as page chrome).

### Why this one (engineering truth)

It is what production already serves, what Screen Spec/Manifesto/Reset demanded, and what M1–M3 owner reviews repeatedly closed out against. Dual-canonical (OS + V3 customize) is how the product became incoherent.

### Required owner fork (product truth)

This recommendation assumes Era B remains the approved vision. If the owner instead reaffirms **Era A** (customizable widgets + Today Outside summary + information-first):

1. Treat Manifesto non-goals / Screen Spec Absolute Rules / Outdoor OS Reset as **superseded** in writing (new authority doc).  
2. Revive **V3 shell + customize + catalog** (closest retained Era A implementation) — not a quiet OS copy tweak.  
3. Demote or delete `dashboard/os/*` as product presentation.

Until that written reversal exists, agents should continue treating **Outdoor OS as canonical** and V2/V3/Recovery presentation as non-product ballast.

### Cleanup posture (after the fork is explicit)

- If Era B stays: quarantine/delete V2/V3 **presentation** and legacy briefing/story modules from the Outside loader; keep V2 engines.  
- If Era A returns: quarantine OS presentation; restore customize IA deliberately; rewrite Manifesto/Screen Spec so agents stop “correctly” rebuilding Outdoor OS.

---

## Appendix A — How Outdoor OS replaced Recovery / V2 (git narrative)

1. **Widget era:** Customizable engine + catalog + specialty UIs (`5074b81`, `1f97e4f`, domain `*-dashboard-ui.js`).  
2. **Recovery:** Tab strip Today · Weather · Photo · Rivers · Air · Sun & Moon · Alerts · Settings (`d8a98e0` and related).  
3. **V2:** “Today Outside” briefing + panels on Today tab; flag default on (`docs/dashboard-v2/PRODUCT-SPEC.md`).  
4. **V3:** Modular customize / layouts / library on top of V2 models (`5a251ee` lineage).  
5. **Docs reset (2026-07-21):** `OUTDOOR-OS-DASHBOARD-RESET.md` declares widget/tab UI failed; preserve backend.  
6. **Manifesto + Screen Spec:** Lock Happening / Matters / Do; ban widget walls and customize-as-product.  
7. **M1–M3 (2026-07-22):** Implement `dashboard/os/*`; stub Recovery; engine prefers OS; harden no fallthrough; merge to `origin/main` as `45dc889`.  
8. **Owner-fixes (local):** Rename Do → Best window; observational banks — **still OS**.

---

## Appendix B — Where “approved” diverged

| Moment | What looked like approval | What it approved |
|--------|---------------------------|------------------|
| Widget UX reviews / playbook | Customizable outdoor dashboard | Era A |
| V2 product spec “Today Outside” | Briefing + panels + tabs | Hybrid A |
| Manifesto + Screen Spec + Reset | Permanent / LOCKED / binding | **Era B** |
| M1–M3 owner reviews | IQ decisions, ranking rules, polish, publish | **Era B execution** |
| Owner-fixes Best window | Observational tone | Era B copy, not Era A restore |
| Owner framing *now* | Customizable / widgets / Today Outside / observational | Points back at **Era A** (with softer voice) |

The agents followed the documents that said they win conflicts. The owner’s present dissatisfaction is evidence those documents may no longer match intent — not evidence that M1–M3 missed Screen Spec.

---

## Appendix C — Evidence snapshots used for this recon

- Local: `git rev-parse HEAD` → `bba5424…` · branch `integration/dashboard-os-m3` · dirty OS/Contact/copy tree  
- Live: `https://waypointstudio.org/data/build-info.json` → commit `45dc889…` · deployed 2026-07-22T05:46:37Z  
- Live Outside HTML markers: `wds-dashboard-os.css`, heading “Outdoor briefing”, `wds.js?v=45dc889`  
- Live render still contains `aria-label="Do this"` / label **Do this**  
- Live `wds.js` loads full V2/V3/Recovery/OS set; engine comments + logic prefer OS on Outside  

---

**Stop rule honored:** This folder is documentation only. No product UI redesign, no commits, no deploy.
