# Waypoint Studio — Product Strategy

**Session type:** Leadership / product strategy (not implementation)  
**Repo reality:** This monorepo hosts **Waypoint Scenes** (runnable) + **WDS/WEF** (shared). Other products exist as design tokens, docs, and scaffolds.

---

## Executive summary

The ecosystem has a strong **shared foundation** (design system + education framework) but only **one shipping app**. The highest-leverage work is: (1) launch Scenes v0.1.0, (2) spawn other products from `product-shell.html`, (3) stop duplicating CSS/JS in Scenes. Do not build AI depth, video export, or platform auth until Scenes and one vertical (ForageCast or Steepleaf) prove the template.

---

## Per-project assessment

### 1. Waypoint Studio (platform)

| | |
|---|---|
| **Maturity** | 40% — brand, WDS, WEF, roadmap; no hub site |
| **MVP** | Landing page listing 8 products + link to reference gallery + docs |
| **Biggest weakness** | No single entry point; shared code lives inside Scenes repo |
| **Biggest opportunity** | Become the “App Store shelf” for nature tools — one visual language |
| **Build next** | `waypoint.studio` static hub, extract `design-system/` as copy/submodule standard |
| **Do NOT build yet** | Accounts, billing, analytics, app store |
| **Education** | Host WEF docs; link each product’s Learn tab |
| **Design system** | **Is** the platform — WDS is the product |
| **Components** | All shared modules live here |
| **Hours to MVP** | **24h** |

---

### 2. Waypoint Scenes

| | |
|---|---|
| **Maturity** | **78%** — 5 studios work; export; placeholder portfolio |
| **MVP** | Upload → Living Scene / Parallax → Collections → Field Guide → PNG export |
| **Biggest weakness** | Triple CSS stack; SVG placeholders; 5-tab mobile cram |
| **Biggest opportunity** | First proof of “Bring Nature to Life” — emotional differentiation |
| **Build next** | Real images, mobile tabs, WDS.tabs adoption (done), CSS consolidation |
| **Do NOT build yet** | Video export, AI masks, scene intelligence |
| **Education** | Field Guide via WEF legacy adapter; migrate to canonical 11-section lessons |
| **Design system** | Partial — loads WDS; still uses `main.css` + `studio-shell.css` overlap |
| **Components** | Gallery custom in `photography.js` — should adopt `WDS.gallery` |
| **Hours to MVP** | **40h** |

---

### 3. ForageCast

| | |
|---|---|
| **Maturity** | 10% — tokens, domains, voice in docs only |
| **MVP** | Season view + 10 species (WEF + `WDS.species`) + map chrome + Learn |
| **Biggest weakness** | No codebase |
| **Biggest opportunity** | Highest cross-product demand (species + season + ecology) |
| **Build next** | `product-shell.html` + `foragecast-curriculum.js` skeleton + species list |
| **Do NOT build yet** | ML ID, push alerts, social |
| **Education** | Primary surface — species, ecology, weather, conservation domains |
| **Design system** | `data-product="foragecast"` amber accent |
| **Components** | species, gallery, map, search, nav, Learn shell |
| **Hours to MVP** | **80h** |

---

### 4. Shed Hunting

| | |
|---|---|
| **Maturity** | 8% |
| **MVP** | Find log (date, place, photo) + map + gallery + 5 wildlife/geology lessons |
| **Biggest weakness** | No codebase; niche audience |
| **Biggest opportunity** | Loyal community; simple data model |
| **Build next** | Shell + journal form + gallery |
| **Do NOT build yet** | Leaderboards, gear shop |
| **Education** | wildlife, geology, field-skills |
| **Design system** | antler tan accent |
| **Components** | gallery, map, forms, upload, Learn |
| **Hours to MVP** | **72h** |

---

### 5. Fieldry

| | |
|---|---|
| **Maturity** | 8% |
| **MVP** | Field notes + gear list + export + navigation/tea learn track |
| **Biggest weakness** | No codebase |
| **Biggest opportunity** | Journal + export reuse from Scenes |
| **Build next** | Shell + note form + export panel |
| **Do NOT build yet** | Cloud sync, collaboration |
| **Education** | field-skills, navigation, tea |
| **Design system** | field gold accent |
| **Components** | forms, export, nav, Learn |
| **Hours to MVP** | **64h** |

