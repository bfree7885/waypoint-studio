# 01 — Product Vision

**Waypoint Studio 2026 Rebuild**  
**Status:** Architecture baseline — awaiting owner approval  
**Authority:** Binding for product identity after approval. Supersedes Outdoor OS Manifesto/Screen Spec/Reset and Recovery/V2/V3 Dashboard presentation docs.

---

## One sentence

Waypoint Studio is three calm, trustworthy outdoor products — **Dashboard**, **Scenes**, and **Sheds** — each with a distinct soul, sharing a design system and observation ethics, never merged into one “Outdoor OS.”

---

## Mission (company)

**Observe. Discover. Understand.**  
Technology deepens curiosity; it does not replace it.

Product Standards (`docs/PRODUCT_STANDARDS.md`) remain the feel and trust contract: calm, honest, privacy-first, observational education (not homework), no fabricated data.

---

## The three products

| Product | Soul in one line | Primary user job |
|---------|------------------|------------------|
| **Dashboard** | Customizable outdoor workspace — information first | Assemble *my* view of today outside; glance a Today Outside summary; go deeper when I choose |
| **Scenes** | Photography craft and learning | Analyze photos, review shoots, grow as a photographer |
| **Sheds** | Field wildlife companion | Map habitat, read conditions, log honest observations |

These are **peer products**, not modules of a single operating system. Cross-links are allowed; shared chrome and data standards are allowed; **merged IA and merged voice are not**.

---

## Historical eras (do not revive as canonical)

Agents must know this history so they stop “correctly” rebuilding the wrong product.

### Era A — Recovery / V2 / V3 (widgets + tabs)

Dashboard grew as a recovery surface and instrument board: category widgets, customize layout, V2/V3 shells, kiosk hooks. Useful infrastructure patterns (providers, prefs, progressive hydrate) exist in the tree; **presentation and product law from that era are retired as canonical vision**.

### Era B — Outdoor OS (briefing, anti-widget)

July 2026 locked Manifesto + Screen Spec + Outdoor OS Reset: one composition briefing (Happening → Matters → Do/Best window), zero widget walls. That line shipped through M1–M3. **It is newer than Recovery — and still not the owner’s chosen destination.** Do not re-implement Outdoor OS because documents or production currently show it.

### Era C — Waypoint Studio 2026 Rebuild (this folder)

Owner decision: customizable Dashboard with modular widgets + Today Outside summary + observational language; Scenes and Sheds as separate flagships; Outdoor OS and Recovery eras archived under `docs/archive/pre-rebuild-2026/`.

**Do not merge Era B philosophy into Era C widgets.** Judgment-first briefing is not the Dashboard model. Widgets + configurable workspace + a clear Today Outside summary + observational (not homework) language is the model.

---

## What each product is not

### Dashboard is not

- An Outdoor Operating System or morning “covenant briefing” that forbids instruments
- A weather media site, storm theater, or engagement farm
- Scenes (no photo coaching as primary job)
- Sheds (no shed map as primary job)
- A status console for operators

### Scenes is not

- A conditions dashboard with a camera bolted on
- Social photography, streaks, or grades-as-product
- Sheds field mapping

### Sheds is not

- A photography suite
- A generic weather app
- A prediction black box that hides uncertainty
- A social hunt network (privacy-first field tool)

---

## Shared platform (not a fourth product)

These support the three products without becoming peers in primary navigation:

| Layer | Role |
|-------|------|
| **Studio Home** | Brand entry; launch the three products honestly |
| **Design system (WDS)** | Shared tokens, shell, a11y, trust patterns |
| **Outdoor Intelligence / providers** | Conditions, light, air, water — consumed by Dashboard (and optionally Sheds) |
| **Waypoint Observation Standard** | Shared observation shape where products log field notes |
| **Articles / education content** | Supporting learning; not a fourth primary product in this rebuild |
| **Settings / places / contact / privacy** | Shared account-less prefs and trust surfaces |

Incubator apps (SignalTerrain, Steepleaf, Savant, Volunteer, ForageCast, Fieldry, etc.) may remain reachable and honest about maturity, but **they are not primary products** of the 2026 Rebuild portfolio. Primary nav and rebuild architecture center on Dashboard, Scenes, Sheds only.

---

## Feel and language (all three)

- Calm, trustworthy, welcoming, curious — never urgency or scarcity hacks
- **Observational** language: describe what is true and uncertain; do not assign homework (“you should,” quiz energy, grades)
- Facts vs estimates vs placeholders must be visible
- Honest loading and honest empty; never invent a hometown or fill the screen with fake richness
- Accessibility and responsive layouts by default; progressive enhancement

Dashboard-specific: information-first and user-configurable.  
Scenes-specific: coaching without ranking people.  
Sheds-specific: map-first field honesty and ethical outdoor practice.

---

## Success for the rebuild (product level)

1. An agent reading only `docs/rebuild-2026/` can implement Dashboard, Scenes, and Sheds without consulting Outdoor OS or Recovery vision docs.
2. Dashboard feels like *my workspace* with a clear Today Outside summary — not a locked briefing and not a chaotic widget dump.
3. Scenes deepens photographic seeing; Sheds deepens field wildlife practice; neither steals the other’s job.
4. Performance: first useful paint is extremely fast; kiosk mode is a first-class Dashboard capability.
5. Trust remains the product.

---

## Approval gate

Until the owner marks this folder approved:

- Treat as **proposed architecture**, not a license to delete production Outdoor OS code
- Do not commit/push/merge/deploy from this docs work alone
- Implementation of the rebuild starts only on explicit owner authorization
