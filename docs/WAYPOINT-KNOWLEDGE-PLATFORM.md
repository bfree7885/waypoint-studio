# Waypoint Knowledge Platform (WKP)

**Status:** Foundation  
**Schema:** `https://waypoint.studio/schemas/knowledge/v1`  
**Runtime:** `WDS.knowledge` · `WDS.knowledgeSearch` · `WDS.knowledgeRelationships`

This is the structured knowledge backbone for Waypoint Studio.

It is **not** an AI chatbot.  
It is **not** a marketplace.  
Applications **query** this platform instead of copying reference data.

---

## Architecture

```
Apps (Fieldry, ForageCast, Sheds, Steepleaf, Savant, SignalTerrain, OI, Scenes)
        │
        ▼
WDS.knowledge  ── search ── relationships
        │
        ├─ knowledge/index.json          (catalog)
        ├─ knowledge/domains.json        (domain registry)
        ├─ knowledge/relationships.json  (typed graph)
        ├─ knowledge/samples|records     (entry bodies)
        └─ WSKB (species detail when wskbId is set)
```

### Core entry fields

id · kind · domains · categories · names (common, scientific, aliases) · description · taxonomy · geography · seasonal · media · references · citations · tags · search metadata · related · versioning via `meta` · `extensions[<domain>]` · optional `wskbId`

Domain packs add fields under `extensions` **without** changing the core schema.

---

## Domains

| Domain | Typical categories |
|--------|--------------------|
| fieldry | plants, trees, mammals, birds, reptiles, amphibians, fish, insects, butterflies, dragonflies, mushrooms, lichens, rocks, minerals, clouds, weather |
| foragecast | edible/medicinal plants, mushrooms, berries, nuts, habitats, phenology |
| sheds | cervids, antler biology, habitats, sign, regulations |
| steepleaf | tea varieties, cultivars, regions, processing, flavor, brewing |
| savant-sommelier | grapes, regions, soils, geology, climate, rootstocks, wineries, styles |
| signalterrain | radio services, bands, modulation, agencies, equipment, terminology |
| signal-intelligence | planned RF/cyber framing categories (no fabricated threat packs) |
| landscape-interpretation | planned succession / geology / historic land-use categories |
| outdoor-intelligence | weather, AQI, UV, astronomy, photography terms |
| scenes | photography / light concepts (shared with OI) |
| shared | cross-cutting ecology / habitat concepts |

---

## Runtime API

```js
WDS.knowledge.configure({ base: "../../design-system/knowledge/" });
await WDS.knowledge.preloadDemo();
const entry = await WDS.knowledge.get("kn_chanterelle");
const hits = await WDS.knowledge.search("oak", { domain: "sheds" });
const graph = await WDS.knowledge.related("kn_white-oak");
const chain = await WDS.knowledge.path("kn_white-oak", "kn_deer-shed-cycle");
```

Search supports text, taxonomy/scientific/common/aliases, tags, categories, kind, domain, and light geographic filters (`region`, `country`).

---

## Relationships

Typed edges in `relationships.json`, for example:

`White oak → produces → Acorn → feeds → White-tailed deer → associated-with → Antler shed cycle`

`Chanterelle → appears-after → Post-rainfall fruiting` (ForageCast phenology signal)

---

## How to add a new knowledge domain

1. Register the domain in `knowledge/domains.json` (id, label, categories).
2. Add the domain id to the schema enum in `schema-v1.json` if it is new.
3. Create entries with `domains: ["your-domain"]` and optional `extensions.your-domain`.
4. Add relationship edges if concepts connect to existing entries.
5. Point the app at `WDS.knowledge.search({ domain: "your-domain" })`.
6. Do **not** fork a parallel knowledge store inside the app.

### Species rule

If a species already exists in WSKB, create a knowledge entry with `wskbId` and keep the long-form education body in WSKB. Do not duplicate the species essay.

---

## Sample data honesty

`samples/demo-bundle.json` contains **representative sample records** to prove the architecture. It is not a complete production encyclopedia. Provenance is labeled `sample` or `educational`.

---

## Files

| Path | Role |
|------|------|
| `design-system/knowledge/schema-v1.json` | Entry schema |
| `design-system/knowledge/domains.json` | Domain registry |
| `design-system/knowledge/index.json` | Master catalog |
| `design-system/knowledge/relationships.json` | Graph |
| `design-system/knowledge/samples/demo-bundle.json` | Demo records |
| `design-system/js/knowledge/*.js` | Runtime |
| `docs/WAYPOINT-KNOWLEDGE-PLATFORM.md` | This document |

---

## See also

- [UNIFIED-PLATFORM.md](UNIFIED-PLATFORM.md)
- [WAYPOINT-OBSERVATION-STANDARD.md](WAYPOINT-OBSERVATION-STANDARD.md)
- Species KB: `design-system/species/README.md`