---

### 6. Steepleaf

| | |
|---|---|
| **Maturity** | 8% |
| **MVP** | Species browser (20) + habitat filters + search + learn tracks |
| **Biggest weakness** | No codebase |
| **Biggest opportunity** | Reuses species + gallery + WEF almost entirely |
| **Build next** | Shell + `WDS.species` list + filter chips |
| **Do NOT build yet** | AI identification |
| **Education** | species, habitats, ecology, tea — core value |
| **Design system** | leaf green accent |
| **Components** | species, gallery, search, Learn |
| **Hours to MVP** | **68h** |

---

### 7. Savant Sommelier

| | |
|---|---|
| **Maturity** | 6% |
| **MVP** | Wine profile cards + tasting notes + 5 wine/ecology lessons |
| **Biggest weakness** | No codebase; farthest from “nature outdoors” cluster |
| **Biggest opportunity** | `WDS.species` maps to wine profiles; premium audience |
| **Build next** | Shell + profile card template |
| **Do NOT build yet** | Cellar AI, pairing engine |
| **Education** | wine, ecology, conservation |
| **Design system** | wine rose accent |
| **Components** | species (wine), cards, Learn |
| **Hours to MVP** | **72h** |

---

### 8. SignalTerrain

| | |
|---|---|
| **Maturity** | 6% |
| **MVP** | Map + coords + geology/weather/navigation learn |
| **Biggest weakness** | No map engine integrated |
| **Biggest opportunity** | Map chrome already in WDS |
| **Build next** | Shell + map placeholder + mono coords |
| **Do NOT build yet** | Live telemetry, SAR |
| **Education** | navigation, geology, astronomy, weather |
| **Design system** | slate blue accent |
| **Components** | map, nav, Learn |
| **Hours to MVP** | **88h** (map integration) |

---

### 9. Terrainbound

| | |
|---|---|
| **Maturity** | 6% |
| **MVP** | Route log + terrain gallery + conservation learn |
| **Biggest weakness** | No codebase; overlaps SignalTerrain |
| **Biggest opportunity** | Endurance narrative; gallery + map reuse |
| **Build next** | Shell shared with SignalTerrain map module |
| **Do NOT build yet** | Wearables, race timing |
| **Education** | navigation, conservation, wildlife |
| **Design system** | stone gray accent |
| **Components** | gallery, map, Learn |
| **Hours to MVP** | **80h** |

---

## Shared improvements implemented (this session)

| Module | Path | Products helped |
|--------|------|-----------------|
| Icons | `wds-icons.js` | All |
| Gallery | `wds-gallery.js` + `wds-patterns.css` | Scenes, Steepleaf, Shed, Terrainbound |
| Species | `wds-species.js` | ForageCast, Steepleaf, Sommelier |
| Navigation | `wds-nav.js` + `product-shell.html` | All |
| Tabs delegation | `tabs.js` → `WDS.tabs` | All tabbed apps |
| Utils delegation | motion + file-upload → `WDS.core` | All upload apps |
| Roadmap | `design-system/ROADMAP.md` | Leadership |

---

## 5% rule — next increment per project

| Project | +5% action |
|---------|------------|
| Waypoint Studio | Publish ROADMAP + link from README |
| Scenes | WDS.tabs wired; next: 3 real photos |
| ForageCast | Copy product-shell, set `data-product="foragecast"` |
| Shed Hunting | Empty curriculum JS with 1 lesson scaffold |
| Fieldry | product-shell + export panel stub |
| Steepleaf | species page demo using `WDS.species.renderPage` |
| Savant Sommelier | wine profile JSON schema |
| SignalTerrain | map chrome page in reference gallery |
| Terrainbound | shared map stub with SignalTerrain |

---

See also: [design-system/ROADMAP.md](../design-system/ROADMAP.md)
