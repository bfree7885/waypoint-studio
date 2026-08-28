# Waypoint Color System — Dark desert at dusk

**Authoritative tokens:** `design-system/css/wds-tokens.css`  
**API:** `--waypoint-*` (locked brand) → `--wp-*` (semantics) → `--wds-*` / `--ws-*` (compat)

**Feel:** Southwestern field technology at dusk. Dark earth + desert light + field intelligence.

**Not:** a purple website, a yellow website, a green outdoor brand, tactical/military chrome, generic SaaS, or a luxury lifestyle brand.

## Hierarchy (more important than any single hex)

**dark earth → sand/cream → burnt orange → ochre → restrained desert purple**

Most of an interface is warm charcoal, espresso, sand, and tan. Accent color is deliberate and sparse.

| Role | Token | Target | Notes |
|------|-------|--------|-------|
| Main background | `--waypoint-charcoal` / `--wp-bg` | `#181513` | Warm near-black |
| Raised surface | `--waypoint-espresso` / `--wp-elevated` | `#251C20` | Dark espresso / plum-brown |
| Primary text | `--waypoint-bone` / `--wp-text` | `#F0E1C3` | Warm ivory |
| Secondary text | `--waypoint-tan` / `--wp-text-secondary` | `#BFA98C` | Muted desert tan |
| **Primary accent** | `--wp-brand` / `--waypoint-orange` | `#D46A3A` | Burnt orange / terracotta |
| Secondary accent | `--wp-accent-gold` | `#D7A72E` | Golden ochre |
| Tertiary | `--wp-accent-purple` | `#79506F` | Muted desert purple |
| Field / natural | `--wp-accent-field` | `#73806A` | Muted sage |

`--waypoint-aubergine-*` names remain as **compatibility aliases** for the earth stack. Do not treat aubergine as the visual identity.

## Semantic roles

| Role | Token |
|------|--------|
| Page / panels / raised | `--wp-bg` / `--wp-surface` / `--wp-elevated` (`--wp-surface-raised`) |
| Waypoint signature | `--wp-brand` — terracotta, **does not change per product** |
| Product accent | `--wp-accent` — pairing only (terracotta, ochre, or sage) |
| Supporting | `--wp-accent-gold` / `--wp-accent-purple` / `--wp-accent-field` |
| Secondary emphasis | `--wp-warm` (usually ochre; Deck may use desert purple) |
| Focus | `--wp-focus` → ochre |
| Status | `--wp-success` / `--wp-warning` / `--wp-danger` / `--wp-info` — always labeled |

The Waypoint Studio square (`.was-brand__mark`) uses `--wp-brand`. It represents Waypoint, not the current page.

## Product personalities

Stay inside this family. Pairing only — do not invent a second palette.

| Product | Emphasis |
|---------|----------|
| Global / Home | Terracotta |
| Dashboard | Terracotta + ochre |
| Scenes | Ochre + terracotta (desert light, not yellow chrome) |
| Sheds | Terracotta + restrained sage |
| Waypoint Deck (public shell) | Terracotta + desert purple |
| Articles / Deep Forest Dispatch | Cream type + terracotta + ochre |

Instrument **data** hues (precip, AQI, alerts, map layers) stay meaningful. Brand color and data color are different systems.

## Contrast (locked targets on `#181513`)

| Pair | Ratio | Gate |
|------|-------|------|
| Bone `#F0E1C3` on charcoal | ~14:1 | AA body |
| Tan `#BFA98C` on charcoal | ~8:1 | AA body |
| Terracotta `#D46A3A` on charcoal | ~5.1:1 | AA small text / nav |
| Charcoal on terracotta (buttons) | ~5.1:1 | AA — `--wp-on-accent` must stay dark |
| Cream on terracotta | ~2.8:1 | **Fail** — never cream type on orange fills |
| Desert purple `#79506F` on charcoal | ~2.8:1 | **Fail as text** — borders / atmosphere only |
| Sage `#73806A` on charcoal | ~4.4:1 | AA-large only |

## Natural data exception

Blue / green / red / cyan remain allowed for hydrology, vegetation, alerts, and scientific layers. They must not become general nav, button, or card chrome.

## Cleanup scope (this pass)

- Shifted ground from purple aubergine to charcoal / espresso
- Terracotta is the primary Waypoint signature; purple is tertiary
- Brand mark locked to `--wp-brand`
- Explore: raised espresso + terracotta border (not a purple or giant orange fill)
- Publishing / DFD accents: purple → terracotta + ochre
- Borders: tan fog instead of purple fog
- Product glow / body atmosphere: restrained terracotta + ochre, faint plum only
