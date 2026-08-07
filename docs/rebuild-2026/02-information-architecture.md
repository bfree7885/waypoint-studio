# 02 — Information Architecture

**Status:** Architecture baseline — awaiting owner approval  
**Depends on:** [01-product-vision.md](./01-product-vision.md)

---

## Portfolio map

```
Studio Home (/)
├── Dashboard     — customizable outdoor workspace
├── Scenes        — photography education & craft
└── Sheds         — wildlife, map, conditions, observations

Shared (not primary products)
├── Settings / Places
├── Contact / Support / About / Privacy
├── Design system + App Shell
├── Optional supporting content (Articles, incubator apps)
└── Side Trails (/side-trails/) — sister experiments (e.g. SignalTerrain)
```

Primary navigation exposes **exactly three products**. Everything else is secondary, footer, launcher depth, incubator, or Side Trails.

---

## Product boundaries

| Concern | Owns it | May consume | Must not own |
|---------|---------|-------------|--------------|
| Widget workspace & Today Outside | Dashboard | OIP/providers, place prefs | Shoot review, shed map as home |
| Photo analysis, shoot review, learning | Scenes | Local library, EXIF, light context from providers | Habitat heat maps as primary |
| Map, wildlife field workflow, observations | Sheds | Conditions overlays, WOS | Photo Coach as primary |
| Tokens, shell, a11y, trust chips | WDS | — | Product-specific IA |
| Observation schema | WOS | Sheds (primary writer); others optional | Product-specific UI |

**Cross-links are invitations, not IA merges.** Example: Dashboard may link “Review today’s shoot” → Scenes; Sheds may show a conditions chip that deep-links to a Dashboard widget detail. The destination keeps its own chrome and soul.

---

## Surfaces by product

### Dashboard

| Surface | Purpose |
|---------|---------|
| **Workspace (home)** | User-configured widget grid + Today Outside summary region |
| **Customize** | Add/remove/reorder/resize widgets; layout presets; reset |
| **Widget detail** | Deeper panel/sheet for one instrument or story (not a second product) |
| **Today Outside** | Compact observational summary of the day near the user’s place |
| **Kiosk** | Full-screen, low-chrome, auto-refresh workspace for wall/display |
| **Place / location** | Transparent place selection; privacy-respecting permission flows |
| **Sources / trust** | Provider honesty (live / cached / partial / offline) without becoming the product |
| **Contact (optional)** | Help/contact without polluting the workspace |

### Scenes

| Surface | Purpose |
|---------|---------|
| **Scenes home** | Product landing: craft modules with honest maturity labels |
| **Photo Coach / Shoot Review** | Analyze photos; review a session; private Keep/Maybe/Reject labels |
| **Photo Library** | Local catalog; handoff into Coach / other modules |
| **Hidden Landscapes** | Creative / spectral literacy (experimental honesty) |
| **Photographer Profile** | Private lifelong companion from evidence — no social ranking |
| **Future modules** | Living Scenes, Scene Builder — preview until real |

### Sheds

| Surface | Purpose |
|---------|---------|
| **Map (primary)** | Full-viewport field map — the product |
| **Field briefing / Today’s Search** | Observational sheet over the map (not a Dashboard clone) |
| **Layers / models** | Habitat, heat, basemap controls — user toggles |
| **Observations** | Fast private field notes (WOS-shaped) |
| **GPS / locate / track** | Reliable field positioning with honest denial/timeout |
| **Education / ethics** | Seasonal learning and outdoor ethics — secondary to map |

---

## Today Outside (Dashboard) vs field briefing (Sheds)

Both may describe “what’s going on outside.” They are **not the same surface**:

| | Today Outside (Dashboard) | Field briefing (Sheds) |
|--|---------------------------|-------------------------|
| Job | Orient the configurable workspace; glanceable day summary | Support *this search on this map* |
| Placement | Fixed summary region on Dashboard home | Bottom sheet / HUD over map |
| Depth | Links into widgets the user chose | Links into layers, notes, locate |
| Voice | Observational, information-first | Observational, field-first |

Do not port Outdoor OS “Happening → Matters → Do” as the Sheds or Dashboard governing structure.

---

## Shared concepts (thin, deliberate)

1. **Place** — user-selected or permission-based location; shared settings where practical.
2. **Trust state** — Live / Cached / Partial / Offline / Unavailable — same vocabulary.
3. **Observation** — WOS record when logging wildlife/field notes (Sheds primary).
4. **App Shell** — global brand + product switcher; local nav per product.
5. **Maturity labels** — Available / Early / Experimental / Preview — honest.

No shared “Outdoor OS compose pipeline” as product law. Providers and engines may be shared code; **presentation contracts stay product-local**.

---

## Content hierarchy rules

1. **One job per surface** — workspace ≠ customize ≠ detail ≠ kiosk.
2. **Information before interpretation** — show the fact; offer calm context; do not bury instruments behind a mandatory judgment narrative.
3. **User configuration is first-class on Dashboard** — empty customizable space is a valid starting point with sensible defaults, not a failure.
4. **Map is first-class on Sheds** — chrome serves the map.
5. **Craft tools are first-class on Scenes** — landings introduce; tools do the work.
6. **No fourth primary product** in rebuild IA without an explicit owner amendment to this folder.

---

## Anti-patterns (IA)

- Reviving Outdoor OS as the Dashboard home “because production has it”
- Putting Scenes modules as Dashboard widgets that become full Photo Coach
- Making Sheds map a Dashboard tab
- Primary nav listing Volunteer / Incubator as peers to the three products
- “One composition only” rules that forbid a widget workspace
- Homework, streaks, or engagement farming anywhere in primary flows
